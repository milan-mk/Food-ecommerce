const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/Product');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { round2 } = require('../utils/money');
const { isObjectId, escapeRegex } = require('../utils/objectId');
const { fillDays, windowStart } = require('../utils/stats');
const { updateOrderStatus, refundCancelledOrder } = require('../services/adminOrderService');

const paginate = (page, limit, total) => ({ page, limit, total, pages: Math.ceil(total / limit) });
const LOW_STOCK = 10;

// ---------------- dashboard ----------------
exports.stats = asyncHandler(async (req, res) => {
  const { days } = req.query;
  const start = windowStart(days);
  const [statusAgg, sales, customers, products, lowStock, recentOrders, popularProducts, daily] = await Promise.all([
    Order.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
    Order.aggregate([{ $match: { 'payment.status': 'paid' } }, { $group: { _id: null, revenue: { $sum: '$total' }, orders: { $sum: 1 } } }]),
    User.countDocuments({ role: 'customer' }),
    Product.countDocuments(),
    Product.countDocuments({ isAvailable: true, stock: { $lte: LOW_STOCK } }),
    Order.find().sort({ createdAt: -1 }).limit(5).populate('user', 'name email').select('user total status payment.status createdAt').lean(),
    Product.find({ soldCount: { $gt: 0 } }).sort({ soldCount: -1 }).limit(5).select('name image price soldCount').lean(),
    Order.aggregate([
      { $match: { 'payment.status': 'paid', 'payment.paidAt': { $gte: start } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$payment.paidAt', timezone: 'UTC' } }, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
    ]),
  ]);

  const statusCounts = Object.fromEntries(Order.ORDER_STATUSES.map((s) => [s, 0]));
  statusAgg.forEach((s) => { statusCounts[s._id] = s.n; });
  const totalOrders = Object.values(statusCounts).reduce((a, b) => a + b, 0);

  res.json({
    success: true,
    data: {
      totals: { orders: totalOrders, sales: round2(sales[0] ? sales[0].revenue : 0), paidOrders: sales[0] ? sales[0].orders : 0, customers, products, lowStock },
      pendingOrders: statusCounts.Pending, // awaiting payment
      activeOrders: statusCounts.Confirmed + statusCounts.Preparing + statusCounts['Out for Delivery'], // paid, being fulfilled
      completedOrders: statusCounts.Delivered,
      statusCounts,
      recentOrders,
      popularProducts,
      salesByDay: fillDays(daily, days), // UTC days, zero-filled
      lowStockThreshold: LOW_STOCK,
    },
  });
});

// ---------------- orders ----------------
exports.listOrders = asyncHandler(async (req, res) => {
  const { status, paymentStatus, q, from, to, page, limit } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (paymentStatus) filter['payment.status'] = paymentStatus;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = from;
    if (to) { const end = new Date(to); end.setUTCHours(23, 59, 59, 999); filter.createdAt.$lte = end; } // "to" is inclusive of that day
  }
  if (q) {
    if (isObjectId(q)) filter._id = q;
    else {
      const re = new RegExp(escapeRegex(q), 'i');
      const users = await User.find({ $or: [{ name: re }, { email: re }] }).select('_id').limit(50).lean();
      filter.$or = [{ 'deliveryAddress.fullName': re }, { 'deliveryAddress.phone': re }, { user: { $in: users.map((u) => u._id) } }];
      // Short references (e.g. the last 6 characters shown on PayPal) match the end of the order id.
      if (/^[a-f\d]{4,23}$/i.test(q)) filter.$or.push({ $expr: { $regexMatch: { input: { $toString: '$_id' }, regex: `${q}$`, options: 'i' } } });
    }
  }
  const [data, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).populate('user', 'name email phone').lean(),
    Order.countDocuments(filter),
  ]);
  res.json({ success: true, data, pagination: paginate(page, limit, total) });
});

exports.updateOrderStatus = asyncHandler(async (req, res) => {
  const order = await updateOrderStatus(req.params.id, req.body.status);
  res.json({ success: true, message: `Order is now "${order.status}"`, data: order });
});

exports.refundOrder = asyncHandler(async (req, res) => {
  const order = await refundCancelledOrder(req.params.id);
  res.json({ success: true, message: 'Payment refunded', data: order });
});

// ---------------- users ----------------
exports.listUsers = asyncHandler(async (req, res) => {
  const { q, role, isActive, page, limit } = req.query;
  const filter = {};
  if (role) filter.role = role;
  if (isActive !== undefined) filter.isActive = isActive;
  if (q) { const re = new RegExp(escapeRegex(q), 'i'); filter.$or = [{ name: re }, { email: re }, { phone: re }]; }
  const [data, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    User.countDocuments(filter),
  ]);
  res.json({ success: true, data, pagination: paginate(page, limit, total) });
});

exports.getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw AppError.notFound('User not found');
  const [agg, recentOrders] = await Promise.all([
    Order.aggregate([
      { $match: { user: user._id } },
      { $group: { _id: null, orders: { $sum: 1 }, spent: { $sum: { $cond: [{ $eq: ['$payment.status', 'paid'] }, '$total', 0] } } } },
    ]),
    Order.find({ user: user._id }).sort({ createdAt: -1 }).limit(5).select('total status payment.status createdAt').lean(),
  ]);
  res.json({ success: true, data: { user, stats: { orders: agg[0] ? agg[0].orders : 0, totalSpent: round2(agg[0] ? agg[0].spent : 0) }, recentOrders } });
});

exports.updateUser = asyncHandler(async (req, res) => {
  if (String(req.params.id) === String(req.user._id)) throw AppError.conflict('You cannot change your own role or status');
  const user = await User.findById(req.params.id);
  if (!user) throw AppError.notFound('User not found');
  Object.assign(user, req.body); // schema whitelists isActive/role only
  await user.save();             // a disabled user's existing sessions stop working immediately (auth checks isActive)
  res.json({ success: true, message: 'User updated', data: user });
});

// ---------------- inventory ----------------
exports.listInventory = asyncHandler(async (req, res) => {
  const { q, filter: mode, threshold, page, limit } = req.query;
  const filter = {};
  if (mode === 'out') filter.stock = 0;
  if (mode === 'low') filter.stock = { $gt: 0, $lte: threshold };
  if (q) filter.name = new RegExp(escapeRegex(q), 'i');
  const [data, total] = await Promise.all([
    Product.find(filter).sort({ stock: 1, name: 1 }).skip((page - 1) * limit).limit(limit).populate('category', 'name').select('name slug image stock isAvailable price category').lean(),
    Product.countDocuments(filter),
  ]);
  res.json({ success: true, data, pagination: paginate(page, limit, total) });
});

// "adjust" uses an atomic $inc so it cannot clobber stock reserved by orders happening at the same moment.
exports.updateStock = asyncHandler(async (req, res) => {
  const { set, adjust } = req.body;
  let product;
  if (set !== undefined) product = await Product.findByIdAndUpdate(req.params.id, { stock: set }, { new: true });
  else {
    const filter = { _id: req.params.id, ...(adjust < 0 ? { stock: { $gte: -adjust } } : {}) };
    product = await Product.findOneAndUpdate(filter, { $inc: { stock: adjust } }, { new: true });
    if (!product && (await Product.exists({ _id: req.params.id }))) throw AppError.conflict('Not enough stock to remove that many');
  }
  if (!product) throw AppError.notFound('Product not found');
  res.json({ success: true, message: 'Stock updated', data: { _id: product._id, name: product.name, stock: product.stock } });
});
