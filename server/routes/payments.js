const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const ctrl = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const s = require('../validators/paymentSchemas');

const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: process.env.NODE_ENV === 'test' ? 1000 : 60, standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Too many payment attempts. Please try again later.' },
});

router.get('/config', ctrl.config);
router.post('/paypal/create-order', protect, paymentLimiter, validate({ body: s.createOrder }), ctrl.createPaypalOrder);
router.post('/paypal/capture-order', protect, paymentLimiter, validate({ body: s.captureOrder }), ctrl.capturePaypalOrder);

module.exports = router;
