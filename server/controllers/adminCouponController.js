const Coupon = require('../models/Coupon');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const stateOf = (c, now = new Date()) => {
  if (!c.isActive) return 'inactive';
  if (new Date(c.expiresAt) <= now) return 'expired';
  if (c.usageLimit != null && c.usedCount >= c.usageLimit) return 'exhausted';
  return 'active';
};

exports.list = asyncHandler(async (req, res) => {
  const coupons = await Coupon.find().sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: coupons.map((c) => ({ ...c, state: stateOf(c) })) });
});

exports.create = asyncHandler(async (req, res) => {
  const coupon = await Coupon.create(req.body); // duplicate code -> 409 via the central error handler
  res.status(201).json({ success: true, message: 'Coupon created', data: coupon });
});

exports.update = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) throw AppError.notFound('Coupon not found');
  Object.assign(coupon, req.body); // usedCount is not in the schema, so it cannot be edited
  await coupon.save();             // model hook re-checks "percentage <= 100" on the final values
  res.json({ success: true, message: 'Coupon updated', data: coupon });
});

exports.remove = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findByIdAndDelete(req.params.id); // orders keep the code as plain text, so history is unaffected
  if (!coupon) throw AppError.notFound('Coupon not found');
  res.json({ success: true, message: 'Coupon deleted' });
});

// Public: for the Offers page. Only currently usable coupons are returned.
exports.listActive = asyncHandler(async (req, res) => {
  const data = await Coupon.find({
    isActive: true, expiresAt: { $gt: new Date() },
    $expr: { $or: [{ $eq: [{ $type: '$usageLimit' }, 'missing'] }, { $lt: ['$usedCount', '$usageLimit'] }] },
  }).sort({ expiresAt: 1 }).select('code description discountType discountValue minOrder maxDiscount expiresAt').lean();
  res.json({ success: true, data });
});
