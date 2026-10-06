const Category = require('../models/Category');
const Product = require('../models/Product');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { isObjectId } = require('../utils/objectId');

const findByIdOrSlug = (v) => (isObjectId(v) ? Category.findById(v) : Category.findOne({ slug: String(v).toLowerCase() }));

exports.list = asyncHandler(async (req, res) => {
  const [categories, counts] = await Promise.all([
    Category.find().sort({ name: 1 }).lean(),
    Product.aggregate([{ $match: { isAvailable: true } }, { $group: { _id: '$category', n: { $sum: 1 } } }]),
  ]);
  const byId = new Map(counts.map((c) => [String(c._id), c.n]));
  const data = categories.map((c) => ({ ...c, productCount: byId.get(String(c._id)) || 0 }));
  res.json({ success: true, data });
});

exports.get = asyncHandler(async (req, res) => {
  const category = await findByIdOrSlug(req.params.id);
  if (!category) throw AppError.notFound('Category not found');
  res.json({ success: true, data: category });
});

exports.create = asyncHandler(async (req, res) => {
  const category = await Category.create(req.body);
  res.status(201).json({ success: true, message: 'Category created', data: category });
});

exports.update = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw AppError.notFound('Category not found');
  Object.assign(category, req.body);
  await category.save(); // save() so the slug regenerates when the name changes
  res.json({ success: true, message: 'Category updated', data: category });
});

exports.remove = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw AppError.notFound('Category not found');
  const inUse = await Product.countDocuments({ category: category._id });
  if (inUse) throw AppError.conflict(`Cannot delete: ${inUse} product(s) still use this category`);
  await category.deleteOne();
  res.json({ success: true, message: 'Category deleted' });
});
