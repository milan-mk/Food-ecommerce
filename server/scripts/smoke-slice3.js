// Usage (server running + database seeded):  npm run smoke:orders --prefix server
// Covers server-side pricing, coupons, stock, order access control, cancellation and reviews.
const { pricing: P } = require('../config/env');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Order = require('../models/Order');
const Coupon = require('../models/Coupon');
const Product = require('../models/Product');
const { round2 } = require('../utils/money');

const BASE = process.env.API_URL || `http://localhost:${process.env.PORT || 5000}/api`;
const ADMIN = { email: process.env.SEED_ADMIN_EMAIL || 'admin@example.com', password: process.env.SEED_ADMIN_PASSWORD || 'Admin@12345' };
const ADDRESS = { fullName: 'Smoke Tester', phone: '9876543210', address: '12 Test Street', city: 'Indore', state: 'MP', postalCode: '452001' };

let passed = 0, failed = 0;
const check = (name, ok, extra = '') => { ok ? passed++ : failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  -> ' + extra}`); };

async function call(method, path, { body, cookie } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const set = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json, cookie: set.length ? set[0].split(';')[0] : null };
}

const expected = (sub, disc = 0) => {
  const taxable = round2(sub - disc);
  const tax = round2(taxable * P.taxRate);
  const fee = sub >= P.freeDeliveryThreshold ? 0 : P.deliveryFee;
  return { tax, fee, total: round2(taxable + tax + fee) };
};
const stockOf = async (slug) => (await call('GET', `/products/${slug}`)).json.data.stock;

