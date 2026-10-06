const Review = require('../models/Review');
const Product = require('../models/Product');
const Order = require('../models/Order');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { isObjectId } = require('../utils/objectId');

// Only customers whose order for this product reached one of these statuses may review it.
const REVIEWABLE_ORDER_STATUSES = ['Delivered'];

async function resolveProduct(idOrSlug) {
  const q = isObjectId(idOrSlug) ? Product.findById(idOrSlug) : Product.findOne({ slug: String(idOrSlug).toLowerCase() });
  const product = await q.select('_id ratingAverage ratingCount');
  if (!product) throw AppError.notFound('Product not found');
  return product;
}

exports.listForProduct = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const product = await resolveProduct(req.params.id);
  const filter = { product: product._id };
  const [data, total] = await Promise.all([
    Review.find(filter).populate('user', 'name').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Review.countDocuments(filter),
  ]);
  res.json({
    success: true, data,
    summary: { ratingAverage: product.ratingAverage, ratingCount: product.ratingCount },
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

exports.create = asyncHandler(async (req, res) => {
  const product = await resolveProduct(req.params.id);
  const purchased = await Order.exists({ user: req.user._id, status: { $in: REVIEWABLE_ORDER_STATUSES }, 'items.product': product._id });
  if (!purchased) throw AppError.forbidden('You can only review products from your delivered orders');
  if (await Review.exists({ user: req.user._id, product: product._id })) throw AppError.conflict('You have already reviewed this product');

  const review = await Review.create({ user: req.user._id, product: product._id, ...req.body });
  await review.populate('user', 'name');
  res.status(201).json({ success: true, message: 'Review added', data: review });
});

exports.update = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) throw AppError.notFound('Review not found');
  if (String(review.user) !== String(req.user._id)) throw AppError.forbidden('You can only edit your own review');
  Object.assign(review, req.body);
  await review.save(); // post-save hook recalculates the product rating
  res.json({ success: true, message: 'Review updated', data: review });
});

exports.remove = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) throw AppError.notFound('Review not found');
  if (String(review.user) !== String(req.user._id) && req.user.role !== 'admin') throw AppError.forbidden('You can only delete your own review');
  await Review.findOneAndDelete({ _id: review._id }); // post-delete hook recalculates the product rating
  res.json({ success: true, message: 'Review deleted' });
});
