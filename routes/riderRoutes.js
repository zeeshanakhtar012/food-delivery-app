const express = require('express');
const router = express.Router();
const riderController = require('../controllers/riderController');
const { authenticate, authorize, requireRestaurantAccess } = require('../middleware/authMiddleware');

// Public route
router.post('/login', riderController.login);

// Protected routes - require rider authentication
router.use(authenticate);
router.use(authorize('rider'));
router.use(requireRestaurantAccess);

// Order management
router.get('/orders/assigned', riderController.getAssignedOrders);
router.post('/orders/:id/accept', riderController.acceptOrder);
router.post('/orders/:id/reject', riderController.rejectOrder);
router.put('/orders/:id/status', riderController.updateOrderStatus);
router.post('/orders/:id/location', riderController.sendLocation);

// Profile & Status
router.get('/profile', riderController.getProfile);
router.put('/profile', riderController.updateProfile);
router.put('/availability', riderController.toggleAvailability);
router.put('/status', riderController.updateStatus);

module.exports = router;

