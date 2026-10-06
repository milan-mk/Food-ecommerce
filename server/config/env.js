const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const required = ['MONGODB_URI', 'JWT_SECRET'];
const missing = required.filter((k) => !process.env[k]);
if (missing.length && process.env.NODE_ENV !== 'test') {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  console.error('Copy .env.example to .env (project root) and fill them in.');
  process.exit(1);
}

const paypalEnv = process.env.PAYPAL_ENVIRONMENT === 'live' ? 'live' : 'sandbox'; // anything else falls back to sandbox

const num = (v, d) => (v !== undefined && v !== '' && !Number.isNaN(Number(v)) ? Number(v) : d);

module.exports = {
  env: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: num(process.env.PORT, 5000),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  mongoUri: process.env.MONGODB_URI,
  jwt: {
    secret: process.env.JWT_SECRET || 'test-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  paypal: {
    clientId: (process.env.PAYPAL_CLIENT_ID || '').trim(),
    clientSecret: (process.env.PAYPAL_CLIENT_SECRET || '').trim(),
    environment: paypalEnv,
    baseUrl: paypalEnv === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com',
    isConfigured: Boolean((process.env.PAYPAL_CLIENT_ID || '').trim() && (process.env.PAYPAL_CLIENT_SECRET || '').trim()),
  },
  pricing: {
    currency: process.env.CURRENCY || 'USD',
    taxRate: num(process.env.TAX_RATE, 0.05),
    deliveryFee: num(process.env.DELIVERY_FEE, 2.99),
    freeDeliveryThreshold: num(process.env.FREE_DELIVERY_THRESHOLD, 30),
  },
};
