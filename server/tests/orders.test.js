const request = require('supertest');
const app = require('../app');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const Review = require('../models/Review');
const db = require('./helpers/db');
const { makeUser, agentFor, seedCatalog, insertOrder, ADDRESS } = require('./helpers/factory');

let c, user, buyer, other, admin;
beforeAll(() => db.connect('orders'));
afterAll(() => db.close());
beforeEach(async () => {
  await db.clear();
  c = await seedCatalog();
  user = await makeUser();
  buyer = await agentFor(user);
  other = await agentFor(await makeUser());
  admin = await agentFor(await makeUser({ role: 'admin' }));
});

const line = (p, quantity) => ({ product: String(p._id), quantity });
const cart = () => [line(c.burger, 2), line(c.fries, 1)]; // 11.98 + 2.99 = 14.97
const place = (agent, items = cart(), extra = {}) => agent.post('/api/orders').send({ items, deliveryAddress: ADDRESS, ...extra });
const stockOf = async (p) => (await Product.findById(p._id)).stock;

describe('POST /api/orders/quote (server-side pricing)', () => {
  it('prices from database values: subtotal, tax, delivery, total', async () => {
    const res = await request(app).post('/api/orders/quote').send({ items: cart() });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ subtotal: 14.97, discount: 0, tax: 0.75, deliveryFee: 2.99, total: 18.71 });
  });

  it('ignores any price, name or total sent by the client', async () => {
    const res = await request(app).post('/api/orders/quote').send({
      items: [{ product: String(c.burger._id), quantity: 2, price: 0.01, name: 'Hacked' }, line(c.fries, 1)], total: 0.01, subtotal: 0.01,
    });
    expect(res.body.data.subtotal).toBe(14.97);
    expect(res.body.data.total).toBe(18.71);
    expect(res.body.data.items.map((i) => i.name)).toContain('Classic Burger');
  });

  it('merges duplicate lines', async () => {
    const res = await request(app).post('/api/orders/quote').send({ items: [line(c.burger, 1), line(c.burger, 1), line(c.fries, 1)] });
    expect(res.body.data.items).toHaveLength(2);
    expect(res.body.data.items.find((i) => i.name === 'Classic Burger').quantity).toBe(2);
  });

  it('applies a coupon (case-insensitive) and charges tax on the discounted amount', async () => {
    const res = await request(app).post('/api/orders/quote').send({ items: cart(), couponCode: 'welcome10' });
    expect(res.body.data).toMatchObject({ discount: 1.5, tax: 0.67, total: 17.13, couponCode: 'WELCOME10' });
  });

  it('caps a percentage coupon at its maximum discount', async () => {
    const res = await request(app).post('/api/orders/quote').send({ items: [line(c.platter, 3)], couponCode: 'WELCOME10' }); // 10% of 75 = 7.5, cap 5
    expect(res.body.data.discount).toBe(5);
  });

  it('gives free delivery from the threshold', async () => {
    const res = await request(app).post('/api/orders/quote').send({ items: [line(c.platter, 2)] }); // 50
    expect(res.body.data).toMatchObject({ subtotal: 50, deliveryFee: 0, tax: 2.5, total: 52.5 });
  });

  it.each([
    ['unknown code', 'NOPE'],
    ['expired code', 'OLDCODE'],
    ['used-up code', 'USEDUP'],
    ['order below the minimum', 'SAVE3'], // needs 15, cart is 14.97
  ])('rejects a coupon: %s -> 422 on couponCode', async (_l, code) => {
    const res = await request(app).post('/api/orders/quote').send({ items: cart(), couponCode: code });
    expect(res.status).toBe(422);
    expect(res.body.errors[0].field).toBe('couponCode');
  });

  it.each([
    ['empty cart', { items: [] }],
    ['quantity 0', { items: [{ product: '64b7f0f2a1b2c3d4e5f60718', quantity: 0 }] }],
    ['quantity above 20', { items: [{ product: '64b7f0f2a1b2c3d4e5f60718', quantity: 21 }] }],
    ['fractional quantity', { items: [{ product: '64b7f0f2a1b2c3d4e5f60718', quantity: 1.5 }] }],
    ['malformed product id', { items: [{ product: 'abc', quantity: 1 }] }],
  ])('validates input: %s -> 422', async (_l, body) => {
    expect((await request(app).post('/api/orders/quote').send(body)).status).toBe(422);
  });

  it('404 for a product that does not exist; 409 for hidden, out-of-stock or over-stock items', async () => {
    expect((await request(app).post('/api/orders/quote').send({ items: [{ product: '64b7f0f2a1b2c3d4e5f60718', quantity: 1 }] })).status).toBe(404);
    expect((await request(app).post('/api/orders/quote').send({ items: [line(c.hidden, 1)] })).status).toBe(409);
    expect((await request(app).post('/api/orders/quote').send({ items: [line(c.rings, 1)] })).status).toBe(409);
    expect((await request(app).post('/api/orders/quote').send({ items: [line(c.cheesePizza, 6)] })).status).toBe(409); // only 5 in stock
  });
});

