const router = require('express').Router();
const ctrl = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiters');
const validate = require('../middleware/validate');
const schemas = require('../validators/authSchemas');

router.post('/register', authLimiter, validate({ body: schemas.register }), ctrl.register);
router.post('/login', authLimiter, validate({ body: schemas.login }), ctrl.login);
router.post('/logout', ctrl.logout);
router.get('/me', protect, ctrl.me);

module.exports = router;
