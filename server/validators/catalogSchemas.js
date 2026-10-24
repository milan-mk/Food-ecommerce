const { z } = require('zod');
const { OBJECT_ID_RE } = require('../utils/objectId');
const { SORT_KEYS } = require('../utils/productQuery');
const { round2 } = require('../utils/money');

const objectId = z.string().regex(OBJECT_ID_RE, 'Invalid id');
const boolStr = z.enum(['true', 'false']).transform((v) => v === 'true');
const imageUrl = z.string().trim().refine((v) => v.startsWith('/') || /^https?:\/\//i.test(v), 'Image must be an http(s) URL or a /path');

exports.idParam = z.object({ id: objectId });

// ---- categories ----
const categoryBase = z.object({
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(300).optional(),
  image: imageUrl.optional(),
});
exports.createCategory = categoryBase;
exports.updateCategory = categoryBase.partial().refine((o) => Object.keys(o).length > 0, 'Provide at least one field to update');

// ---- products ----
const nutrient = z.coerce.number().min(0).max(10000).optional();
const productBase = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().min(10, 'Description must be at least 10 characters').max(1000),
  price: z.coerce.number().positive('Price must be greater than 0').max(10000).transform(round2),
  category: objectId,
  image: imageUrl.optional(),
  ingredients: z.array(z.string().trim().min(1).max(60)).max(30).optional(),
  nutrition: z.object({ calories: nutrient, protein: nutrient, carbs: nutrient, fat: nutrient }).optional(),
  isAvailable: z.boolean().optional(),
  stock: z.coerce.number().int().min(0).max(100000).optional(),
  featured: z.boolean().optional(),
});
exports.createProduct = productBase;
exports.updateProduct = productBase.partial().refine((o) => Object.keys(o).length > 0, 'Provide at least one field to update');

exports.listProductsQuery = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.string().trim().max(80).optional(), // id or slug
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  rating: z.coerce.number().min(0).max(5).optional(),
  inStock: boolStr.optional(),
  featured: boolStr.optional(),
  includeInactive: boolStr.optional(), // honoured for admins only
  sort: z.enum(SORT_KEYS).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
}).refine((q) => q.minPrice == null || q.maxPrice == null || q.minPrice <= q.maxPrice, {
  message: 'minPrice cannot be greater than maxPrice', path: ['minPrice'],
});
