const { z } = require('zod');
const { OBJECT_ID_RE } = require('../utils/objectId');

const orderId = z.string().regex(OBJECT_ID_RE, 'Invalid order id');
exports.createOrder = z.object({ orderId });
exports.captureOrder = z.object({
  orderId,
  paypalOrderId: z.string().trim().regex(/^[A-Za-z0-9_-]{5,64}$/, 'Invalid PayPal order id'),
});
