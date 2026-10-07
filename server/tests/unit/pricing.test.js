const { buildQuote, computeDiscount, calculateTotals } = require('../../utils/pricing');

const cfg = { currency: 'USD', taxRate: 0.05, deliveryFee: 2.99, freeDeliveryThreshold: 30 };
const future = new Date(Date.now() + 864e5), past = new Date(Date.now() - 864e5);
const coupon = (o = {}) => ({ code: 'X', isActive: true, discountType: 'percentage', discountValue: 10, minOrder: 10, maxDiscount: 5, expiresAt: future, usedCount: 0, ...o });
const lines = [{ product: 'a', name: 'Burger', price: 5.99, quantity: 2 }, { product: 'b', name: 'Fries', price: 2.99, quantity: 1 }];
const failure = (fn) => { try { fn(); } catch (e) { return e; } throw new Error('expected an error'); };

describe('buildQuote', () => {
  it('prices a cart without a coupon', () => {
    const q = buildQuote({ lines, cfg });
    expect(q.subtotal).toBe(14.97);
    expect(q.discount).toBe(0);
    expect(q.tax).toBe(0.75);
    expect(q.deliveryFee).toBe(2.99);
    expect(q.total).toBe(18.71);
  });
  it('charges tax on the discounted amount', () => {
    const q = buildQuote({ lines, couponCode: 'X', coupon: coupon(), cfg });
    expect(q.discount).toBe(1.5);
    expect(q.tax).toBe(0.67);
    expect(q.total).toBe(17.13);
  });
  it('does not drift on float sums (0.1 + 0.2)', () => {
    expect(buildQuote({ lines: [{ price: 0.1, quantity: 1 }, { price: 0.2, quantity: 1 }], cfg }).subtotal).toBe(0.3);
  });
  it('rejects an unknown or inactive coupon with a couponCode field error', () => {
    const e = failure(() => buildQuote({ lines, couponCode: 'X', coupon: null, cfg }));
    expect(e.statusCode).toBe(422);
    expect(e.errors[0].field).toBe('couponCode');
    expect(failure(() => buildQuote({ lines, couponCode: 'X', coupon: coupon({ isActive: false }), cfg })).message).toMatch(/invalid/);
  });
  it('rejects expired, exhausted and below-minimum coupons', () => {
    expect(failure(() => buildQuote({ lines, couponCode: 'X', coupon: coupon({ expiresAt: past }), cfg })).message).toMatch(/expired/);
    expect(failure(() => buildQuote({ lines, couponCode: 'X', coupon: coupon({ usageLimit: 5, usedCount: 5 }), cfg })).message).toMatch(/usage limit/);
    expect(failure(() => buildQuote({ lines, couponCode: 'X', coupon: coupon({ minOrder: 20 }), cfg })).message).toMatch(/Minimum order of USD 20.00/);
  });
  it('allows the last remaining use of a limited coupon', () => {
    expect(buildQuote({ lines, couponCode: 'X', coupon: coupon({ usageLimit: 5, usedCount: 4 }), cfg }).discount).toBe(1.5);
  });
});

describe('computeDiscount', () => {
  it('caps percentage coupons at maxDiscount', () => { expect(computeDiscount(coupon(), 200)).toBe(5); });
  it('never lets a fixed coupon exceed the subtotal', () => { expect(computeDiscount(coupon({ discountType: 'fixed', discountValue: 3 }), 2)).toBe(2); });
});

describe('calculateTotals', () => {
  it('gives free delivery from the threshold (measured before discount)', () => {
    expect(calculateTotals({ subtotal: 30, discount: 5, ...cfg }).deliveryFee).toBe(0);
    expect(calculateTotals({ subtotal: 29.99, ...cfg }).deliveryFee).toBe(2.99);
  });
});
