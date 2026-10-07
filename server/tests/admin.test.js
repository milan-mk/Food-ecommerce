jest.mock('../services/payments/paypalProvider', () => require('./helpers/fakePaypal'));

const request = require('supertest');
const app = require('../app');
const fake = require('./helpers/fakePaypal');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const User = require('../models/User');
const db = require('./helpers/db');
const { makeUser, agentFor, seedCatalog, insertOrder, ADDRESS } = require('./helpers/factory');

let c, adminUser, admin, customer, customerAgent;
beforeAll(() => db.connect('admin'));
afterAll(() => db.close());
beforeEach(async () => {
  await db.clear();
  fake.reset();
  c = await seedCatalog();
  adminUser = await makeUser({ role: 'admin', name: 'Boss' });
  admin = await agentFor(adminUser);
  customer = await makeUser({ name: 'Cathy Customer' });
  customerAgent = await agentFor(customer);
});

const stockOf = async (p) => (await Product.findById(p._id)).stock;
const setStatus = (id, status, agent = admin) => agent.put(`/api/admin/orders/${id}/status`).send({ status });

describe('admin routes are locked down', () => {
  it.each([
    ['get', '/api/admin/stats'], ['get', '/api/admin/orders'], ['get', '/api/admin/users'],
    ['get', '/api/admin/inventory'], ['get', '/api/admin/coupons'],
  ])('%s %s -> 401 anonymous, 403 customer', async (method, url) => {
    expect((await request(app)[method](url)).status).toBe(401);
    expect((await customerAgent[method](url)).status).toBe(403);
  });
  it('customers cannot change order status, refund or edit users', async () => {
    const o = await insertOrder(customer, c.burger);
    expect((await setStatus(o._id, 'Preparing', customerAgent)).status).toBe(403);
    expect((await customerAgent.post(`/api/admin/orders/${o._id}/refund`)).status).toBe(403);
    expect((await customerAgent.put(`/api/admin/users/${customer._id}`).send({ role: 'admin' })).status).toBe(403);
  });
});

describe('GET /api/admin/stats', () => {
  it('reports totals, status counts, popular products and a zero-filled daily series', async () => {
    await insertOrder(customer, c.burger, { quantity: 2, status: 'Confirmed' });           // paid 11.98
    await insertOrder(customer, c.fries, { status: 'Delivered' });                         // paid 2.99
    await insertOrder(customer, c.fries, { status: 'Pending', paid: false });              // unpaid: not in sales
    const res = await admin.get('/api/admin/stats?days=7');
    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d.totals).toMatchObject({ orders: 3, sales: 14.97, paidOrders: 2, customers: 1, products: 6 });
    expect(d).toMatchObject({ pendingOrders: 1, activeOrders: 1, completedOrders: 1 });
    expect(d.statusCounts).toMatchObject({ Pending: 1, Confirmed: 1, Delivered: 1, Cancelled: 0 });
    expect(d.salesByDay).toHaveLength(7);
    expect(d.salesByDay[6]).toMatchObject({ revenue: 14.97, orders: 2 });
    expect(d.salesByDay[0]).toMatchObject({ revenue: 0, orders: 0 });
    expect(d.popularProducts[0].name).toBe('French Fries'); // soldCount 20
    expect(d.recentOrders).toHaveLength(3);
  });
  it('rejects an out-of-range window', async () => {
    expect((await admin.get('/api/admin/stats?days=999')).status).toBe(422);
  });
});

describe('GET /api/admin/orders', () => {
  it('filters by status and payment status, and populates the customer', async () => {
    const paid = await insertOrder(customer, c.burger);
    await insertOrder(customer, c.fries, { status: 'Pending', paid: false });
    const byStatus = await admin.get('/api/admin/orders?status=Pending');
    expect(byStatus.body.data).toHaveLength(1);
    const byPay = await admin.get('/api/admin/orders?paymentStatus=paid');
    expect(byPay.body.data.map((o) => o._id)).toEqual([String(paid._id)]);
    expect(byPay.body.data[0].user.email).toBe(customer.email);
    expect((await admin.get('/api/admin/orders?status=Bogus')).status).toBe(422);
  });
  it('searches by full id, by the last 6 characters, and by customer name', async () => {
    const o = await insertOrder(customer, c.burger);
    await insertOrder(await makeUser({ name: 'Someone Else' }), c.fries);
    expect((await admin.get(`/api/admin/orders?q=${o._id}`)).body.data).toHaveLength(1);
    expect((await admin.get(`/api/admin/orders?q=${String(o._id).slice(-6)}`)).body.data.map((x) => x._id)).toContain(String(o._id));
    expect((await admin.get('/api/admin/orders?q=Cathy')).body.data).toHaveLength(1);
  });
  it('filters by date range (inclusive of the end day) and paginates', async () => {
    await insertOrder(customer, c.burger);
    await insertOrder(customer, c.fries);
    const today = new Date().toISOString().slice(0, 10);
    expect((await admin.get(`/api/admin/orders?from=${today}&to=${today}`)).body.data).toHaveLength(2);
    expect((await admin.get('/api/admin/orders?from=2000-01-01&to=2000-01-02')).body.data).toHaveLength(0);
    const page = await admin.get('/api/admin/orders?limit=1&page=2');
    expect(page.body.pagination).toMatchObject({ total: 2, pages: 2 });
  });
});

