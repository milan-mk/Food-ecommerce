const router = require('express').Router();
const ctrl = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiters');
const validate = require('../middleware/validate');
const schemas = require('../validators/authSchemas');
const profile = require('../controllers/profileController');
const ps = require('../validators/profileSchemas');

router.post('/register', authLimiter, validate({ body: schemas.register }), ctrl.register);
router.post('/login', authLimiter, validate({ body: schemas.login }), ctrl.login);
router.post('/logout', ctrl.logout);
router.get('/me', protect, ctrl.me);

router.put('/profile', protect, validate({ body: ps.updateProfile }), profile.updateProfile);
router.put('/password', protect, authLimiter, validate({ body: ps.changePassword }), profile.changePassword);
router.post('/addresses', protect, validate({ body: ps.createAddress }), profile.addAddress);
router.put('/addresses/:addressId', protect, validate({ params: ps.addressParam, body: ps.updateAddress }), profile.updateAddress);
router.delete('/addresses/:addressId', protect, validate({ params: ps.addressParam }), profile.deleteAddress);

module.exports = router;
