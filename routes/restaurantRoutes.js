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
  getRestaurantAnalytics,
  uploadRestaurantImages,
  uploadFoodImages
} = require('../controllers/restaurantAdminController');
const { getRestaurantImages, getRestaurantDetails: getRestaurantDetailsPublic } = require('../controllers/restaurantController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const upload = require('../middleware/upload');

// Public routes
router.get('/:id/images', getRestaurantImages);
router.get('/:id', getRestaurantDetailsPublic);

// Restaurant Admin Login
router.post('/admin-restaurant/signin', signinRestaurantAdmin);

// Restaurant admin routes
router.use(authMiddleware);
router.get('/details', adminMiddleware, getRestaurantDetails);
router.get('/all-categories', adminMiddleware, getAllCategories);
router.post('/details', adminMiddleware, upload.fields([{ name: 'restaurantImages', maxCount: 10 }]), updateRestaurant);
router.post('/categories', adminMiddleware, addCategory);
router.put('/categories/:id', adminMiddleware, updateCategory);
router.delete('/categories/:id', adminMiddleware, deleteCategory);
router.post('/foods', adminMiddleware, upload.fields([{ name: 'foodImages', maxCount: 10 }]), addFood);
router.post('/foods/:id', adminMiddleware, upload.fields([{ name: 'foodImages', maxCount: 10 }]), updateFood);
router.delete('/foods/:id', adminMiddleware, deleteFood);
router.post('/images', adminMiddleware, upload.fields([{ name: 'restaurantImages', maxCount: 10 }]), uploadRestaurantImages);
router.post('/foods/:foodId/images', adminMiddleware, upload.fields([{ name: 'foodImages', maxCount: 10 }]), uploadFoodImages);
router.get('/orders', adminMiddleware, getRestaurantOrders);
router.post('/orders/:id/accept', adminMiddleware, acceptOrder);
router.post('/orders/:id/reject', adminMiddleware, rejectOrder);
router.post('/orders/:id/status', adminMiddleware, updateRestaurantOrderStatus);
router.get('/analytics', adminMiddleware, getRestaurantAnalytics);

module.exports = router;