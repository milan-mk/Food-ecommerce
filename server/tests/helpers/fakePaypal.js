// An in-memory stand-in for services/payments/paypalProvider, used ONLY by tests via jest.mock.
// It behaves like PayPal Orders v2: orders must be APPROVED before capture, repeat captures fail, etc.
const state = {};
const err = (issue) => { const e = new Error(issue); e.statusCode = 502; e.issue = issue; return e; };

function reset() {
  Object.assign(state, { orders: new Map(), seq: 0, refunds: [], configured: true, declineNext: false, captureValueOverride: null, refundFails: false });
}
reset();

const shape = (o) => ({
  id: o.id, status: o.status,
  purchase_units: [{
    reference_id: o.orderId, custom_id: o.orderId,
    amount: { currency_code: o.currency, value: o.amount.toFixed(2) },
    ...(o.capture ? { payments: { captures: [o.capture] } } : {}),
  }],
  links: [{ rel: 'approve', href: `https://paypal.test/approve/${o.id}` }],
});

module.exports = {
  name: 'paypal', state, reset,
  approve: (id) => { state.orders.get(id).status = 'APPROVED'; },   // simulates the buyer approving in the PayPal popup
  expire: (id) => { state.orders.get(id).status = 'VOIDED'; },
  isConfigured: () => state.configured,
  async createOrder({ orderId, amount, currency }) {
    const id = `FAKEPP${++state.seq}`;
    state.orders.set(id, { id, status: 'CREATED', orderId: String(orderId), amount: Number(amount), currency });
    return { id, status: 'CREATED', approveUrl: `https://paypal.test/approve/${id}` };
  },
  async getOrder(id) { const o = state.orders.get(id); if (!o) throw err('RESOURCE_NOT_FOUND'); return { ...shape(o), approveUrl: `https://paypal.test/approve/${id}` }; },
  async captureOrder(id) {
    const o = state.orders.get(id);
    if (!o) throw err('RESOURCE_NOT_FOUND');
    if (o.status === 'COMPLETED') throw err('ORDER_ALREADY_CAPTURED');
    if (o.status !== 'APPROVED') throw err('ORDER_NOT_APPROVED');
    if (state.declineNext) { state.declineNext = false; throw err('INSTRUMENT_DECLINED'); }
    o.status = 'COMPLETED';
    o.capture = { id: `CAP-${id}`, status: 'COMPLETED', amount: { currency_code: o.currency, value: state.captureValueOverride || o.amount.toFixed(2) } };
    return shape(o);
  },
  async refundCapture({ captureId, amount, currency }) {
    if (state.refundFails) throw err('INTERNAL_SERVER_ERROR');
    if (state.refunds.some((r) => r.captureId === captureId)) throw err('CAPTURE_FULLY_REFUNDED');
    const r = { id: `REF-${captureId}`, captureId, amount, currency, status: 'COMPLETED' };
    state.refunds.push(r);
    return r;
  },
};
