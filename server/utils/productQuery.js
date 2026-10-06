const { escapeRegex } = require('./objectId');

const SORTS = {
  newest: { createdAt: -1 },
  price_asc: { price: 1 },
  price_desc: { price: -1 },
  rating: { ratingAverage: -1, ratingCount: -1 },
  popular: { soldCount: -1 },
};
const SORT_KEYS = Object.keys(SORTS);

// _id tie-breaker keeps pagination stable when many products share a sort value.
const buildSort = (key = 'newest') => ({ ...(SORTS[key] || SORTS.newest), _id: -1 });

/**
 * Pure function: turns validated query options into a Mongo filter.
 * searchCategoryIds = ids of categories whose NAME matched the search text (so "pizza" finds the Pizza category too).
 */
function buildFilter({ q, categoryId, searchCategoryIds = [], minPrice, maxPrice, rating, inStock, featured, includeInactive }) {
  const filter = {};
  if (!includeInactive) filter.isAvailable = true;
  if (categoryId) filter.category = categoryId;
  if (q) {
    const re = new RegExp(escapeRegex(q), 'i');
    const or = [{ name: re }, { description: re }];
    if (searchCategoryIds.length) or.push({ category: { $in: searchCategoryIds } });
    filter.$or = or;
  }
  if (minPrice != null || maxPrice != null) {
    filter.price = {};
    if (minPrice != null) filter.price.$gte = minPrice;
    if (maxPrice != null) filter.price.$lte = maxPrice;
  }
  if (rating != null) filter.ratingAverage = { $gte: rating };
  if (inStock) filter.stock = { $gt: 0 };
  if (featured) filter.featured = true;
  return filter;
}

module.exports = { SORT_KEYS, buildSort, buildFilter };