describe('PUT /api/admin/orders/:id/status', () => {
  it('walks a paid order through the whole fulfilment path', async () => {
    const o = await insertOrder(customer, c.burger);
    for (const next of ['Preparing', 'Out for Delivery', 'Delivered']) {
      const res = await setStatus(o._id, next);
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(next);
    }
    const seen = await customerAgent.get(`/api/orders/${o._id}`);
    expect(seen.body.data.status).toBe('Delivered'); // the customer sees the update
  });

  it.each([
    ['skipping steps', 'Confirmed', 'Delivered'],
    ['going backwards', 'Preparing', 'Confirmed'],
    ['changing a final order', 'Delivered', 'Cancelled'],
    ['reopening a cancelled order', 'Cancelled', 'Preparing'],
  ])('rejects %s with 409', async (_l, from, to) => {
    const o = await insertOrder(customer, c.burger, { status: from });
    expect((await setStatus(o._id, to)).status).toBe(409);
    expect((await Order.findById(o._id)).status).toBe(from);
  });

  it('cannot confirm or advance an UNPAID order', async () => {
    const o = await insertOrder(customer, c.burger, { status: 'Pending', paid: false });
    expect((await setStatus(o._id, 'Confirmed')).status).toBe(409);
    expect((await setStatus(o._id, 'Preparing')).status).toBe(409);
  });

  it('rejects unknown statuses and unknown orders', async () => {
    const o = await insertOrder(customer, c.burger);
    expect((await setStatus(o._id, 'Bogus')).status).toBe(422);
    expect((await setStatus('64b7f0f2a1b2c3d4e5f60718', 'Preparing')).status).toBe(404);
  });

  it('cancelling an unpaid order restores stock and coupon usage, with no refund call', async () => {
    await Product.updateOne({ _id: c.burger._id }, { stock: 8 });
    await Coupon.updateOne({ code: 'WELCOME10' }, { usedCount: 1 });
    const o = await insertOrder(customer, c.burger, { quantity: 2, status: 'Pending', paid: false, couponCode: 'WELCOME10' });
    const res = await setStatus(o._id, 'Cancelled');
    expect(res.status).toBe(200);
    expect(await stockOf(c.burger)).toBe(10);
    expect((await Coupon.findOne({ code: 'WELCOME10' })).usedCount).toBe(0);
    expect(fake.state.refunds).toHaveLength(0);
  });

  it('cancelling a PAID order refunds it through PayPal, then restores stock and sales counts', async () => {
    await Product.updateOne({ _id: c.burger._id }, { stock: 8, soldCount: 7 });
    const o = await insertOrder(customer, c.burger, { quantity: 2 });
    const res = await setStatus(o._id, 'Cancelled');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('Cancelled');
    expect(res.body.data.payment).toMatchObject({ status: 'refunded', refundId: `REF-${o.payment.transactionId}` });
    expect(fake.state.refunds).toEqual([expect.objectContaining({ captureId: o.payment.transactionId, amount: 11.98, currency: 'USD' })]);
    expect(await stockOf(c.burger)).toBe(10);
    expect((await Product.findById(c.burger._id)).soldCount).toBe(5);
  });

  it('if the PayPal refund FAILS, the order is left exactly as it was', async () => {
    await Product.updateOne({ _id: c.burger._id }, { stock: 8 });
    const o = await insertOrder(customer, c.burger, { quantity: 2 });
    fake.state.refundFails = true;
    const res = await setStatus(o._id, 'Cancelled');
    expect(res.status).toBe(502);
    const after = await Order.findById(o._id);
    expect(after.status).toBe('Confirmed');
    expect(after.payment.status).toBe('paid');
    expect(await stockOf(c.burger)).toBe(8);
  });

  it('answers 503 and changes nothing when PayPal is not configured', async () => {
    const o = await insertOrder(customer, c.burger);
    fake.state.configured = false;
    expect((await setStatus(o._id, 'Cancelled')).status).toBe(503);
    expect((await Order.findById(o._id)).status).toBe('Confirmed');
  });

  it('treats "already refunded" at PayPal as success (safe retry)', async () => {
    const o = await insertOrder(customer, c.burger);
    fake.state.refunds.push({ captureId: o.payment.transactionId });
    const res = await setStatus(o._id, 'Cancelled');
    expect(res.status).toBe(200);
    expect(res.body.data.payment.status).toBe('refunded');
  });
});

