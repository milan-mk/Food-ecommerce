const router = require('express').Router();
const ctrl = require('../controllers/couponController');
const validate = require('../middleware/validate');
const s = require('../validators/orderSchemas');

router.post('/validate', validate({ body: s.validateCoupon }), ctrl.validate);
module.exports = router;
