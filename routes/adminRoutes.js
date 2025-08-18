const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const {
  signupAdmin,
  signinAdmin,
  createRestaurant,
  getAllRestaurants,
  createRestaurantAdmin,
  createRestaurantWithAdmin,
  updateAdminCredentials,
  toggleRestaurantAdminStatus,
  updateAppConfig,
  getAppConfig,
  createAdvertisement,
  getAllAdvertisements,
  updateAdvertisement,
  deleteAdvertisement,
  sendPushNotification,
  getAllUsers,
  toggleUserBlock,
  toggleAdminStatus,
  getAllOrders,
  updateOrderStatus,
  getDashboardAnalytics,
  createDiscount,
  getAllDiscounts,
  updateDiscount,
  deleteDiscount,
  getAuditLogs,
} = adminController;
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// Unauthenticated routes
router.post('/signup', signupAdmin);
router.post('/create-admin', signupAdmin);
router.post('/signin', signinAdmin);
router.post('/login-super-admin', signinAdmin);

// Protected routes
router.use(authMiddleware);
router.use(adminMiddleware);
router.use((req, res, next) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ message: 'Super admin access required' });
  }
  next();
});

// Restaurant management
router.post('/create-restaurants', createRestaurant);
router.post('/create-restaurant-with-admin', createRestaurantWithAdmin);
router.get('/get-restaurants', getAllRestaurants);
router.post('/create-restaurant-admins', createRestaurantAdmin);
router.post('/restaurant-admins/:id/status', toggleRestaurantAdminStatus);
router.post('/users/:id/credentials', updateAdminCredentials);

// App configuration
router.post('/app-config', updateAppConfig);
router.get('/app-config', getAppConfig);

// Advertisements
router.post('/advertisements', createAdvertisement);
router.get('/advertisements', getAllAdvertisements);
router.post('/advertisements/:id', updateAdvertisement);
router.delete('/advertisements/:id', deleteAdvertisement);

// Notifications
router.post('/notifications', sendPushNotification);

// User management
router.get('/users', getAllUsers);
router.post('/users/:id/block', toggleUserBlock);
router.post('/users/:id/admin', toggleAdminStatus);

// Orders
router.get('/orders', getAllOrders);
router.post('/orders/:id/status', updateOrderStatus);

// Analytics
router.get('/analytics', getDashboardAnalytics);

// Discounts
router.post('/discounts', createDiscount);
router.get('/discounts', getAllDiscounts);
router.post('/discounts/:id', updateDiscount);
router.delete('/discounts/:id', deleteDiscount);

// Audit logs
router.get('/audit-logs', getAuditLogs);

module.exports = router;