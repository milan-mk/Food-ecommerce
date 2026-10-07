// PayPal is replaced by an in-memory fake (tests/helpers/fakePaypal.js), so no network or credentials are used.
jest.mock('../services/payments/paypalProvider', () => require('./helpers/fakePaypal'));

const request = require('supertest');
const app = require('../app');
const fake = require('./helpers/fakePaypal');
const Order = require('../models/Order');
const Product = require('../models/Product');
const db = require('./helpers/db');
const { makeUser, agentFor, seedCatalog, ADDRESS } = require('./helpers/factory');

let c, user, buyer, other, order;
beforeAll(() => db.connect('payments'));
afterAll(() => db.close());
beforeEach(async () => {
  await db.clear();
  fake.reset();
  c = await seedCatalog();
  user = await makeUser();
  buyer = await agentFor(user);
  other = await agentFor(await makeUser());
  const res = await buyer.post('/api/orders').send({ items: [{ product: String(c.burger._id), quantity: 2 }, { product: String(c.fries._id), quantity: 1 }], deliveryAddress: ADDRESS });
  order = res.body.data; // total 18.71
});

const createPayment = (agent = buyer, orderId = order._id) => agent.post('/api/payments/paypal/create-order').send({ orderId });
const capture = (paypalOrderId, agent = buyer, orderId = order._id) => agent.post('/api/payments/paypal/capture-order').send({ orderId, paypalOrderId });
const fresh = () => Order.findById(order._id);
const sold = async () => (await Product.findById(c.burger._id)).soldCount;

describe('GET /api/payments/config', () => {
  it('is public and never exposes the secret', async () => {
    const res = await request(app).get('/api/payments/config');
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ provider: 'paypal', enabled: true, clientId: 'test-client-id', environment: 'sandbox', currency: 'USD' });
    expect(JSON.stringify(res.body)).not.toContain('test-client-secret');
  });
});

describe('POST /api/payments/paypal/create-order', () => {
  it('requires login and validates the order id', async () => {
    expect((await request(app).post('/api/payments/paypal/create-order').send({ orderId: order._id })).status).toBe(401);
    expect((await buyer.post('/api/payments/paypal/create-order').send({ orderId: 'nope' })).status).toBe(422);
  });

  it("cannot start payment for someone else's order or a missing one (404)", async () => {
    expect((await createPayment(other)).status).toBe(404);
    expect((await createPayment(buyer, '64b7f0f2a1b2c3d4e5f60718')).status).toBe(404);
  });

  it('creates a PayPal order for OUR total and stores its id on the order', async () => {
    const res = await createPayment();
    expect(res.status).toBe(200);
    const id = res.body.data.paypalOrderId;
    expect(fake.state.orders.get(id)).toMatchObject({ amount: 18.71, currency: 'USD', orderId: String(order._id) });
    const stored = await fresh();
    expect(stored.payment).toMatchObject({ paypalOrderId: id, status: 'pending' });
  });

  it('reuses the same PayPal order while it is still valid, and makes a new one once it expired', async () => {
    const first = (await createPayment()).body.data.paypalOrderId;
    expect((await createPayment()).body.data.paypalOrderId).toBe(first);
    fake.expire(first);
    const next = (await createPayment()).body.data.paypalOrderId;
    expect(next).not.toBe(first);
    expect((await fresh()).payment.paypalOrderId).toBe(next);
  });

  it('answers 503 when PayPal credentials are not configured', async () => {
    fake.state.configured = false;
    expect((await createPayment()).status).toBe(503);
  });

  it('refuses cancelled and already-paid orders (409)', async () => {
    await buyer.put(`/api/orders/${order._id}/cancel`).expect(200);
    expect((await createPayment()).status).toBe(409);
    await Order.updateOne({ _id: order._id }, { status: 'Confirmed', 'payment.status': 'paid' });
    expect((await createPayment()).status).toBe(409);
  });
});