describe('POST /api/admin/orders/:id/refund (paid after cancellation)', () => {
  it('refunds a cancelled order that is still marked paid', async () => {
    const o = await insertOrder(customer, c.burger, { status: 'Cancelled' });
    const res = await admin.post(`/api/admin/orders/${o._id}/refund`);
    expect(res.status).toBe(200);
    expect(res.body.data.payment.status).toBe('refunded');
    expect(fake.state.refunds).toHaveLength(1);
  });
  it('refuses normal paid orders (use cancel) and orders already refunded', async () => {
    const normal = await insertOrder(customer, c.burger);
    expect((await admin.post(`/api/admin/orders/${normal._id}/refund`)).status).toBe(409);
    const done = await insertOrder(customer, c.fries, { status: 'Cancelled' });
    await admin.post(`/api/admin/orders/${done._id}/refund`).expect(200);
    expect((await admin.post(`/api/admin/orders/${done._id}/refund`)).status).toBe(409);
  });
});

describe('admin users', () => {
  it('lists, searches and filters users without exposing passwords', async () => {
    const res = await admin.get('/api/admin/users?q=Cathy');
    expect(res.body.data).toHaveLength(1);
    expect(JSON.stringify(res.body)).not.toContain('"password"');
    expect((await admin.get('/api/admin/users?role=admin')).body.data).toHaveLength(1);
    expect((await admin.get('/api/admin/users?isActive=false')).body.data).toHaveLength(0);
  });
  it('shows order count and total spent (paid orders only) on the detail page', async () => {
    await insertOrder(customer, c.burger, { quantity: 2 });
    await insertOrder(customer, c.fries, { status: 'Pending', paid: false });
    const res = await admin.get(`/api/admin/users/${customer._id}`);
    expect(res.body.data.stats).toEqual({ orders: 2, totalSpent: 11.98 });
    expect(res.body.data.recentOrders).toHaveLength(2);
  });
  it('disabling a customer ends their session and blocks login; re-enabling restores access', async () => {
    await admin.put(`/api/admin/users/${customer._id}`).send({ isActive: false }).expect(200);
    expect((await customerAgent.get('/api/auth/me')).status).toBe(401);
    const login = await request(app).post('/api/auth/login').send({ email: customer.email, password: 'Passw0rd1' });
    expect(login.status).toBe(403);
    await admin.put(`/api/admin/users/${customer._id}`).send({ isActive: true }).expect(200);
    expect((await request(app).post('/api/auth/login').send({ email: customer.email, password: 'Passw0rd1' })).status).toBe(200);
  });
  it('admins cannot change their own role or status, and invalid roles are rejected', async () => {
    expect((await admin.put(`/api/admin/users/${adminUser._id}`).send({ isActive: false })).status).toBe(409);
    expect((await admin.put(`/api/admin/users/${adminUser._id}`).send({ role: 'customer' })).status).toBe(409);
    expect((await admin.put(`/api/admin/users/${customer._id}`).send({ role: 'superuser' })).status).toBe(422);
    expect((await admin.put(`/api/admin/users/${customer._id}`).send({})).status).toBe(422);
    expect((await User.findById(adminUser._id)).role).toBe('admin');
  });
  it('cannot edit fields other than isActive/role (e.g. email, password)', async () => {
    await admin.put(`/api/admin/users/${customer._id}`).send({ isActive: true, email: 'evil@example.com', password: 'Hacked123' }).expect(200);
    expect((await User.findById(customer._id)).email).toBe(customer.email);
  });
});

