const Order = require('../models/Order');
const Product = require('../models/Product');
const AppError = require('../utils/AppError');
const { getProvider } = require('./payments');
const { verifyPaypalCapture } = require('./payments/verifyPaypalCapture');

const REUSABLE = ['CREATED', 'APPROVED', 'PAYER_ACTION_REQUIRED'];

const markFailed = (orderId, reason) =>
  Order.updateOne({ _id: orderId, 'payment.status': { $ne: 'paid' } }, { $set: { 'payment.status': 'failed', 'payment.failureReason': reason } });

async function loadPayableOrder(orderId, user) {
  const order = await Order.findOne({ _id: orderId, user: user._id }); // customers can only pay for their own orders
  if (!order) throw AppError.notFound('Order not found');
  return order;
}

async function createPayment({ orderId, user }) {
  const order = await loadPayableOrder(orderId, user);
  if (order.payment.status === 'paid') throw AppError.conflict('This order has already been paid');
  if (order.status !== 'Pending') throw AppError.conflict(`Orders that are "${order.status}" cannot be paid`);
  const provider = getProvider(order.paymentMethod);
  if (!provider.isConfigured()) throw new AppError('Online payments are not configured on this server (missing PayPal credentials).', 503);

  // Double-click / reload safety: reuse the existing PayPal order while it is still usable.
  const existingId = order.payment.paypalOrderId;
  if (existingId) {
    try {
      const existing = await provider.getOrder(existingId);
      if (REUSABLE.includes(existing.status)) {
        if (order.payment.status === 'failed') { // e.g. a declined card: the buyer is trying again with the same PayPal order
          await Order.updateOne({ _id: order._id, 'payment.status': 'failed' }, { $set: { 'payment.status': 'pending' }, $unset: { 'payment.failureReason': '' } });
        }
        return { paypalOrderId: existingId, approveUrl: existing.approveUrl };
      }
    } catch (e) { /* expired or unknown at PayPal: create a fresh one below */ }
  }

  const created = await provider.createOrder({ orderId: order._id, amount: order.total, currency: order.currency });
  const res = await Order.updateOne(
    { _id: order._id, status: 'Pending', 'payment.status': { $in: ['pending', 'failed'] }, 'payment.paypalOrderId': existingId || null },
    { $set: { 'payment.paypalOrderId': created.id, 'payment.status': 'pending' }, $unset: { 'payment.failureReason': '' } }
  );
  if (!res.modifiedCount) { // a concurrent request won: use whatever it stored
    const fresh = await Order.findById(order._id);
    if (fresh.payment.paypalOrderId) return { paypalOrderId: fresh.payment.paypalOrderId };
    throw AppError.conflict('Order changed while starting payment. Please try again.');
  }
  return { paypalOrderId: created.id, approveUrl: created.approveUrl };
}

async function capturePayment({ orderId, paypalOrderId, user }) {
  const order = await loadPayableOrder(orderId, user);

  if (order.payment.status === 'paid') { // repeat request after success is harmless
    if (order.payment.paypalOrderId === paypalOrderId) return { order, alreadyPaid: true };
    throw AppError.conflict('This order has already been paid');
  }
  if (order.status === 'Cancelled') throw AppError.conflict('This order was cancelled');
  if (!order.payment.paypalOrderId || order.payment.paypalOrderId !== paypalOrderId) {
    throw AppError.conflict('This PayPal payment does not belong to this order'); // binds PayPal order <-> our order
  }

  const provider = getProvider(order.paymentMethod);
  let paypalOrder;
  try {
    paypalOrder = await provider.captureOrder(paypalOrderId);
  } catch (err) {
    if (err.issue === 'ORDER_ALREADY_CAPTURED') {
      paypalOrder = await provider.getOrder(paypalOrderId); // retry after a lost response: verify what PayPal has
    } else if (err.issue === 'INSTRUMENT_DECLINED') {
      await markFailed(order._id, 'Payment declined by PayPal');
      throw new AppError('Your payment was declined. Please try another payment method.', 402);
    } else if (err.issue === 'ORDER_NOT_APPROVED' || err.issue === 'PAYER_ACTION_REQUIRED') {
      throw AppError.conflict('The payment has not been approved yet. Please approve it in PayPal first.');
    } else {
      throw err;
    }
  }

  // The decisive step: trust only what PayPal told the SERVER.
  const result = verifyPaypalCapture({ order, paypalOrder });
  if (!result.ok) {
    console.error(`PAYMENT VERIFICATION FAILED order=${order._id} paypalOrder=${paypalOrderId}: ${result.reason}`);
    await markFailed(order._id, result.reason);
    throw AppError.conflict(`We could not verify your payment (ref ${order._id}). If you were charged, please contact support.`);
  }

  const paid = {
    'payment.status': 'paid', 'payment.transactionId': result.transactionId,
    'payment.amount': result.amount, 'payment.paidAt': new Date(),
  };
  // Conditional update: succeeds once, even if two capture requests race.
  const updated = await Order.findOneAndUpdate(
    { _id: order._id, status: 'Pending', 'payment.status': { $ne: 'paid' } },
    { $set: { ...paid, status: 'Confirmed' }, $unset: { 'payment.failureReason': '' } },
    { new: true }
  );
  if (updated) {
    await Promise.all(updated.items.map((i) => Product.updateOne({ _id: i.product }, { $inc: { soldCount: i.quantity } })));
    return { order: updated };
  }

  const current = await Order.findById(order._id);
  if (current.payment.status === 'paid') return { order: current, alreadyPaid: true };

  // Cancelled while the capture was in flight: keep a record of the money we hold so an admin can refund it.
  await Order.updateOne({ _id: order._id, 'payment.status': { $ne: 'paid' } },
    { $set: { ...paid, 'payment.failureReason': 'Paid after the order was cancelled - refund required' } });
  console.error(`PAID AFTER CANCELLATION order=${order._id} capture=${result.transactionId}: refund required`);
  throw AppError.conflict(`This order was cancelled before the payment completed. Please contact support for a refund (ref ${order._id}).`);
}

module.exports = { createPayment, capturePayment };
