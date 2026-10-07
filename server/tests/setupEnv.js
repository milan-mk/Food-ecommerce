// Runs before every test file. Fixed values so tests never depend on (or leak) your real .env.
// dotenv never overrides variables that already exist, so these win over anything in .env.
Object.assign(process.env, {
  NODE_ENV: 'test',
  JWT_SECRET: 'test-secret-not-for-real-use',
  JWT_EXPIRES_IN: '1d',
  MONGODB_URI: 'mongodb://127.0.0.1:1/never-used', // safety net: nothing in the app may connect through this
  CLIENT_URL: 'http://localhost:5173',
  PAYPAL_CLIENT_ID: 'test-client-id',
  PAYPAL_CLIENT_SECRET: 'test-client-secret',
  PAYPAL_ENVIRONMENT: 'sandbox',
  CURRENCY: 'USD', TAX_RATE: '0.05', DELIVERY_FEE: '2.99', FREE_DELIVERY_THRESHOLD: '30',
});
