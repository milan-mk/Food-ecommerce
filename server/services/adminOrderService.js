const Order = require('../models/Order');
const Product = require('../models/Product');
const AppError = require('../utils/AppError');
const { canTransition } = require('../utils/orderStatus');
const { getProvider } = require('./payments');
const { restoreStock, releaseCoupon } = require('./orderService');

// Refunds the full captured amount through the payment provider. Throws if the refund did not go through,
// so callers never mark an order cancelled/refunded unless the money really went back.
async function refundPayment(order) {
  const provider = getProvider(order.paymentMethod);
  if (!provider.isConfigured()) throw new AppError('Cannot refund: online payments are not configured on this server.', 503);
  if (!order.payment.transactionId) throw AppError.conflict('This order has no recorded payment transaction to refund');
  try {
    const r = await provider.refundCapture({
      captureId: order.payment.transactionId,
      amount: order.payment.amount != null ? order.payment.amount : order.total,
      currency: order.currency,
    });
    if (!['COMPLETED', 'PENDING'].includes(r.status)) throw new AppError(`PayPal refund was not accepted (status ${r.status})`, 502);
    return { refundId: r.id, status: r.status };
  } catch (err) {
    if (err.issue === 'CAPTURE_FULLY_REFUNDED') return { refundId: null, status: 'ALREADY_REFUNDED' }; // retry after an earlier success
    throw err;
  }
}

const refundFields = (refund) => ({ 'payment.status': 'refunded', 'payment.refundId': refund.refundId, 'payment.refundedAt': new Date() });

async function cancelAsAdmin(order) {
  const wasPaid = order.payment.status === 'paid';
  const refund = wasPaid ? await refundPayment(order) : null; // refund FIRST: if it fails the order is untouched
  const set = { status: 'Cancelled', ...(refund ? refundFields(refund) : {}) };
  const updated = await Order.findOneAndUpdate({ _id: order._id, status: order.status }, { $set: set, $unset: { 'payment.failureReason': '' } }, { new: true });
  if (!updated) {
    if (refund) console.error(`ORDER CHANGED DURING CANCEL order=${order._id}: refund ${refund.refundId} was issued, check the order manually`);
    throw AppError.conflict('The order was changed by someone else. Refresh and check its current state.');
  }
  await restoreStock(updated.items);
  if (updated.couponCode) await releaseCoupon(updated.couponCode);
  if (wasPaid) await Promise.all(updated.items.map((i) => Product.updateOne({ _id: i.product }, { $inc: { soldCount: -i.quantity } })));
  return updated;
}

async function updateOrderStatus(orderId, nextStatus) {
  const order = await Order.findById(orderId);
  if (!order) throw AppError.notFound('Order not found');
  if (!canTransition(order.status, nextStatus)) throw AppError.conflict(`Cannot change an order from "${order.status}" to "${nextStatus}"`);
  if (nextStatus === 'Cancelled') return cancelAsAdmin(order);
  if (order.payment.status !== 'paid') throw AppError.conflict('Only paid orders can move forward');
  const updated = await Order.findOneAndUpdate({ _id: order._id, status: order.status }, { status: nextStatus }, { new: true });
  if (!updated) throw AppError.conflict('The order was changed by someone else. Refresh and try again.');
  return updated;
}

// Closes the gap left when a customer's payment completed after the order was cancelled ("refund required").
async function refundCancelledOrder(orderId) {
  const order = await Order.findById(orderId);
  if (!order) throw AppError.notFound('Order not found');
  if (order.status !== 'Cancelled' || order.payment.status !== 'paid') {
    throw AppError.conflict('Only cancelled orders that are still marked as paid can be refunded here. Cancel the order instead.');
  }
  const refund = await refundPayment(order);
  return Order.findOneAndUpdate({ _id: order._id }, { $set: refundFields(refund), $unset: { 'payment.failureReason': '' } }, { new: true });
}

module.exports = { updateOrderStatus, refundCancelledOrder };
