const router = require('express').Router();
const ctrl = require('../controllers/categoryController');
const { protect, restrictTo } = require('../middleware/auth');
const validate = require('../middleware/validate');
const s = require('../validators/catalogSchemas');

router.get('/', ctrl.list);
router.get('/:id', ctrl.get); // id or slug

router.use(protect, restrictTo('admin'));
router.post('/', validate({ body: s.createCategory }), ctrl.create);
router.put('/:id', validate({ params: s.idParam, body: s.updateCategory }), ctrl.update);
router.delete('/:id', validate({ params: s.idParam }), ctrl.remove);

module.exports = router;
