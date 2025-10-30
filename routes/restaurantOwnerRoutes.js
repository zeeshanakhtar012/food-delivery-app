// restaurantOwnerRoutes.js (UPDATED: Added Multer for category routes)
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
  removeDiscountFromFood, // NEW
  // Added missing new functions
  getReports,
  addExpense,
  getExpenses,
  downloadReport,
  // NEW: Added for category images
  uploadCategoryImages
} = require('../controllers/restaurantAdminController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const upload = require('../middleware/upload');

// Restaurant Owner Login (public)
router.post('/signin', signinRestaurantAdmin);

// All other routes protected by middleware
router.use(authMiddleware);
router.use(adminMiddleware);

// Restaurant management
router.get('/details', getRestaurantDetails);
router.post('/details', upload.fields([{ name: 'restaurantImages', maxCount: 10 }]), updateRestaurant);
router.post('/images', upload.fields([{ name: 'restaurantImages', maxCount: 10 }]), uploadRestaurantImages);

// Category management (UPDATED: Added Multer support for images)
router.get('/categories', getAllCategories);
router.post('/categories', upload.array('categoryImages', 5), addCategory); // UPDATED: Added upload.array
router.put('/categories/:id', upload.array('categoryImages', 5), updateCategory); // UPDATED: Added upload.array
router.delete('/categories/:id', deleteCategory);
// NEW: Dedicated route for uploading images to existing category
router.post('/categories/:id/images', upload.array('categoryImages', 5), uploadCategoryImages);

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

// Analytics & Reports (protected by router.use above; no need for explicit middleware)
router.get('/analytics', getRestaurantAnalytics);
router.get('/reports', getReports);
router.post('/expenses', addExpense);
router.get('/expenses', getExpenses);
router.get('/reports/download', downloadReport);

module.exports = router;