describe('admin inventory', () => {
  it('lists lowest stock first and supports out-of-stock / low-stock views', async () => {
    const all = await admin.get('/api/admin/inventory');
    expect(all.body.data[0].name).toBe('Onion Rings'); // stock 0
    expect((await admin.get('/api/admin/inventory?filter=out')).body.data.map((p) => p.name)).toEqual(['Onion Rings']);
    expect((await admin.get('/api/admin/inventory?filter=low&threshold=5')).body.data.map((p) => p.name)).toEqual(['Cheese Pizza']);
  });
  it('adjusts atomically, sets absolute values, and validates input', async () => {
    expect((await admin.put(`/api/admin/inventory/${c.burger._id}`).send({ adjust: 5 })).body.data.stock).toBe(15);
    expect((await admin.put(`/api/admin/inventory/${c.burger._id}`).send({ set: 3 })).body.data.stock).toBe(3);
    expect((await admin.put(`/api/admin/inventory/${c.burger._id}`).send({ adjust: -100 })).status).toBe(409);
    expect(await stockOf(c.burger)).toBe(3);
    expect((await admin.put(`/api/admin/inventory/${c.burger._id}`).send({ set: 5, adjust: 1 })).status).toBe(422);
    expect((await admin.put(`/api/admin/inventory/${c.burger._id}`).send({ adjust: 0 })).status).toBe(422);
    expect((await admin.put('/api/admin/inventory/64b7f0f2a1b2c3d4e5f60718').send({ adjust: 1 })).status).toBe(404);
  });
  it('never lets concurrent removals push stock below zero', async () => {
    await Product.updateOne({ _id: c.burger._id }, { stock: 2 });
    const results = await Promise.all([1, 2, 3].map(() => admin.put(`/api/admin/inventory/${c.burger._id}`).send({ adjust: -1 })));
    expect(results.map((r) => r.status).sort()).toEqual([200, 200, 409]);
    expect(await stockOf(c.burger)).toBe(0);
  });
});

describe('admin coupons', () => {
  const future = () => new Date(Date.now() + 7 * 864e5).toISOString();
  const body = (o = {}) => ({ code: 'summer20', description: 'Summer', discountType: 'percentage', discountValue: 20, minOrder: 5, maxDiscount: 4, expiresAt: future(), usageLimit: 3, ...o });

  it('creates a coupon (code upper-cased) and rejects duplicates', async () => {
    const res = await admin.post('/api/admin/coupons').send(body());
    expect(res.status).toBe(201);
    expect(res.body.data.code).toBe('SUMMER20');
    expect((await admin.post('/api/admin/coupons').send(body())).status).toBe(409);
  });
  it.each([
    ['percentage above 100', { discountValue: 101 }],
    ['expiry in the past', { expiresAt: '2020-01-01' }],
    ['invalid code characters', { code: 'a b' }],
    ['zero discount', { discountValue: 0 }],
  ])('rejects %s with 422', async (_l, patch) => {
    expect((await admin.post('/api/admin/coupons').send(body(patch))).status).toBe(422);
  });
  it('updates, re-checks the percentage limit, and cannot edit usage counters', async () => {
    const id = (await admin.post('/api/admin/coupons').send(body())).body.data._id;
    expect((await admin.put(`/api/admin/coupons/${id}`).send({ discountValue: 150 })).status).toBe(422);
    await admin.put(`/api/admin/coupons/${id}`).send({ description: 'Updated', usedCount: 99 }).expect(200);
    const stored = await Coupon.findById(id);
    expect(stored.description).toBe('Updated');
    expect(stored.usedCount).toBe(0);
  });
  it('shows computed states and only publishes usable coupons on the public list', async () => {
    const list = (await admin.get('/api/admin/coupons')).body.data;
    const state = (code) => list.find((x) => x.code === code).state;
    expect([state('WELCOME10'), state('OLDCODE'), state('USEDUP')]).toEqual(['active', 'expired', 'exhausted']);
    const res = await request(app).get('/api/coupons/active');
    expect(res.body.data.map((x) => x.code).sort()).toEqual(['SAVE3', 'WELCOME10']);
    expect(JSON.stringify(res.body)).not.toContain('usedCount');
  });
  it('a deactivated coupon disappears from the public list and fails at checkout; delete works', async () => {
    const coupon = await Coupon.findOne({ code: 'SAVE3' });
    await admin.put(`/api/admin/coupons/${coupon._id}`).send({ isActive: false }).expect(200);
    expect((await request(app).get('/api/coupons/active')).body.data.map((x) => x.code)).not.toContain('SAVE3');
    const quote = await request(app).post('/api/coupons/validate').send({ code: 'SAVE3', items: [{ product: String(c.platter._id), quantity: 1 }] });
    expect(quote.status).toBe(422);
    expect((await admin.delete(`/api/admin/coupons/${coupon._id}`)).status).toBe(200);
    expect(await Coupon.findById(coupon._id)).toBeNull();
  });
});
