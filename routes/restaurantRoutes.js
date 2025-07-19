const express = require('express');
const router = express.Router();
const {
  createRestaurant,
  updateRestaurant,
  deleteRestaurant,
  createCategory,
  updateCategory,
  deleteCategory
} = require('../controllers/restaurantController');
const {
  getRestaurantOrders,
  updateRestaurantOrderStatus,
  getRestaurantAnalytics
} = require('../controllers/restaurantAdminController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// Super admin routes
router.use(authMiddleware);
router.post('/', createRestaurant);
router.put('/:id', updateRestaurant);
router.delete('/:id', deleteRestaurant);

// Super admin or restaurant admin routes
router.post('/categories', adminMiddleware, createCategory);
router.put('/categories/:id', adminMiddleware, updateCategory);
router.delete('/categories/:id', adminMiddleware, deleteCategory);
router.get('/orders', adminMiddleware, getRestaurantOrders);
router.post('/orders/:id/status', adminMiddleware, updateRestaurantOrderStatus);
router.get('/analytics', adminMiddleware, getRestaurantAnalytics);

module.exports = router;