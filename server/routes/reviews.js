const router = require('express').Router();
const ctrl = require('../controllers/reviewController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const s = require('../validators/reviewSchemas');
const { idParam } = require('../validators/catalogSchemas');

router.put('/:id', protect, validate({ params: idParam, body: s.updateReview }), ctrl.update);
router.delete('/:id', protect, validate({ params: idParam }), ctrl.remove);
module.exports = router;
