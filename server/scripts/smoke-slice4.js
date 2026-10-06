// Usage (server running + seeded):
//   npm run smoke:payments --prefix server                     -> automated checks
//   npm run smoke:payments --prefix server -- --interactive    -> also pays once through the real PayPal Sandbox
const { paypal } = require('../config/env');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Order = require('../models/Order');
const Product = require('../models/Product');

const BASE = process.env.API_URL || `http://localhost:${process.env.PORT || 5000}/api`;
const INTERACTIVE = process.argv.includes('--interactive');
const ADDRESS = { fullName: 'Pay Tester', phone: '9876543210', address: '12 Test Street', city: 'Indore', state: 'MP', postalCode: '452001' };

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

(async () => {
  await connectDB();
  const stamp = Date.now();
  const pw = 'Smoke12345';
  const A = (await call('POST', '/auth/register', { body: { name: 'Payer A', email: `pa${stamp}@example.com`, password: pw } })).cookie;
  const B = (await call('POST', '/auth/register', { body: { name: 'Payer B', email: `pb${stamp}@example.com`, password: pw } })).cookie;
  const fries = (await call('GET', '/products/french-fries')).json.data;
  const mkOrder = async (cookie = A) => (await call('POST', '/orders', { cookie, body: { items: [{ product: fries._id, quantity: 1 }], deliveryAddress: ADDRESS } })).json.data;
  const stockCleanup = [];

  // ---- config ----
  let r = await call('GET', '/payments/config');
  const txt = JSON.stringify(r.json).toLowerCase();
  check('payments config is public and exposes no secret', r.status === 200 && r.json.data.provider === 'paypal' && !txt.includes('secret') && (r.json.data.enabled === (r.json.data.clientId !== null)), JSON.stringify(r.json));
  console.log(`      (PayPal credentials ${paypal.isConfigured ? 'FOUND' : 'NOT set'} on the server, environment: ${paypal.environment})`);

  // ---- auth / ownership / validation ----
  const order = await mkOrder(); stockCleanup.push(order);
  r = await call('POST', '/payments/paypal/create-order', { body: { orderId: order._id } });
  check('create-order anonymous -> 401', r.status === 401);
  r = await call('POST', '/payments/paypal/capture-order', { body: { orderId: order._id, paypalOrderId: 'ABCDE12345' } });
  check('capture-order anonymous -> 401', r.status === 401);
  r = await call('POST', '/payments/paypal/create-order', { cookie: A, body: { orderId: 'nope' } });
  check('create-order invalid id -> 422', r.status === 422);
  r = await call('POST', '/payments/paypal/capture-order', { cookie: A, body: { orderId: order._id, paypalOrderId: '<script>' } });
  check('capture-order invalid PayPal id -> 422', r.status === 422);
  r = await call('POST', '/payments/paypal/create-order', { cookie: B, body: { orderId: order._id } });
  check("cannot pay for someone else's order (404)", r.status === 404);
  r = await call('POST', '/payments/paypal/capture-order', { cookie: B, body: { orderId: order._id, paypalOrderId: 'ABCDE12345' } });
  check("cannot capture for someone else's order (404)", r.status === 404);
  r = await call('POST', '/payments/paypal/create-order', { cookie: A, body: { orderId: '64b7f0f2a1b2c3d4e5f60718' } });
  check('create-order for nonexistent order -> 404', r.status === 404);
  r = await call('POST', '/payments/paypal/capture-order', { cookie: A, body: { orderId: order._id, paypalOrderId: 'ABCDE12345' } });
  check('capture with no PayPal order started -> 409 (order stays unpaid)', r.status === 409);
  const unpaid = await Order.findById(order._id);
  check('order still Pending/unpaid after rejected capture', unpaid.status === 'Pending' && unpaid.payment.status === 'pending');

  // ---- not configured vs configured ----
  let paypalOrderId = null;
  if (!paypal.isConfigured) {
    r = await call('POST', '/payments/paypal/create-order', { cookie: A, body: { orderId: order._id } });
    check('create-order without PayPal credentials -> 503', r.status === 503, JSON.stringify(r.json));
    console.log('      Add PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET to .env and restart the server to run the PayPal checks.');
  } else {
    r = await call('POST', '/payments/paypal/create-order', { cookie: A, body: { orderId: order._id } });
    paypalOrderId = r.json.data && r.json.data.paypalOrderId;
    check('create-order -> PayPal order id returned', r.status === 200 && !!paypalOrderId, JSON.stringify(r.json));
    const approveUrl = r.json.data && r.json.data.approveUrl;
    const stored = await Order.findById(order._id);
    check('PayPal order id stored on our order', stored.payment.paypalOrderId === paypalOrderId && stored.payment.status === 'pending');
    r = await call('POST', '/payments/paypal/create-order', { cookie: A, body: { orderId: order._id } });
    check('create-order again reuses the same PayPal order (idempotent)', r.status === 200 && r.json.data.paypalOrderId === paypalOrderId, JSON.stringify(r.json));
    r = await call('POST', '/payments/paypal/capture-order', { cookie: A, body: { orderId: order._id, paypalOrderId: 'SOMEOTHER12345' } });
    check('capture with a different PayPal order id -> 409', r.status === 409);
    r = await call('POST', '/payments/paypal/capture-order', { cookie: A, body: { orderId: order._id, paypalOrderId } });
    check('capture BEFORE buyer approval is refused (409), order stays unpaid', r.status === 409 && (await Order.findById(order._id)).payment.status !== 'paid', JSON.stringify(r.json));

    if (INTERACTIVE) {
      console.log('\n=== INTERACTIVE SANDBOX PAYMENT ===');
      console.log('1. Open this URL:\n   ' + approveUrl);
      console.log('2. Log in with a PayPal SANDBOX BUYER account (developer.paypal.com > Testing Tools > Sandbox Accounts).');
      console.log('3. Approve the payment. The redirect afterwards may show an error page: that is fine, approval is done.');
      const rl = require('readline/promises').createInterface({ input: process.stdin, output: process.stdout });
      await rl.question('4. Press Enter here once you have approved... ');
      rl.close();

      const before = (await call('GET', '/products/french-fries')).json.data.soldCount;
      r = await call('POST', '/payments/paypal/capture-order', { cookie: A, body: { orderId: order._id, paypalOrderId } });
      const paid = r.json.data;
      check('capture after approval -> 200, order Confirmed + paid', r.status === 200 && paid.status === 'Confirmed' && paid.payment.status === 'paid', JSON.stringify(r.json));
      check('transaction id, amount and time stored', !!paid?.payment?.transactionId && paid.payment.amount === order.total && !!paid.payment.paidAt);
      check('soldCount increased', (await call('GET', '/products/french-fries')).json.data.soldCount === before + 1);
      r = await call('POST', '/payments/paypal/capture-order', { cookie: A, body: { orderId: order._id, paypalOrderId } });
      check('repeat capture is idempotent (200, not double-counted)', r.status === 200 && (await call('GET', '/products/french-fries')).json.data.soldCount === before + 1);
      r = await call('POST', '/payments/paypal/create-order', { cookie: A, body: { orderId: order._id } });
      check('create-order on paid order -> 409', r.status === 409);
      r = await call('PUT', `/orders/${order._id}/cancel`, { cookie: A });
      check('paid order cannot be self-cancelled -> 409', r.status === 409);
      stockCleanup.splice(stockCleanup.indexOf(order), 1); // paid order keeps its stock
    } else {
      console.log('      (Run with --interactive to complete a real Sandbox payment.)');
    }
  }

  // ---- cancelled / already-paid orders (state set directly in the DB) ----
  const cancelled = await mkOrder();
  await call('PUT', `/orders/${cancelled._id}/cancel`, { cookie: A });
  r = await call('POST', '/payments/paypal/create-order', { cookie: A, body: { orderId: cancelled._id } });
  check('cannot pay a cancelled order -> 409', r.status === 409);
  r = await call('POST', '/payments/paypal/capture-order', { cookie: A, body: { orderId: cancelled._id, paypalOrderId: 'ABCDE12345' } });
  check('cannot capture a cancelled order -> 409', r.status === 409);

  const fake = await mkOrder(); stockCleanup.push(fake);
  await Order.updateOne({ _id: fake._id }, { 'payment.status': 'paid', 'payment.paypalOrderId': `PAID${stamp}`, status: 'Confirmed' });
  r = await call('POST', '/payments/paypal/create-order', { cookie: A, body: { orderId: fake._id } });
  check('create-order on already-paid order -> 409', r.status === 409);
  r = await call('POST', '/payments/paypal/capture-order', { cookie: A, body: { orderId: fake._id, paypalOrderId: `PAID${stamp}` } });
  check('capture on already-paid order is idempotent -> 200', r.status === 200);
  r = await call('POST', '/payments/paypal/capture-order', { cookie: A, body: { orderId: fake._id, paypalOrderId: 'DIFFERENT12345' } });
  check('capture with different id on paid order -> 409', r.status === 409);

  // ---- cleanup: give back stock for orders that never got paid ----
  for (const o of stockCleanup) {
    const live = await Order.findById(o._id);
    if (live.status === 'Pending') await call('PUT', `/orders/${o._id}/cancel`, { cookie: A });
    else await Product.updateOne({ _id: fries._id }, { $inc: { stock: 1 } }); // the directly-marked "paid" test order
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  await mongoose.disconnect();
  process.exit(failed ? 1 : 0);
})().catch(async (e) => { console.error('Smoke test crashed (is the server running?):', e); await mongoose.disconnect(); process.exit(1); });