(async () => {
  await connectDB();
  const stamp = Date.now();
  const pw = 'Smoke12345';

  let r = await call('POST', '/auth/register', { body: { name: 'Buyer A', email: `a${stamp}@example.com`, password: pw } });
  const A = r.cookie;
  r = await call('POST', '/auth/register', { body: { name: 'Buyer B', email: `b${stamp}@example.com`, password: pw } });
  const B = r.cookie;
  r = await call('POST', '/auth/login', { body: ADMIN });
  const ADM = r.cookie;
  check('setup: two customers + admin logged in', !!A && !!B && !!ADM, JSON.stringify(r.json));

  const burger = (await call('GET', '/products/classic-chicken-burger')).json.data;
  const fries = (await call('GET', '/products/french-fries')).json.data;
  const items = [{ product: burger._id, quantity: 2 }, { product: fries._id, quantity: 1 }];
  const sub = round2(burger.price * 2 + fries.price);

  // ---- quote / pricing ----
  r = await call('POST', '/orders/quote', { body: { items } });
  let e = expected(sub);
  check('quote: subtotal/tax/delivery/total match DB prices', r.status === 200 && r.json.data.subtotal === sub && r.json.data.tax === e.tax && r.json.data.deliveryFee === e.fee && r.json.data.total === e.total, JSON.stringify(r.json));

  r = await call('POST', '/orders/quote', { body: { items: [{ product: burger._id, quantity: 1 }, { product: burger._id, quantity: 1 }, { product: fries._id, quantity: 1 }] } });
  check('quote: duplicate lines are merged', r.status === 200 && r.json.data.items.length === 2 && r.json.data.items.find((i) => i.name === burger.name).quantity === 2);

  r = await call('POST', '/orders/quote', { body: { items: [{ product: burger._id, quantity: 2, price: 0.01, name: 'Hacked' }, { product: fries._id, quantity: 1 }], total: 0.01, subtotal: 0.01 } });
  check('tampered price/total from client is ignored', r.status === 200 && r.json.data.subtotal === sub && r.json.data.total === e.total, JSON.stringify(r.json));

  r = await call('POST', '/orders/quote', { body: { items, couponCode: 'welcome10' } });
  const disc = Math.min(round2(sub * 0.1), 5);
  e = expected(sub, disc);
  check('quote: WELCOME10 (lowercase input) discount + tax on discounted amount', r.status === 200 && r.json.data.discount === disc && r.json.data.total === e.total, JSON.stringify(r.json.data));

  r = await call('POST', '/orders/quote', { body: { items, couponCode: 'NOPE' } });
  check('quote: unknown coupon -> 422', r.status === 422 && r.json.errors?.[0]?.field === 'couponCode');
  r = await call('POST', '/orders/quote', { body: { items, couponCode: 'SAVE3' } });
  check('quote: SAVE3 below minimum order -> 422', sub < 15 ? r.status === 422 : r.status === 200, JSON.stringify(r.json));
  r = await call('POST', '/orders/quote', { body: { items: [{ product: burger._id, quantity: 20 }] } });
  check('quote: large order gets free delivery', r.status === 200 && r.json.data.deliveryFee === 0);
  r = await call('POST', '/orders/quote', { body: { items: [{ product: burger._id, quantity: 20 }], couponCode: 'SAVE3' } });
  check('quote: fixed coupon applies', r.status === 200 && r.json.data.discount === 3);

  for (const [label, body] of [['empty cart', { items: [] }], ['quantity 0', { items: [{ product: burger._id, quantity: 0 }] }], ['quantity 21', { items: [{ product: burger._id, quantity: 21 }] }], ['bad product id', { items: [{ product: 'abc', quantity: 1 }] }], ['fractional quantity', { items: [{ product: burger._id, quantity: 1.5 }] }]]) {
    r = await call('POST', '/orders/quote', { body });
    check(`quote validation: ${label} -> 422`, r.status === 422);
  }
  r = await call('POST', '/orders/quote', { body: { items: [{ product: '64b7f0f2a1b2c3d4e5f60718', quantity: 1 }] } });
  check('quote: nonexistent product -> 404', r.status === 404);

  // ---- stock guard ----
  const rings = await Product.findOne({ slug: 'onion-rings' });
  await Product.updateOne({ _id: rings._id }, { stock: 1 });
  r = await call('POST', '/orders', { cookie: A, body: { items: [{ product: rings._id, quantity: 2 }], deliveryAddress: ADDRESS } });
  check('order exceeding stock -> 409, nothing reserved', r.status === 409 && (await stockOf('onion-rings')) === 1, JSON.stringify(r.json));
  await Product.updateOne({ _id: rings._id }, { stock: rings.stock });

  // ---- create order ----
  r = await call('POST', '/orders', { body: { items, deliveryAddress: ADDRESS } });
  check('create order anonymous -> 401', r.status === 401);
  r = await call('POST', '/orders', { cookie: A, body: { items, deliveryAddress: { ...ADDRESS, phone: 'abc', postalCode: '!' } } });
  check('create order bad address -> 422 with field errors', r.status === 422 && r.json.errors.length >= 2);
  r = await call('POST', '/orders', { cookie: A, body: { items } });
  check('create order missing address -> 422', r.status === 422);

  const burgerStock = await stockOf('classic-chicken-burger');
  const friesStock = await stockOf('french-fries');
  const usedBefore = (await Coupon.findOne({ code: 'WELCOME10' })).usedCount;

  r = await call('POST', '/orders', { cookie: A, body: { items: [{ product: burger._id, quantity: 2, price: 0.01 }, { product: fries._id, quantity: 1 }], couponCode: 'WELCOME10', deliveryAddress: ADDRESS, total: 0.01 } });
  const order = r.json.data;
  check('create order -> 201, DB-priced total, Pending/unpaid', r.status === 201 && order.total === e.total && order.status === 'Pending' && order.payment.status === 'pending' && order.items.find((i) => i.name === burger.name).price === burger.price, JSON.stringify(r.json));
  check('stock reserved on creation', (await stockOf('classic-chicken-burger')) === burgerStock - 2 && (await stockOf('french-fries')) === friesStock - 1);
  check('coupon usage counted', (await Coupon.findOne({ code: 'WELCOME10' })).usedCount === usedBefore + 1);

  // ---- access control ----
  r = await call('GET', '/orders/my-orders', { cookie: A });
  check('my-orders lists own order + pagination', r.status === 200 && r.json.data.some((o) => o._id === order._id) && r.json.pagination.total >= 1);
  r = await call('GET', '/orders/my-orders', { cookie: B });
  check("other user's my-orders does not include it", r.status === 200 && !r.json.data.some((o) => o._id === order._id));
  r = await call('GET', '/orders/my-orders?status=Cancelled', { cookie: A });
  check('my-orders status filter', r.status === 200 && r.json.data.every((o) => o.status === 'Cancelled'));
  r = await call('GET', `/orders/${order._id}`, { cookie: A });
  check('owner can view order', r.status === 200 && r.json.data._id === order._id);
  r = await call('GET', `/orders/${order._id}`, { cookie: B });
  check("other customer cannot view order (404)", r.status === 404);
  r = await call('GET', `/orders/${order._id}`);
  check('anonymous cannot view order (401)', r.status === 401);
  r = await call('GET', `/orders/${order._id}`, { cookie: ADM });
  check('admin can view any order (with customer)', r.status === 200 && r.json.data.user?.name === 'Buyer A');
  r = await call('GET', '/orders/not-an-id', { cookie: A });
  check('malformed order id -> 422', r.status === 422);
  r = await call('PUT', `/orders/${order._id}/cancel`, { cookie: B });
  check("other customer cannot cancel (404)", r.status === 404);

  // ---- cancel ----
  r = await call('PUT', `/orders/${order._id}/cancel`, { cookie: A });
  check('owner cancels pending order', r.status === 200 && r.json.data.status === 'Cancelled');
  check('stock restored after cancel', (await stockOf('classic-chicken-burger')) === burgerStock && (await stockOf('french-fries')) === friesStock);
  check('coupon usage released after cancel', (await Coupon.findOne({ code: 'WELCOME10' })).usedCount === usedBefore);
  r = await call('PUT', `/orders/${order._id}/cancel`, { cookie: A });
  check('cancelling twice -> 409', r.status === 409);

  // paid orders cannot be self-cancelled
  r = await call('POST', '/orders', { cookie: A, body: { items: [{ product: fries._id, quantity: 1 }], deliveryAddress: ADDRESS } });
  const paidOrder = r.json.data;
  await Order.updateOne({ _id: paidOrder._id }, { 'payment.status': 'paid', status: 'Confirmed' });
  r = await call('PUT', `/orders/${paidOrder._id}/cancel`, { cookie: A });
  check('paid order cannot be self-cancelled -> 409', r.status === 409 && /paid/i.test(r.json.message), JSON.stringify(r.json));

  // ---- reviews ----
  const before = (await call('GET', `/products/${fries._id}`)).json.data;
  r = await call('POST', `/products/${fries._id}/reviews`, { body: { rating: 5 } });
  check('review anonymous -> 401', r.status === 401);
  r = await call('POST', `/products/${fries._id}/reviews`, { cookie: A, body: { rating: 5, comment: 'Great' } });
  check('review before delivery -> 403', r.status === 403);

  await Order.updateOne({ _id: paidOrder._id }, { status: 'Delivered' }); // admin status endpoint arrives in slice 5
  r = await call('POST', `/products/${fries._id}/reviews`, { cookie: B, body: { rating: 5 } });
  check('non-purchaser cannot review -> 403', r.status === 403);
  r = await call('POST', `/products/${fries._id}/reviews`, { cookie: A, body: { rating: 6 } });
  check('rating 6 -> 422', r.status === 422);
  r = await call('POST', `/products/${fries._id}/reviews`, { cookie: A, body: { rating: 5, comment: 'Crispy and hot!' } });
  const review = r.json.data;
  check('purchaser reviews delivered product -> 201', r.status === 201 && review.user.name === 'Buyer A');
  let after = (await call('GET', `/products/${fries._id}`)).json.data;
  check('product rating recalculated (count +1)', after.ratingCount === before.ratingCount + 1 && (before.ratingCount > 0 || after.ratingAverage === 5), JSON.stringify(after));
  r = await call('POST', `/products/${fries._id}/reviews`, { cookie: A, body: { rating: 4 } });
  check('second review by same user -> 409', r.status === 409);
  r = await call('GET', `/products/french-fries/reviews`);
  check('list reviews (by slug): includes it, no email leaked', r.status === 200 && r.json.data.some((x) => x._id === review._id) && !JSON.stringify(r.json).includes('@example.com') && r.json.summary.ratingCount === after.ratingCount);
  r = await call('PUT', `/reviews/${review._id}`, { cookie: B, body: { rating: 1 } });
  check("cannot edit someone else's review -> 403", r.status === 403);
  r = await call('PUT', `/reviews/${review._id}`, { cookie: A, body: { rating: 3, comment: 'Okay on reflection' } });
  check('owner edits review', r.status === 200 && r.json.data.rating === 3);
  after = (await call('GET', `/products/${fries._id}`)).json.data;
  check('rating recalculated after edit', before.ratingCount > 0 || after.ratingAverage === 3);
  r = await call('DELETE', `/reviews/${review._id}`, { cookie: B });
  check("cannot delete someone else's review -> 403", r.status === 403);
  r = await call('DELETE', `/reviews/${review._id}`, { cookie: A });
  check('owner deletes review', r.status === 200);
  after = (await call('GET', `/products/${fries._id}`)).json.data;
  check('rating restored after delete', after.ratingCount === before.ratingCount && after.ratingAverage === before.ratingAverage, JSON.stringify(after));

  // cleanup the extra order's stock reservation
  await Product.updateOne({ _id: fries._id }, { $inc: { stock: 1 } });

  console.log(`\n${passed} passed, ${failed} failed`);
  await mongoose.disconnect();
  process.exit(failed ? 1 : 0);
})().catch(async (e) => { console.error('Smoke test crashed (is the server running?):', e); await mongoose.disconnect(); process.exit(1); });
