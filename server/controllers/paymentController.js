const asyncHandler = require('../utils/asyncHandler');
const { paypal, pricing } = require('../config/env');
const { createPayment, capturePayment } = require('../services/paymentService');

// Public values the React PayPal button needs. The CLIENT ID is public by design; the secret never leaves the server.
exports.config = (req, res) => res.json({
  success: true,
  data: { provider: 'paypal', enabled: paypal.isConfigured, clientId: paypal.isConfigured ? paypal.clientId : null, environment: paypal.environment, currency: pricing.currency },
});

exports.createPaypalOrder = asyncHandler(async (req, res) => {
  const data = await createPayment({ orderId: req.body.orderId, user: req.user });
  res.json({ success: true, data });
});

exports.capturePaypalOrder = asyncHandler(async (req, res) => {
  const { order, alreadyPaid } = await capturePayment({ ...req.body, user: req.user });
  res.json({ success: true, message: alreadyPaid ? 'Payment already completed' : 'Payment successful. Your order is confirmed!', data: order });
});
