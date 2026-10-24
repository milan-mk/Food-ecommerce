const Product = require('../models/Product');
const Category = require('../models/Category');
const Review = require('../models/Review');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { isObjectId, escapeRegex } = require('../utils/objectId');
const { buildFilter, buildSort } = require('../utils/productQuery');

const isAdmin = (req) => req.user && req.user.role === 'admin';
const findByIdOrSlug = (v) => (isObjectId(v) ? Product.findById(v) : Product.findOne({ slug: String(v).toLowerCase() }));

async function assertCategoryExists(id) {
  if (!(await Category.exists({ _id: id }))) throw AppError.unprocessable('Category does not exist', [{ field: 'category', message: 'Category does not exist' }]);
}

exports.list = asyncHandler(async (req, res) => {
  const { q, category, sort, page, limit, includeInactive, ...rest } = req.query;
  const empty = { success: true, data: [], pagination: { page, limit, total: 0, pages: 0 } };

  let categoryId;
  if (category) {
    if (isObjectId(category)) categoryId = category;
    else {
      const c = await Category.findOne({ slug: category.toLowerCase() }).select('_id').lean();
      if (!c) return res.json(empty); // unknown category = no products, not an error
      categoryId = c._id;
    }
  }

  let searchCategoryIds = [];
  if (q) {
    const cats = await Category.find({ name: new RegExp(escapeRegex(q), 'i') }).select('_id').lean();
    searchCategoryIds = cats.map((c) => c._id);
  }

  const filter = buildFilter({ ...rest, q, categoryId, searchCategoryIds, includeInactive: includeInactive && isAdmin(req) });
  const [data, total] = await Promise.all([
    Product.find(filter).populate('category', 'name slug').sort(buildSort(sort)).skip((page - 1) * limit).limit(limit).lean(),
    Product.countDocuments(filter),
  ]);
  res.json({ success: true, data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

exports.get = asyncHandler(async (req, res) => {
  const product = await findByIdOrSlug(req.params.id);
  if (!product || (!product.isAvailable && !isAdmin(req))) throw AppError.notFound('Product not found');
  await product.populate('category', 'name slug');
  const related = await Product.find({ category: product.category._id, _id: { $ne: product._id }, isAvailable: true })
    .sort({ soldCount: -1 }).limit(4).lean();
  res.json({ success: true, data: product, related });
});

exports.create = asyncHandler(async (req, res) => {
  await assertCategoryExists(req.body.category);
  const product = await Product.create(req.body);
  res.status(201).json({ success: true, message: 'Product created', data: product });
});

exports.update = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw AppError.notFound('Product not found');
  if (req.body.category) await assertCategoryExists(req.body.category);
  Object.assign(product, req.body); // body is whitelisted by the zod schema (ratings/soldCount can't be set)
  await product.save();
  res.json({ success: true, message: 'Product updated', data: product });
});

exports.remove = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) throw AppError.notFound('Product not found');
  await Review.deleteMany({ product: product._id }); // past orders keep their own name/price snapshot
  res.json({ success: true, message: 'Product deleted' });
});
