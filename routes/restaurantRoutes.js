const express = require('express');
const router = express.Router();
const {
  signinRestaurantAdmin,
  getRestaurantDetails,
  updateRestaurant,
  updateCategory,
  deleteCategory,
  addCategory,
  addFood,
  updateFood,
  getAllCategories,
  deleteFood,
  getRestaurantOrders,
  acceptOrder,
  rejectOrder,
  updateRestaurantOrderStatus,
  getRestaurantAnalytics
} = require('../controllers/restaurantAdminController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// Restaurant Admin Login
router.post('/admin-restaurant/signin', signinRestaurantAdmin);

// Restaurant admin routes
router.use(authMiddleware);
router.get('/details', adminMiddleware, getRestaurantDetails);
router.get('/all-categories', adminMiddleware, getAllCategories);
router.post('/details', adminMiddleware, updateRestaurant);
router.post('/categories', adminMiddleware, addCategory);
router.put('/categories/:id', adminMiddleware, updateCategory);
router.delete('/categories/:id', adminMiddleware, deleteCategory);
router.post('/foods', adminMiddleware, addFood);
router.post('/foods/:id', adminMiddleware, updateFood);
router.delete('/foods/:id', adminMiddleware, deleteFood);
router.get('/orders', adminMiddleware, getRestaurantOrders);
router.post('/orders/:id/accept', adminMiddleware, acceptOrder);
router.post('/orders/:id/reject', adminMiddleware, rejectOrder);
router.post('/orders/:id/status', adminMiddleware, updateRestaurantOrderStatus);
router.get('/analytics', adminMiddleware, getRestaurantAnalytics);

module.exports = router;