const router = require('express').Router();
const ctrl = require('../controllers/couponController');
const validate = require('../middleware/validate');
const s = require('../validators/orderSchemas');
const adminCoupons = require('../controllers/adminCouponController');

router.get('/active', adminCoupons.listActive); // public list for the Offers page
router.post('/validate', validate({ body: s.validateCoupon }), ctrl.validate);
module.exports = router;
