const express = require('express');
const router = express.Router();
const restaurantStaffController = require('../controllers/restaurantStaffController');
const { authenticate, authorize, requireRestaurantAccess } = require('../middleware/authMiddleware');

// Protected routes
router.use(authenticate);
router.use(authorize('restaurant_admin'));
router.use(requireRestaurantAccess);

router.post('/', restaurantStaffController.createStaff);
router.get('/', restaurantStaffController.getStaff);
router.get('/:id', restaurantStaffController.getStaffById);
router.put('/:id', restaurantStaffController.updateStaff);
router.delete('/:id', restaurantStaffController.deleteStaff);

module.exports = router;

