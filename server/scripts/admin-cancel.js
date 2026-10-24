// Manual helper: cancel an order as admin (refunds the PayPal payment if the order was paid).
// Usage: npm run admin:cancel --prefix server -- <orderId>
require('../config/env');
const BASE = process.env.API_URL || `http://localhost:${process.env.PORT || 5000}/api`;
const orderId = process.argv[2];
if (!orderId) { console.error('Usage: npm run admin:cancel --prefix server -- <orderId>'); process.exit(1); }

(async () => {
  const login = await fetch(`${BASE}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: process.env.SEED_ADMIN_EMAIL || 'admin@example.com', password: process.env.SEED_ADMIN_PASSWORD || 'Admin@12345' }),
  });
  const cookie = login.headers.getSetCookie()[0].split(';')[0];
  const res = await fetch(`${BASE}/admin/orders/${orderId}/status`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json', Cookie: cookie }, body: JSON.stringify({ status: 'Cancelled' }),
  });
  const json = await res.json();
  console.log(res.status, json.message);
  if (json.data) console.log('status:', json.data.status, '| payment:', json.data.payment);
})().catch((e) => { console.error(e.message); process.exit(1); });
