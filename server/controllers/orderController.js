const Order = require('../models/Order');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { priceCart } = require('../services/orderPricing');
const { createOrder, cancelOwnOrder } = require('../services/orderService');

// Totals preview for the cart / checkout pages. Same code path as order creation.
exports.quote = asyncHandler(async (req, res) => {
  const { quote } = await priceCart(req.body);
  res.json({ success: true, data: quote });
});

exports.create = asyncHandler(async (req, res) => {
  const order = await createOrder({ user: req.user, ...req.body });
  res.status(201).json({ success: true, message: 'Order created. Complete payment to confirm it.', data: order });
});

exports.myOrders = asyncHandler(async (req, res) => {
  const { status, page, limit } = req.query;
  const filter = { user: req.user._id, ...(status ? { status } : {}) };
  const [data, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Order.countDocuments(filter),
  ]);
  res.json({ success: true, data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

// Customers only ever match their own orders; someone else's order is reported as "not found", not "forbidden".
exports.get = asyncHandler(async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  let query = Order.findOne(isAdmin ? { _id: req.params.id } : { _id: req.params.id, user: req.user._id });
  if (isAdmin) query = query.populate('user', 'name email phone');
  const order = await query;
  if (!order) throw AppError.notFound('Order not found');
  res.json({ success: true, data: order });
});

exports.cancel = asyncHandler(async (req, res) => {
  const order = await cancelOwnOrder(req.params.id, req.user);
  res.json({ success: true, message: 'Order cancelled', data: order });
});
