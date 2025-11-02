const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, authorize, requireRestaurantAccess } = require('../middleware/authMiddleware');

// Public routes
router.post('/register', userController.register);
router.post('/login', userController.login);

// Protected routes - require user authentication
router.use(authenticate);
router.use(authorize('user'));
router.use(requireRestaurantAccess);

// Food browsing
router.get('/foods', userController.getFoods);

// Profile
router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);

// Order management
router.post('/orders', userController.placeOrder);
router.get('/orders', userController.getMyOrders);
router.get('/orders/:id/track', userController.getOrderTracking);

module.exports = router;
