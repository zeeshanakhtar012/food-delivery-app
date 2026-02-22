const express = require('express');
const router = express.Router();
const staffApiController = require('../controllers/staffApiController');
const { authenticate, authorize, requireRestaurantAccess } = require('../middleware/authMiddleware');

// Public route for staff login
router.post('/auth/login', staffApiController.login);

// All routes below require staff authentication
router.use(authenticate);
router.use(authorize('staff'));
// We apply requireRestaurantAccess to ensure req.restaurant_id is maintained perfectly 
// (or just rely on the token's logic which is checked in the controller)
router.use(requireRestaurantAccess);

// Check exact status
router.get('/status', staffApiController.checkStatus);

// Profile
router.get('/profile', staffApiController.getProfile);

// Menu
router.get('/menu', staffApiController.getMenu);

// Tables
router.get('/tables', staffApiController.getTables);

// Orders
router.post('/orders', staffApiController.createOrder); // Create order for a table
router.put('/orders/:id/add-items', staffApiController.addItemsToOrder); // Add items to existing order
router.put('/orders/:id/cancel', staffApiController.cancelOrder); // Cancel order

module.exports = router;
