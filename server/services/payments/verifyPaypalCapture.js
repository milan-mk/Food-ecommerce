// Pure function: decides whether a PayPal order response proves THIS order was paid in full.
// The frontend's claim of success is never trusted; only data fetched from PayPal by the server is checked here.
const cents = (n) => Math.round(Number(n) * 100);

function verifyPaypalCapture({ order, paypalOrder }) {
  const bad = (reason) => ({ ok: false, reason });
  if (!paypalOrder || paypalOrder.id !== order.payment.paypalOrderId) return bad('PayPal order id mismatch');
  if (paypalOrder.status !== 'COMPLETED') return bad(`PayPal order status is ${paypalOrder.status}`);
  const unit = (paypalOrder.purchase_units || [])[0];
  if (!unit) return bad('No purchase unit in PayPal response');
  if (String(unit.custom_id || unit.reference_id) !== String(order._id)) return bad('PayPal reference does not match this order');
  const capture = ((unit.payments || {}).captures || [])[0];
  if (!capture) return bad('No capture found in PayPal response');
  if (capture.status !== 'COMPLETED') return bad(`Capture status is ${capture.status}`);
  if (!capture.amount || capture.amount.currency_code !== order.currency) return bad('Currency mismatch');
  if (cents(capture.amount.value) !== cents(order.total)) return bad(`Amount mismatch (paid ${capture.amount.value}, expected ${order.total})`);
  return { ok: true, transactionId: capture.id, amount: Number(capture.amount.value) };
}

module.exports = { verifyPaypalCapture };
