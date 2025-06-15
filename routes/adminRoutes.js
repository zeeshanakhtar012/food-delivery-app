const express = require('express');
const router = express.Router();
const {
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
  getAuditLogs
} = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// All routes require admin access
router.use(authMiddleware, adminMiddleware);

// App configuration
router.put('/app-config', updateAppConfig);
router.get('/app-config', getAppConfig);

// Advertisements
router.post('/advertisements', createAdvertisement);
router.get('/advertisements', getAllAdvertisements);
router.put('/advertisements/:id', updateAdvertisement);
router.delete('/advertisements/:id', deleteAdvertisement);

// Notifications
router.post('/notifications', sendPushNotification);

// Users
router.get('/users', getAllUsers);
router.patch('/users/:id/block', toggleUserBlock);
router.patch('/users/:id/admin', toggleAdminStatus);

// Orders
router.get('/orders', getAllOrders);
router.patch('/orders/:id/status', updateOrderStatus);

// Analytics
router.get('/analytics', getDashboardAnalytics);

// Discounts
router.post('/discounts', createDiscount);
router.get('/discounts', getAllDiscounts);
router.put('/discounts/:id', updateDiscount);
router.delete('/discounts/:id', deleteDiscount);

// Audit logs
router.get('/audit-logs', getAuditLogs);

module.exports = router;