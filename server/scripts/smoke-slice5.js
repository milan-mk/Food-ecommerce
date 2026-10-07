// Usage (server running + seeded):  npm run smoke:admin --prefix server
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Order = require('../models/Order');
const Coupon = require('../models/Coupon');
const Product = require('../models/Product');
const { round2 } = require('../utils/money');

const BASE = process.env.API_URL || `http://localhost:${process.env.PORT || 5000}/api`;
const ADMIN = { email: process.env.SEED_ADMIN_EMAIL || 'admin@example.com', password: process.env.SEED_ADMIN_PASSWORD || 'Admin@12345' };
const ADDRESS = { fullName: 'Admin Smoke', phone: '9876543210', address: '12 Test Street', city: 'Indore', state: 'MP', postalCode: '452001' };

let passed = 0, failed = 0;
const check = (name, ok, extra = '') => { ok ? passed++ : failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  -> ' + extra}`); };

async function call(method, path, { body, cookie } = {}) {
  const res = await fetch(BASE + path, { method, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const set = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json, cookie: set.length ? set[0].split(';')[0] : null };
}

(async () => {
  await connectDB();
  const stamp = Date.now();
  const pw = 'Smoke12345';
  const reg = await call('POST', '/auth/register', { body: { name: `Cust ${stamp}`, email: `cust${stamp}@example.com`, password: pw } });
  const C = reg.cookie, custId = reg.json.data.user._id;
  const ADM = (await call('POST', '/auth/login', { body: ADMIN })).cookie;
  const adminId = (await call('GET', '/auth/me', { cookie: ADM })).json.data.user._id;
  check('setup: admin + customer ready', !!C && !!ADM);

  // ---- access control ----
  for (const [m, p] of [['GET', '/admin/stats'], ['GET', '/admin/orders'], ['GET', '/admin/users'], ['GET', '/admin/inventory'], ['GET', '/admin/coupons']]) {
    let r = await call(m, p);
    check(`anonymous ${m} ${p} -> 401`, r.status === 401);
    r = await call(m, p, { cookie: C });
    check(`customer ${m} ${p} -> 403`, r.status === 403);
  }

  // ---- stats ----
  const fries = (await call('GET', '/products/french-fries')).json.data;
  const burger = (await call('GET', '/products/classic-chicken-burger')).json.data;
  let r = await call('GET', '/admin/stats?days=7', { cookie: ADM });
  const s0 = r.json.data;
  check('stats: shape + 7 zero-filled ascending days', r.status === 200 && s0.salesByDay.length === 7 && s0.salesByDay.every((d, i, a) => i === 0 || a[i - 1].date < d.date) && typeof s0.totals.sales === 'number' && Object.keys(s0.statusCounts).length === 6, JSON.stringify(r.json).slice(0, 300));
  check('stats: totals consistent with status counts', s0.totals.orders === Object.values(s0.statusCounts).reduce((a, b) => a + b, 0) && s0.totals.products >= 21 && s0.totals.customers >= 1);
  r = await call('GET', '/admin/stats?days=999', { cookie: ADM });
  check('stats: days > 90 -> 422', r.status === 422);

  // ---- orders: list/search/filter ----
  const mk = async (items, extra = {}) => (await call('POST', '/orders', { cookie: C, body: { items, deliveryAddress: ADDRESS, ...extra } })).json.data;
  const o1 = await mk([{ product: fries._id, quantity: 1 }]);
  const o2 = await mk([{ product: burger._id, quantity: 2 }], { couponCode: 'WELCOME10' }); // 2 x burger clears WELCOME10's minimum order
  check('setup: both test orders created', !!o1 && !!o2, 'order creation failed - check coupon minimum / stock');
  if (!o1 || !o2) { await mongoose.disconnect(); process.exit(1); }
  r = await call('GET', '/admin/orders?status=Pending&limit=50', { cookie: ADM });
  check('admin orders: status filter + customer populated', r.status === 200 && r.json.data.some((o) => o._id === o1._id) && r.json.data.every((o) => o.status === 'Pending') && r.json.data.find((o) => o._id === o1._id).user.email.startsWith('cust'));
  r = await call('GET', `/admin/orders?q=${o1._id}`, { cookie: ADM });
  check('admin orders: search by full order id', r.json.data.length === 1 && r.json.data[0]._id === o1._id);
  r = await call('GET', `/admin/orders?q=${o1._id.slice(-6)}`, { cookie: ADM });
  check('admin orders: search by last 6 chars of id', r.json.data.some((o) => o._id === o1._id), JSON.stringify(r.json.data.length));
  r = await call('GET', `/admin/orders?q=cust${stamp}`, { cookie: ADM });
  check('admin orders: search by customer email', r.json.data.length >= 2);
  r = await call('GET', '/admin/orders?q=Admin%20Smoke&paymentStatus=pending', { cookie: ADM });
  check('admin orders: search by delivery name + paymentStatus', r.json.data.length >= 2);
  const today = new Date().toISOString().slice(0, 10);
  r = await call('GET', `/admin/orders?from=${today}&to=${today}`, { cookie: ADM });
  check("admin orders: date range includes today's orders", r.json.data.some((o) => o._id === o1._id));
  r = await call('GET', '/admin/orders?status=Bogus', { cookie: ADM });
  check('admin orders: invalid status -> 422', r.status === 422);

  // ---- status transitions ----
  r = await call('PUT', `/admin/orders/${o1._id}/status`, { cookie: C, body: { status: 'Cancelled' } });
  check('customer cannot change order status -> 403', r.status === 403);
  r = await call('PUT', `/admin/orders/${o1._id}/status`, { cookie: ADM, body: { status: 'Bogus' } });
  check('invalid status value -> 422', r.status === 422);
  r = await call('PUT', `/admin/orders/${o1._id}/status`, { cookie: ADM, body: { status: 'Confirmed' } });
  check('cannot confirm an UNPAID order by hand -> 409', r.status === 409);
  r = await call('PUT', `/admin/orders/${o1._id}/status`, { cookie: ADM, body: { status: 'Delivered' } });
  check('cannot skip straight to Delivered -> 409', r.status === 409);

  const before = (await call('GET', '/admin/stats?days=7', { cookie: ADM })).json.data;
  const friesStock = (await call('GET', '/products/french-fries')).json.data.stock;
  const usedBefore = (await Coupon.findOne({ code: 'WELCOME10' })).usedCount;

  // admin-cancel an unpaid order: stock + coupon come back
  r = await call('PUT', `/admin/orders/${o2._id}/status`, { cookie: ADM, body: { status: 'Cancelled' } });
  check('admin cancels unpaid order (no refund needed)', r.status === 200 && r.json.data.status === 'Cancelled');
  check('coupon usage released by admin cancel', (await Coupon.findOne({ code: 'WELCOME10' })).usedCount === usedBefore - 1);
  r = await call('PUT', `/admin/orders/${o2._id}/status`, { cookie: ADM, body: { status: 'Cancelled' } });
  check('cancelling a cancelled order -> 409', r.status === 409);

  // simulate a paid order (real payment is covered by smoke:payments --interactive)
  await Order.updateOne({ _id: o1._id }, { 'payment.status': 'paid', 'payment.transactionId': `FAKECAP${stamp}`, 'payment.amount': o1.total, 'payment.paidAt': new Date(), status: 'Confirmed' });
  const after = (await call('GET', '/admin/stats?days=7', { cookie: ADM })).json.data;
  check('stats: sales rise by exactly the paid order total', round2(after.totals.sales - before.totals.sales) === o1.total, `${before.totals.sales} -> ${after.totals.sales}, order ${o1.total}`);
  check("stats: today's bucket includes it + activeOrders counted", after.salesByDay[6].revenue >= o1.total && after.activeOrders === before.activeOrders + 1);

  // refund failure must NOT cancel (fake capture id / PayPal unreachable or unconfigured)
  r = await call('PUT', `/admin/orders/${o1._id}/status`, { cookie: ADM, body: { status: 'Cancelled' } });
  const still = await Order.findById(o1._id);
  check('cancel of paid order with failing refund -> error, order UNCHANGED', [502, 503].includes(r.status) && still.status === 'Confirmed' && still.payment.status === 'paid', `${r.status} ${JSON.stringify(r.json)}`);
  check('stock NOT restored when refund failed', (await call('GET', '/products/french-fries')).json.data.stock === friesStock);
  r = await call('POST', `/admin/orders/${o1._id}/refund`, { cookie: ADM });
  check('refund endpoint refuses a normal (non-cancelled) paid order -> 409', r.status === 409);

  // happy fulfilment path
  for (const next of ['Preparing', 'Out for Delivery', 'Delivered']) {
    r = await call('PUT', `/admin/orders/${o1._id}/status`, { cookie: ADM, body: { status: next } });
    check(`paid order -> ${next}`, r.status === 200 && r.json.data.status === next, JSON.stringify(r.json));
  }
  r = await call('GET', `/orders/${o1._id}`, { cookie: C });
  check('customer sees the updated status', r.status === 200 && r.json.data.status === 'Delivered');
  r = await call('PUT', `/admin/orders/${o1._id}/status`, { cookie: ADM, body: { status: 'Cancelled' } });
  check('Delivered order cannot be cancelled -> 409', r.status === 409);

  // ---- users ----
  r = await call('GET', `/admin/users?q=cust${stamp}`, { cookie: ADM });
  check('users: search + no password leaked', r.status === 200 && r.json.data.length === 1 && !JSON.stringify(r.json).includes('"password"'));
  r = await call('GET', '/admin/users?role=admin', { cookie: ADM });
  check('users: role filter', r.json.data.length >= 1 && r.json.data.every((u) => u.role === 'admin'));
  r = await call('GET', `/admin/users/${custId}`, { cookie: ADM });
  check('user detail: order count + total spent (paid only)', r.status === 200 && r.json.data.stats.orders === 2 && r.json.data.stats.totalSpent === o1.total && r.json.data.recentOrders.length === 2, JSON.stringify(r.json.data.stats));
  r = await call('PUT', `/admin/users/${adminId}`, { cookie: ADM, body: { isActive: false } });
  check('admin cannot disable own account -> 409', r.status === 409);
  r = await call('PUT', `/admin/users/${adminId}`, { cookie: ADM, body: { role: 'customer' } });
  check('admin cannot demote self -> 409', r.status === 409);
  r = await call('PUT', `/admin/users/${custId}`, { cookie: ADM, body: { role: 'superuser' } });
  check('invalid role -> 422', r.status === 422);
  r = await call('PUT', `/admin/users/${custId}`, { cookie: ADM, body: { isActive: false } });
  check('admin disables a customer', r.status === 200 && r.json.data.isActive === false);
  r = await call('GET', '/auth/me', { cookie: C });
  check("disabled customer's existing session stops working (401)", r.status === 401);
  r = await call('POST', '/auth/login', { body: { email: `cust${stamp}@example.com`, password: pw } });
  check('disabled customer cannot log in (403)', r.status === 403);
  await call('PUT', `/admin/users/${custId}`, { cookie: ADM, body: { isActive: true } });
  r = await call('POST', '/auth/login', { body: { email: `cust${stamp}@example.com`, password: pw } });
  check('re-enabled customer can log in again', r.status === 200);

  // ---- inventory ----
  r = await call('GET', '/admin/inventory?filter=out', { cookie: ADM });
  check('inventory: out-of-stock filter', r.status === 200 && r.json.data.every((p) => p.stock === 0));
  r = await call('GET', '/admin/inventory?limit=5', { cookie: ADM });
  const stocks = r.json.data.map((p) => p.stock);
  check('inventory: sorted lowest stock first + paginated', r.status === 200 && stocks.every((v, i) => i === 0 || stocks[i - 1] <= v) && r.json.pagination.total >= 21);
  const orig = (await Product.findById(burger._id)).stock;
  r = await call('PUT', `/admin/inventory/${burger._id}`, { cookie: ADM, body: { adjust: 5 } });
  check('inventory: adjust +5', r.status === 200 && r.json.data.stock === orig + 5);
  r = await call('PUT', `/admin/inventory/${burger._id}`, { cookie: ADM, body: { adjust: -100000 } });
  check('inventory: cannot adjust below zero -> 409', r.status === 409 && (await Product.findById(burger._id)).stock === orig + 5);
  r = await call('PUT', `/admin/inventory/${burger._id}`, { cookie: ADM, body: { set: orig } });
  check('inventory: set absolute value', r.status === 200 && r.json.data.stock === orig);
  r = await call('PUT', `/admin/inventory/${burger._id}`, { cookie: ADM, body: { set: 5, adjust: 1 } });
  check('inventory: set + adjust together -> 422', r.status === 422);
  r = await call('PUT', `/admin/inventory/${burger._id}`, { cookie: ADM, body: { adjust: 0 } });
  check('inventory: adjust 0 -> 422', r.status === 422);
  r = await call('PUT', '/admin/inventory/64b7f0f2a1b2c3d4e5f60718', { cookie: ADM, body: { adjust: 1 } });
  check('inventory: unknown product -> 404', r.status === 404);

  // ---- coupons ----
  const future = new Date(Date.now() + 7 * 864e5).toISOString();
  const code = `SMOKE${String(stamp).slice(-6)}`;
  r = await call('POST', '/admin/coupons', { cookie: C, body: { code, discountType: 'fixed', discountValue: 2, expiresAt: future } });
  check('customer cannot create coupon -> 403', r.status === 403);
  r = await call('POST', '/admin/coupons', { cookie: ADM, body: { code: code.toLowerCase(), description: 'Smoke', discountType: 'percentage', discountValue: 20, minOrder: 5, maxDiscount: 4, expiresAt: future, usageLimit: 3 } });
  const cp = r.json.data;
  check('admin creates coupon (code uppercased)', r.status === 201 && cp.code === code, JSON.stringify(r.json));
  r = await call('POST', '/admin/coupons', { cookie: ADM, body: { code, discountType: 'fixed', discountValue: 1, expiresAt: future } });
  check('duplicate coupon code -> 409', r.status === 409);
  r = await call('POST', '/admin/coupons', { cookie: ADM, body: { code: 'BAD1', discountType: 'percentage', discountValue: 101, expiresAt: future } });
  check('percentage > 100 -> 422', r.status === 422);
  r = await call('POST', '/admin/coupons', { cookie: ADM, body: { code: 'OLD1', discountType: 'fixed', discountValue: 1, expiresAt: '2020-01-01' } });
  check('past expiry on create -> 422', r.status === 422);
  r = await call('POST', '/admin/coupons', { cookie: ADM, body: { code: 'a b', discountType: 'fixed', discountValue: 1, expiresAt: future } });
  check('invalid code characters -> 422', r.status === 422);
  r = await call('GET', '/coupons/active');
  check('public active list includes it, hides usage counters', r.status === 200 && r.json.data.some((c) => c.code === code) && !('usedCount' in r.json.data[0]));
  r = await call('POST', '/coupons/validate', { body: { code, items: [{ product: burger._id, quantity: 4 }] } });
  check('coupon validates and caps at maxDiscount', r.status === 200 && r.json.data.discount === 4, JSON.stringify(r.json));
  r = await call('PUT', `/admin/coupons/${cp._id}`, { cookie: ADM, body: { discountValue: 150 } });
  check('update to percentage 150 -> 422 (model re-check)', r.status === 422);
  r = await call('PUT', `/admin/coupons/${cp._id}`, { cookie: ADM, body: { isActive: false } });
  check('admin deactivates coupon', r.status === 200 && r.json.data.isActive === false);
  r = await call('GET', '/coupons/active');
  check('deactivated coupon disappears from public list', !r.json.data.some((c) => c.code === code));
  r = await call('GET', '/admin/coupons', { cookie: ADM });
  check('admin list shows computed state', r.json.data.find((c) => c.code === code).state === 'inactive');
  r = await call('POST', '/coupons/validate', { body: { code, items: [{ product: burger._id, quantity: 4 }] } });
  check('deactivated coupon rejected at checkout -> 422', r.status === 422);
  r = await call('DELETE', `/admin/coupons/${cp._id}`, { cookie: ADM });
  check('admin deletes coupon', r.status === 200);

  // cleanup: o1 was "paid" artificially and delivered, so give its stock back
  await Product.updateOne({ _id: fries._id }, { $inc: { stock: 1 } });

  console.log(`\n${passed} passed, ${failed} failed`);
  await mongoose.disconnect();
  process.exit(failed ? 1 : 0);
})().catch(async (e) => { console.error('Smoke test crashed (is the server running?):', e); await mongoose.disconnect(); process.exit(1); });