describe('POST /api/orders', () => {
  it('requires login', async () => {
    expect((await request(app).post('/api/orders').send({ items: cart(), deliveryAddress: ADDRESS })).status).toBe(401);
  });

  it.each([
    ['missing address', undefined],
    ['bad phone and postal code', { ...ADDRESS, phone: 'abc', postalCode: '!' }],
    ['missing city', { ...ADDRESS, city: '' }],
  ])('validates the delivery address: %s -> 422', async (_l, addr) => {
    const res = await buyer.post('/api/orders').send({ items: cart(), ...(addr ? { deliveryAddress: addr } : {}) });
    expect(res.status).toBe(422);
  });

  it('creates a Pending, unpaid order priced from the database and reserves stock', async () => {
    const res = await place(buyer, [{ product: String(c.burger._id), quantity: 2, price: 0.01 }, line(c.fries, 1)], { total: 0.01 });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ subtotal: 14.97, total: 18.71, status: 'Pending', currency: 'USD' });
    expect(res.body.data.payment.status).toBe('pending');
    expect(String(res.body.data.user)).toBe(String(user._id));
    expect(res.body.data.items.find((i) => i.name === 'Classic Burger').price).toBe(5.99);
    expect(await stockOf(c.burger)).toBe(8);
    expect(await stockOf(c.fries)).toBe(9);
  });

  it('counts coupon usage', async () => {
    await place(buyer, cart(), { couponCode: 'WELCOME10' });
    expect((await Coupon.findOne({ code: 'WELCOME10' })).usedCount).toBe(1);
  });

  it('refuses over-stock orders and reserves nothing', async () => {
    const res = await place(buyer, [line(c.fries, 1), line(c.cheesePizza, 6)]);
    expect(res.status).toBe(409);
    expect(await stockOf(c.fries)).toBe(10);
    expect(await stockOf(c.cheesePizza)).toBe(5);
    expect(await Order.countDocuments()).toBe(0);
  });

  it('lets exactly one of two simultaneous buyers take the last unit', async () => {
    await Product.updateOne({ _id: c.burger._id }, { stock: 1 });
    const results = await Promise.all([place(buyer, [line(c.burger, 1)]), place(other, [line(c.burger, 1)])]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await stockOf(c.burger)).toBe(0);
    expect(await Order.countDocuments()).toBe(1);
  });

  it('does not oversell a coupon limited to one use when used twice at once', async () => {
    await Coupon.updateOne({ code: 'SAVE3' }, { usageLimit: 1, usedCount: 0 });
    const items = [line(c.platter, 1)]; // 25, clears the minimum
    const results = await Promise.all([place(buyer, items, { couponCode: 'SAVE3' }), place(other, items, { couponCode: 'SAVE3' })]);
    const statuses = results.map((r) => r.status).sort();
    expect(statuses[0]).toBe(201);
    expect([409, 422]).toContain(statuses[1]);
    expect((await Coupon.findOne({ code: 'SAVE3' })).usedCount).toBe(1);
    expect(await stockOf(c.platter)).toBe(9); // the losing order gave its stock back
  });
});

describe('order access control', () => {
  it('my-orders lists only my orders, newest first, paginated', async () => {
    const mine1 = (await place(buyer)).body.data;
    const mine2 = (await place(buyer, [line(c.fries, 1)])).body.data;
    await place(other, [line(c.fries, 1)]);
    const res = await buyer.get('/api/orders/my-orders?limit=1');
    expect(res.status).toBe(200);
    expect(res.body.pagination).toMatchObject({ total: 2, pages: 2 });
    expect(res.body.data[0]._id).toBe(mine2._id);
    const all = await buyer.get('/api/orders/my-orders');
    expect(all.body.data.map((o) => o._id)).toEqual([mine2._id, mine1._id]);
    expect((await request(app).get('/api/orders/my-orders')).status).toBe(401);
  });

  it('the owner and an admin can view an order; other customers get 404; anonymous 401', async () => {
    const order = (await place(buyer)).body.data;
    expect((await buyer.get(`/api/orders/${order._id}`)).status).toBe(200);
    expect((await other.get(`/api/orders/${order._id}`)).status).toBe(404);
    expect((await request(app).get(`/api/orders/${order._id}`)).status).toBe(401);
    const asAdmin = await admin.get(`/api/orders/${order._id}`);
    expect(asAdmin.status).toBe(200);
    expect(asAdmin.body.data.user.email).toBe(user.email);
  });

  it('rejects a malformed order id with 422', async () => {
    expect((await buyer.get('/api/orders/not-an-id')).status).toBe(422);
  });
});

