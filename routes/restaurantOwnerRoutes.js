// restaurantOwnerRoutes.js (updated with new discount endpoints)
const express = require('express');
const router = express.Router();
const {
  signinRestaurantAdmin,
  getRestaurantDetails,
  updateRestaurant,
  addCategory,
  updateCategory,
  deleteCategory,
  addFood,
  getAllCategories,
  updateFood,
  deleteFood,
  getRestaurantOrders,
  acceptOrder,
  rejectOrder,
  updateRestaurantOrderStatus,
  getRestaurantAnalytics,
  uploadRestaurantImages,
  uploadFoodImages,
  addDiscountToFood, // NEW
  removeDiscountFromFood // NEW
} = require('../controllers/restaurantAdminController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const upload = require('../middleware/upload');

// Restaurant Owner Login
router.post('/signin', signinRestaurantAdmin);

// Restaurant owner routes (protected)
router.use(authMiddleware);
router.use(adminMiddleware);

// Restaurant management
router.get('/details', getRestaurantDetails);
router.post('/details', upload.fields([{ name: 'restaurantImages', maxCount: 10 }]), updateRestaurant);
router.post('/images', upload.fields([{ name: 'restaurantImages', maxCount: 10 }]), uploadRestaurantImages);

// Category management
router.get('/categories', getAllCategories);
router.post('/categories', addCategory);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

// Food management
router.post('/foods', upload.fields([{ name: 'foodImages', maxCount: 10 }]), addFood);
router.post('/foods/:id', upload.fields([{ name: 'foodImages', maxCount: 10 }]), updateFood);
router.delete('/foods/:id', deleteFood);
router.post('/foods/:foodId/images', upload.fields([{ name: 'foodImages', maxCount: 10 }]), uploadFoodImages);

// NEW: Discount management for foods
router.post('/foods/:id/discount', addDiscountToFood);
router.delete('/foods/:id/discount', removeDiscountFromFood);

// Order management
router.get('/orders', getRestaurantOrders);
router.post('/orders/:id/accept', acceptOrder);
router.post('/orders/:id/reject', rejectOrder);
router.post('/orders/:id/status', updateRestaurantOrderStatus);

// Analytics
router.get('/analytics', getRestaurantAnalytics);

module.exports = router;