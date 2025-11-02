const express = require('express');
const router = express.Router();
const couponController = require('../controllers/couponController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// Protected routes - restaurant admin
router.use(authenticate);
router.use(authorize('restaurant_admin'));

router.post('/', couponController.createCoupon);
router.get('/', couponController.getCoupons);
router.get('/:id', couponController.getCoupon);
router.put('/:id', couponController.updateCoupon);
router.delete('/:id', couponController.deleteCoupon);

// User routes - available coupons
router.get('/available/list', authenticate, authorize('user'), couponController.getAvailableCoupons);
router.post('/apply', authenticate, authorize('user'), couponController.applyCoupon);

module.exports = router;

