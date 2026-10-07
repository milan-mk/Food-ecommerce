const { verifyPaypalCapture } = require('../../services/payments/verifyPaypalCapture');

const order = { _id: 'o1', currency: 'USD', total: 17.13, payment: { paypalOrderId: 'PP123' } };
const good = () => ({ id: 'PP123', status: 'COMPLETED', purchase_units: [{ custom_id: 'o1', payments: { captures: [{ id: 'CAP1', status: 'COMPLETED', amount: { currency_code: 'USD', value: '17.13' } }] } }] });
const withChange = (fn) => { const p = good(); fn(p); return verifyPaypalCapture({ order, paypalOrder: p }); };
const cap = (p) => p.purchase_units[0].payments.captures[0];

describe('verifyPaypalCapture', () => {
  it('accepts a matching, completed capture', () => {
    expect(verifyPaypalCapture({ order, paypalOrder: good() })).toEqual({ ok: true, transactionId: 'CAP1', amount: 17.13 });
  });
  it('rejects a missing response', () => { expect(verifyPaypalCapture({ order, paypalOrder: null }).ok).toBe(false); });
  it('rejects a different PayPal order id', () => { expect(withChange((p) => { p.id = 'OTHER'; }).reason).toMatch(/id mismatch/); });
  it('rejects an order that is not COMPLETED', () => { expect(withChange((p) => { p.status = 'APPROVED'; }).reason).toMatch(/status/); });
  it('rejects a payment that references another order', () => { expect(withChange((p) => { p.purchase_units[0].custom_id = 'someone-else'; }).reason).toMatch(/reference/); });
  it('rejects a different amount, even by one cent', () => {
    expect(withChange((p) => { cap(p).amount.value = '0.01'; }).reason).toMatch(/Amount mismatch/);
    expect(withChange((p) => { cap(p).amount.value = '17.12'; }).ok).toBe(false);
  });
  it('compares amounts numerically, not as strings', () => { expect(withChange((p) => { cap(p).amount.value = '17.130'; }).ok).toBe(true); });
  it('rejects a different currency', () => { expect(withChange((p) => { cap(p).amount.currency_code = 'EUR'; }).reason).toMatch(/Currency/); });
  it('rejects a capture that is not COMPLETED (e.g. PENDING)', () => { expect(withChange((p) => { cap(p).status = 'PENDING'; }).reason).toMatch(/Capture status/); });
  it('rejects a response with no capture or no purchase unit', () => {
    expect(withChange((p) => { p.purchase_units[0].payments.captures = []; }).reason).toMatch(/No capture/);
    expect(withChange((p) => { p.purchase_units = []; }).reason).toMatch(/No purchase unit/);
  });
});
