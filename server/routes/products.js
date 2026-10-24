const router = require('express').Router();
const ctrl = require('../controllers/productController');
const { protect, optionalAuth, restrictTo } = require('../middleware/auth');
const validate = require('../middleware/validate');
const s = require('../validators/catalogSchemas');
const reviewCtrl = require('../controllers/reviewController');
const rs = require('../validators/reviewSchemas');

router.get('/', optionalAuth, validate({ query: s.listProductsQuery }), ctrl.list);
router.get('/:id', optionalAuth, ctrl.get); // id or slug

router.post('/', protect, restrictTo('admin'), validate({ body: s.createProduct }), ctrl.create);
router.put('/:id', protect, restrictTo('admin'), validate({ params: s.idParam, body: s.updateProduct }), ctrl.update);
router.delete('/:id', protect, restrictTo('admin'), validate({ params: s.idParam }), ctrl.remove);
router.get('/:id/reviews', validate({ query: rs.listQuery }), reviewCtrl.listForProduct);
router.post('/:id/reviews', protect, validate({ body: rs.createReview }), reviewCtrl.create);

module.exports = router;
