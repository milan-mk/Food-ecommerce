const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const AppError = require('../utils/AppError');
const { pricing } = require('../config/env');
const { buildQuote } = require('../utils/pricing');

// Prices a cart from DATABASE values only. Anything price-like sent by the client is never read.
async function priceCart({ items, couponCode, now = new Date() }) {
  const qtyById = new Map();
  for (const { product, quantity } of items) qtyById.set(String(product), (qtyById.get(String(product)) || 0) + quantity);

  const products = await Product.find({ _id: { $in: [...qtyById.keys()] } });
  const byId = new Map(products.map((p) => [String(p._id), p]));

  const lines = [];
  for (const [id, quantity] of qtyById) {
    const p = byId.get(id);
    if (!p) throw AppError.notFound('A product in your cart no longer exists');
    if (!p.isAvailable) throw AppError.conflict(`${p.name} is no longer available`);
    if (p.stock < quantity) throw AppError.conflict(p.stock === 0 ? `${p.name} is out of stock` : `Only ${p.stock} of ${p.name} left`);
    lines.push({ product: p._id, name: p.name, image: p.image, price: p.price, quantity });
  }

  const coupon = couponCode ? await Coupon.findOne({ code: couponCode }) : null;
  const quote = buildQuote({ lines, couponCode, coupon, now, cfg: pricing });
  return { quote, coupon };
}

module.exports = { priceCart };