describe('PUT /api/orders/:id/cancel', () => {
  it('cancels an unpaid order and gives back stock and coupon usage', async () => {
    const order = (await place(buyer, cart(), { couponCode: 'WELCOME10' })).body.data;
    const res = await buyer.put(`/api/orders/${order._id}/cancel`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('Cancelled');
    expect(await stockOf(c.burger)).toBe(10);
    expect(await stockOf(c.fries)).toBe(10);
    expect((await Coupon.findOne({ code: 'WELCOME10' })).usedCount).toBe(0);
  });

  it("cannot cancel someone else's order (404) or cancel twice (409)", async () => {
    const order = (await place(buyer)).body.data;
    expect((await other.put(`/api/orders/${order._id}/cancel`)).status).toBe(404);
    await buyer.put(`/api/orders/${order._id}/cancel`).expect(200);
    expect((await buyer.put(`/api/orders/${order._id}/cancel`)).status).toBe(409);
    expect(await stockOf(c.burger)).toBe(10); // the second attempt did not restore stock again
  });

  it('refuses to self-cancel a paid order (needs a refund) and leaves it untouched', async () => {
    const order = await insertOrder(user, c.burger, { status: 'Confirmed', paid: true });
    const res = await buyer.put(`/api/orders/${order._id}/cancel`);
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/paid/i);
    expect((await Order.findById(order._id)).status).toBe('Confirmed');
  });
});

describe('reviews', () => {
  const review = (agent, product, body) => agent.post(`/api/products/${product._id}/reviews`).send(body);
  const ratingOf = async (p) => { const x = await Product.findById(p._id); return [x.ratingAverage, x.ratingCount]; };

  it('requires login, and a delivered order containing the product', async () => {
    expect((await request(app).post(`/api/products/${c.burger._id}/reviews`).send({ rating: 5 })).status).toBe(401);
    expect((await review(buyer, c.burger, { rating: 5 })).status).toBe(403);                   // never ordered
    await insertOrder(user, c.burger, { status: 'Confirmed' });
    expect((await review(buyer, c.burger, { rating: 5 })).status).toBe(403);                   // not delivered yet
    await insertOrder(user, c.burger, { status: 'Delivered' });
    expect((await review(other, c.burger, { rating: 5 })).status).toBe(403);                   // someone else's purchase
    expect((await review(buyer, c.burger, { rating: 5, comment: 'Great' })).status).toBe(201);
  });

  it('validates rating 1-5 and allows one review per user per product', async () => {
    await insertOrder(user, c.burger, { status: 'Delivered' });
    expect((await review(buyer, c.burger, { rating: 6 })).status).toBe(422);
    expect((await review(buyer, c.burger, { rating: 0 })).status).toBe(422);
    expect((await review(buyer, c.burger, { rating: 4 })).status).toBe(201);
    expect((await review(buyer, c.burger, { rating: 5 })).status).toBe(409);
  });

  it('keeps the product rating in sync on create, edit and delete', async () => {
    const second = await makeUser();
    const secondAgent = await agentFor(second);
    await insertOrder(user, c.burger, { status: 'Delivered' });
    await insertOrder(second, c.burger, { status: 'Delivered' });
    const r1 = (await review(buyer, c.burger, { rating: 5 })).body.data;
    await review(secondAgent, c.burger, { rating: 2 });
    expect(await ratingOf(c.burger)).toEqual([3.5, 2]);
    await buyer.put(`/api/reviews/${r1._id}`).send({ rating: 4 }).expect(200);
    expect(await ratingOf(c.burger)).toEqual([3, 2]);
    await buyer.delete(`/api/reviews/${r1._id}`).expect(200);
    expect(await ratingOf(c.burger)).toEqual([2, 1]);
  });

  it('only the author can edit; the author or an admin can delete', async () => {
    await insertOrder(user, c.burger, { status: 'Delivered' });
    const r = (await review(buyer, c.burger, { rating: 3 })).body.data;
    expect((await other.put(`/api/reviews/${r._id}`).send({ rating: 1 })).status).toBe(403);
    expect((await other.delete(`/api/reviews/${r._id}`)).status).toBe(403);
    expect((await admin.put(`/api/reviews/${r._id}`).send({ rating: 1 })).status).toBe(403);
    expect((await admin.delete(`/api/reviews/${r._id}`)).status).toBe(200);
    expect(await Review.countDocuments()).toBe(0);
  });

  it('lists reviews publicly (by id or slug) with the author name but never the email', async () => {
    await insertOrder(user, c.burger, { status: 'Delivered' });
    await review(buyer, c.burger, { rating: 5, comment: 'Loved it' });
    const res = await request(app).get('/api/products/classic-burger/reviews');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].user.name).toBe('Test User');
    expect(JSON.stringify(res.body)).not.toContain('@example.com');
    expect(res.body.summary).toEqual({ ratingAverage: 5, ratingCount: 1 });
  });
});
