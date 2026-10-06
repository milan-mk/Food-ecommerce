// Thin PayPal Orders v2 client using plain REST. The client secret is only ever read here, on the server.
const { paypal, clientUrl } = require('../../config/env');
const AppError = require('../../utils/AppError');

const TIMEOUT_MS = 15000;
let cache = { token: null, expiresAt: 0 };

function assertConfigured() {
  if (!paypal.isConfigured) throw new AppError('Online payments are not configured on this server (missing PayPal credentials).', 503);
}

async function getAccessToken(force = false) {
  assertConfigured();
  if (!force && cache.token && Date.now() < cache.expiresAt - 60000) return cache.token;
  const basic = Buffer.from(`${paypal.clientId}:${paypal.clientSecret}`).toString('base64');
  let res;
  try {
    res = await fetch(`${paypal.baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=client_credentials',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    throw new AppError('Could not reach the payment service. Please try again.', 502);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    console.error('PayPal auth failed:', res.status, data.error, data.error_description);
    throw new AppError('Payment service authentication failed', 502);
  }
  cache = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return cache.token;
}

async function api(method, path, { body, requestId } = {}, retried = false) {
  const token = await getAccessToken(retried);
  let res;
  try {
    res = await fetch(`${paypal.baseUrl}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(requestId ? { 'PayPal-Request-Id': requestId } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    throw new AppError('Could not reach the payment service. Please try again.', 502);
  }
  if (res.status === 401 && !retried) return api(method, path, { body, requestId }, true); // token expired early: refresh once
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const issue = (data.details && data.details[0] && data.details[0].issue) || data.name;
    console.error('PayPal API error:', method, path, res.status, issue, `debug_id=${data.debug_id}`);
    const err = new AppError('Payment service error. Please try again.', 502);
    err.issue = issue; // e.g. INSTRUMENT_DECLINED, ORDER_NOT_APPROVED, ORDER_ALREADY_CAPTURED
    throw err;
  }
  return data;
}

const approveLink = (o) => ((o.links || []).find((l) => l.rel === 'approve' || l.rel === 'payer-action') || {}).href;

module.exports = {
  name: 'paypal',
  isConfigured: () => paypal.isConfigured,

  // amount is OUR order total from the database, never a number from the browser.
  async createOrder({ orderId, amount, currency }) {
    const o = await api('POST', '/v2/checkout/orders', {
      body: {
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id: String(orderId),
          custom_id: String(orderId),
          description: `Food order ${String(orderId).slice(-6).toUpperCase()}`,
          amount: { currency_code: currency, value: Number(amount).toFixed(2) },
        }],
        application_context: {
          user_action: 'PAY_NOW',
          shipping_preference: 'NO_SHIPPING',
          return_url: `${clientUrl}/payment/return`,
          cancel_url: `${clientUrl}/payment/cancel`,
        },
      },
    });
    return { id: o.id, status: o.status, approveUrl: approveLink(o) };
  },

  async getOrder(paypalOrderId) {
    const o = await api('GET', `/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}`);
    return { ...o, approveUrl: approveLink(o) };
  },

  // Request-Id makes retries safe: PayPal returns the original result instead of capturing twice.
  captureOrder(paypalOrderId) {
    return api('POST', `/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, { body: {}, requestId: `capture-${paypalOrderId}` });
  },
};
