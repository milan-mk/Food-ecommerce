const router = require('express').Router();
const ctrl = require('../controllers/orderController');
const { protect } = require('../middleware/auth');
const { couponGuessLimiter } = require('../middleware/rateLimiters');
const validate = require('../middleware/validate');
const s = require('../validators/orderSchemas');
const { idParam } = require('../validators/catalogSchemas');

router.post('/quote', couponGuessLimiter, validate({ body: s.quote }), ctrl.quote); // public: cart totals preview
router.post('/', protect, couponGuessLimiter, validate({ body: s.createOrder }), ctrl.create);
router.get('/my-orders', protect, validate({ query: s.myOrdersQuery }), ctrl.myOrders); // must stay above /:id
router.get('/:id', protect, validate({ params: idParam }), ctrl.get);
router.put('/:id/cancel', protect, validate({ params: idParam }), ctrl.cancel);

module.exports = router;