describe('POST /api/payments/paypal/capture-order', () => {
  it('requires login, valid ids and ownership', async () => {
    const id = (await createPayment()).body.data.paypalOrderId;
    expect((await request(app).post('/api/payments/paypal/capture-order').send({ orderId: order._id, paypalOrderId: id })).status).toBe(401);
    expect((await capture('<script>')).status).toBe(422);
    expect((await capture(id, other)).status).toBe(404);
  });

  it('completes the full flow: approve -> capture -> order Confirmed and paid', async () => {
    const id = (await createPayment()).body.data.paypalOrderId;
    fake.approve(id);
    const res = await capture(id);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ status: 'Confirmed' });
    expect(res.body.data.payment).toMatchObject({ status: 'paid', transactionId: `CAP-${id}`, amount: 18.71 });
    expect(res.body.data.payment.paidAt).toBeTruthy();
    expect(await sold()).toBe(7); // 5 + 2 bought
  });

  it('refuses to capture before the buyer approved, and the order stays unpaid', async () => {
    const id = (await createPayment()).body.data.paypalOrderId;
    const res = await capture(id);
    expect(res.status).toBe(409);
    const o = await fresh();
    expect(o.status).toBe('Pending');
    expect(o.payment.status).toBe('pending');
  });

  it('refuses a PayPal order id that was not created for this order', async () => {
    await createPayment();
    expect((await capture('SOMEOTHERID123')).status).toBe(409);
    expect((await fresh()).payment.status).toBe('pending');
  });

  it('refuses when no payment was started at all', async () => {
    expect((await capture('FAKEPP99999')).status).toBe(409);
  });

  it('never marks the order paid if PayPal captured a different amount (tampering)', async () => {
    const id = (await createPayment()).body.data.paypalOrderId;
    fake.approve(id);
    fake.state.captureValueOverride = '0.01';
    const res = await capture(id);
    expect(res.status).toBe(409);
    const o = await fresh();
    expect(o.status).toBe('Pending');
    expect(o.payment.status).toBe('failed');
    expect(o.payment.failureReason).toMatch(/Amount mismatch/);
    expect(await sold()).toBe(5);
  });

  it('handles a declined card: 402, payment marked failed, and the buyer can try again', async () => {
    const id = (await createPayment()).body.data.paypalOrderId;
    fake.approve(id);
    fake.state.declineNext = true;
    expect((await capture(id)).status).toBe(402);
    expect((await fresh()).payment.status).toBe('failed');

    const retry = (await createPayment()).body.data.paypalOrderId; // failed payments may be restarted
    expect(retry).toBe(id);                                          // PayPal lets the buyer retry the same order
    expect((await fresh()).payment.status).toBe('pending');
    fake.approve(retry);
    expect((await capture(retry)).status).toBe(200);
    expect((await fresh()).payment.status).toBe('paid');
  });

  it('is idempotent: repeating a successful capture changes nothing and counts sales once', async () => {
    const id = (await createPayment()).body.data.paypalOrderId;
    fake.approve(id);
    await capture(id).expect(200);
    const again = await capture(id);
    expect(again.status).toBe(200);
    expect(again.body.message).toMatch(/already/i);
    expect(await sold()).toBe(7);
  });

  it('survives two simultaneous capture requests (double click): paid once, counted once', async () => {
    const id = (await createPayment()).body.data.paypalOrderId;
    fake.approve(id);
    const [a, b] = await Promise.all([capture(id), capture(id)]);
    expect([a.status, b.status]).toEqual([200, 200]);
    expect((await fresh()).payment.status).toBe('paid');
    expect(await sold()).toBe(7);
  });

  it('refuses to capture a cancelled order', async () => {
    const id = (await createPayment()).body.data.paypalOrderId;
    fake.approve(id);
    await buyer.put(`/api/orders/${order._id}/cancel`).expect(200);
    expect((await capture(id)).status).toBe(409);
    expect((await fresh()).payment.status).not.toBe('paid');
  });

  it('refuses a different PayPal id on an order that is already paid', async () => {
    const id = (await createPayment()).body.data.paypalOrderId;
    fake.approve(id);
    await capture(id).expect(200);
    expect((await capture('DIFFERENTID123')).status).toBe(409);
  });

  it('after payment, the customer can no longer self-cancel (a refund is needed)', async () => {
    const id = (await createPayment()).body.data.paypalOrderId;
    fake.approve(id);
    await capture(id).expect(200);
    expect((await buyer.put(`/api/orders/${order._id}/cancel`)).status).toBe(409);
  });

  it('a stale or mismatching PayPal order cannot pay a different order', async () => {
    const id = (await createPayment()).body.data.paypalOrderId;
    fake.approve(id);
    const second = (await buyer.post('/api/orders').send({ items: [{ product: String(c.fries._id), quantity: 1 }], deliveryAddress: ADDRESS })).body.data;
    expect((await capture(id, buyer, second._id)).status).toBe(409); // id belongs to the first order
    expect((await Order.findById(second._id)).payment.status).toBe('pending');
  });
});
