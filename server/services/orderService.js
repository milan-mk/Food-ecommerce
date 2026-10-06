const Order = require('../models/Order');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const AppError = require('../utils/AppError');
const { priceCart } = require('./orderPricing');

// Stock is reserved when the order is created and given back if the order is cancelled.
// (No Mongo transactions: they need a replica set. Each step is atomic and failures are compensated.)
async function restoreStock(items) {
  await Promise.all(items.map((i) => Product.updateOne({ _id: i.product }, { $inc: { stock: i.quantity } })));
}

async function reserveStock(items) {
  const done = [];
  try {
    for (const i of items) {
      const r = await Product.updateOne(
        { _id: i.product, isAvailable: true, stock: { $gte: i.quantity } },
        { $inc: { stock: -i.quantity } }
      );
      if (!r.modifiedCount) throw AppError.conflict(`${i.name} just sold out or has too little stock`);
      done.push(i);
    }
  } catch (e) {
    await restoreStock(done);
    throw e;
  }
}

async function reserveCoupon(coupon) {
  const updated = await Coupon.findOneAndUpdate(
    {
      _id: coupon._id, isActive: true, expiresAt: { $gt: new Date() },
      $expr: { $or: [{ $eq: [{ $type: '$usageLimit' }, 'missing'] }, { $lt: ['$usedCount', '$usageLimit'] }] },
    },
    { $inc: { usedCount: 1 } }
  );
  if (!updated) throw AppError.conflict('This coupon is no longer available');
}

const releaseCoupon = (code) => Coupon.updateOne({ code, usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } });

async function createOrder({ user, items, deliveryAddress, couponCode }) {
  const { quote, coupon } = await priceCart({ items, couponCode });
  await reserveStock(quote.items);
  let couponReserved = false;
  try {
    if (coupon) { await reserveCoupon(coupon); couponReserved = true; }
    return await Order.create({
      user: user._id,
      items: quote.items,
      deliveryAddress,
      subtotal: quote.subtotal,
      discount: quote.discount,
      tax: quote.tax,
      deliveryFee: quote.deliveryFee,
      total: quote.total,
      couponCode: quote.couponCode,
      currency: quote.currency,
      paymentMethod: 'paypal',
    });
  } catch (e) {
    await restoreStock(quote.items);
    if (couponReserved) await releaseCoupon(coupon.code);
    throw e;
  }
}

// Customers may cancel only unpaid, still-Pending orders. The single conditional update prevents racing a payment capture.
// Paid orders need a PayPal refund, which is handled by admin cancellation in a later slice.
async function cancelOwnOrder(orderId, user) {
  const existing = await Order.findOne({ _id: orderId, user: user._id });
  if (!existing) throw AppError.notFound('Order not found');

  const order = await Order.findOneAndUpdate(
    { _id: orderId, user: user._id, status: 'Pending', 'payment.status': { $ne: 'paid' } },
    { status: 'Cancelled' },
    { new: true }
  );
  if (!order) {
    if (existing.status === 'Cancelled') throw AppError.conflict('This order is already cancelled');
    if (existing.payment.status === 'paid') throw AppError.conflict('This order has already been paid. Please contact support to cancel it.');
    throw AppError.conflict(`Orders that are "${existing.status}" can no longer be cancelled`);
  }
  await restoreStock(order.items);
  if (order.couponCode) await releaseCoupon(order.couponCode);
  return order;
}

module.exports = { createOrder, cancelOwnOrder, restoreStock, releaseCoupon };
