const AppError = require('./AppError');
const { round2 } = require('./money');

function assertCouponUsable(coupon, subtotal, { now = new Date(), currency = '' } = {}) {
  const fail = (message) => { throw AppError.unprocessable(message, [{ field: 'couponCode', message }]); };
  if (!coupon || !coupon.isActive) fail('Coupon code is invalid');
  if (new Date(coupon.expiresAt) <= now) fail('This coupon has expired');
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) fail('This coupon has reached its usage limit');
  if (subtotal < (coupon.minOrder || 0)) {
    const amount = [currency, round2(coupon.minOrder).toFixed(2)].filter(Boolean).join(' ');
    fail(`Minimum order of ${amount} required for this coupon`);
  }
}

function computeDiscount(coupon, subtotal) {
  let d = coupon.discountType === 'percentage' ? (subtotal * coupon.discountValue) / 100 : coupon.discountValue;
  if (coupon.discountType === 'percentage' && coupon.maxDiscount != null) d = Math.min(d, coupon.maxDiscount);
  return round2(Math.min(d, subtotal)); // a discount can never exceed the subtotal
}

// Tax is charged on the discounted amount. Delivery is free once the pre-discount subtotal reaches the threshold.
function calculateTotals({ subtotal, discount = 0, taxRate, deliveryFee, freeDeliveryThreshold }) {
  const taxable = round2(subtotal - discount);
  const tax = round2(taxable * taxRate);
  const fee = subtotal >= freeDeliveryThreshold ? 0 : deliveryFee;
  return { tax, deliveryFee: fee, total: round2(taxable + tax + fee) };
}

// lines: [{ product, name, image, price, quantity }] where price comes from the DATABASE.
function buildQuote({ lines, couponCode, coupon, now = new Date(), cfg }) {
  const subtotal = round2(lines.reduce((sum, l) => sum + round2(l.price * l.quantity), 0));
  let discount = 0;
  if (couponCode) {
    assertCouponUsable(coupon, subtotal, { now, currency: cfg.currency });
    discount = computeDiscount(coupon, subtotal);
  }
  const totals = calculateTotals({ subtotal, discount, ...cfg });
  return { items: lines, subtotal, discount, ...totals, couponCode: couponCode || undefined, currency: cfg.currency };
}

module.exports = { assertCouponUsable, computeDiscount, calculateTotals, buildQuote };
