const router = require('express').Router();
const admin = require('../controllers/adminController');
const coupons = require('../controllers/adminCouponController');
const { protect, restrictTo } = require('../middleware/auth');
const validate = require('../middleware/validate');
const s = require('../validators/adminSchemas');
const { idParam } = require('../validators/catalogSchemas');

router.use(protect, restrictTo('admin')); // everything below is admin-only

router.get('/stats', validate({ query: s.statsQuery }), admin.stats);

router.get('/orders', validate({ query: s.ordersQuery }), admin.listOrders);
router.put('/orders/:id/status', validate({ params: idParam, body: s.updateStatus }), admin.updateOrderStatus);
router.post('/orders/:id/refund', validate({ params: idParam }), admin.refundOrder);

router.get('/users', validate({ query: s.usersQuery }), admin.listUsers);
router.get('/users/:id', validate({ params: idParam }), admin.getUser);
router.put('/users/:id', validate({ params: idParam, body: s.updateUser }), admin.updateUser);

router.get('/inventory', validate({ query: s.inventoryQuery }), admin.listInventory);
router.put('/inventory/:id', validate({ params: idParam, body: s.stockUpdate }), admin.updateStock);

router.get('/coupons', coupons.list);
router.post('/coupons', validate({ body: s.createCoupon }), coupons.create);
router.put('/coupons/:id', validate({ params: idParam, body: s.updateCoupon }), coupons.update);
router.delete('/coupons/:id', validate({ params: idParam }), coupons.remove);

module.exports = router;
