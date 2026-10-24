import { toProductPayload, toFormValues } from './productPayload';
import { toCouponPayload, toCouponFormValues } from './couponPayload';

const form = { name: ' Spicy Wrap ', description: ' Hot and tasty wrap. ', price: '4.5', stock: '12', category: 'c1', image: ' ', featured: true, isAvailable: true, ingredients: 'tortilla, chicken,  , sauce', nutrition: { calories: '420', protein: '', carbs: '40', fat: '' } };

describe('toProductPayload', () => {
  it('trims text, converts numbers and splits ingredients', () => {
    expect(toProductPayload(form)).toEqual({
      name: 'Spicy Wrap', description: 'Hot and tasty wrap.', price: 4.5, stock: 12, category: 'c1', image: undefined,
      featured: true, isAvailable: true, ingredients: ['tortilla', 'chicken', 'sauce'], nutrition: { calories: 420, carbs: 40 },
    });
  });
  it('leaves nutrition out entirely when nothing was entered', () => {
    expect('nutrition' in toProductPayload({ ...form, nutrition: { calories: '', protein: '', carbs: '', fat: '' } })).toBe(false);
  });
  it('treats 0 as a real nutrition value', () => {
    expect(toProductPayload({ ...form, nutrition: { calories: '0', protein: '', carbs: '', fat: '' } }).nutrition).toEqual({ calories: 0 });
  });
});

describe('toFormValues', () => {
  it('turns an API product into form strings', () => {
    const v = toFormValues({ name: 'A', description: 'D', price: 5.99, stock: 3, category: { _id: 'c9' }, image: '/i.svg', featured: false, isAvailable: false, ingredients: ['x', 'y'], nutrition: { calories: 100, fat: 0 } });
    expect(v).toEqual({ name: 'A', description: 'D', price: '5.99', stock: '3', category: 'c9', image: '/i.svg', featured: false, isAvailable: false, ingredients: 'x, y', nutrition: { calories: '100', protein: '', carbs: '', fat: '0' } });
  });
});

const coupon = { code: ' save5 ', description: '', discountType: 'percentage', discountValue: '15', minOrder: '10', maxDiscount: '4', expiresAt: '2030-06-30', usageLimit: '', isActive: true };

describe('toCouponPayload', () => {
  it('upper-cases the code, converts numbers and omits blank optionals', () => {
    const p = toCouponPayload(coupon);
    expect(p).toMatchObject({ code: 'SAVE5', discountType: 'percentage', discountValue: 15, minOrder: 10, maxDiscount: 4, isActive: true });
    expect(p.description).toBe(undefined);
    expect(p.usageLimit).toBe(undefined);
  });
  it('sets the expiry to the end of the chosen day', () => {
    expect(new Date(toCouponPayload(coupon).expiresAt).getTime()).toBe(new Date('2030-06-30T23:59:59').getTime());
  });
  it('drops the maximum discount for fixed coupons', () => {
    expect(toCouponPayload({ ...coupon, discountType: 'fixed' }).maxDiscount).toBe(undefined);
  });
  it('round-trips through the form', () => {
    const v = toCouponFormValues({ code: 'A1', description: 'd', discountType: 'fixed', discountValue: 3, minOrder: 15, expiresAt: '2030-06-30T12:00:00.000Z', isActive: false, usageLimit: 5 });
    expect(v).toEqual({ code: 'A1', description: 'd', discountType: 'fixed', discountValue: '3', minOrder: '15', maxDiscount: '', expiresAt: '2030-06-30', usageLimit: '5', isActive: false });
  });
});
