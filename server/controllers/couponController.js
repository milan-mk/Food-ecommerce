const asyncHandler = require('../utils/asyncHandler');
const { priceCart } = require('../services/orderPricing');

// Checks a code against a cart and returns the resulting discount + totals.
exports.validate = asyncHandler(async (req, res) => {
  const { quote } = await priceCart({ items: req.body.items, couponCode: req.body.code });
  res.json({ success: true, message: 'Coupon applied', data: { code: quote.couponCode, discount: quote.discount, quote } });
});
