const express = require('express');
const router = express.Router();
const adminController = require('../../../controllers/admin/adminController');
const adminMiddleware = require('../../../middleware/adminMiddleware');

router.patch('/config', adminMiddleware, adminController.updateAppConfig);
router.get('/config', adminMiddleware, adminController.getAppConfig);
router.post('/advertisements', adminMiddleware, adminController.createAdvertisement);
router.get('/advertisements', adminMiddleware, adminController.getAllAdvertisements);
router.patch('/advertisements/:id', adminMiddleware, adminController.updateAdvertisement);
router.delete('/advertisements/:id', adminMiddleware, adminController.deleteAdvertisement);
router.post('/notifications', adminMiddleware, adminController.sendPushNotification);
router.get('/users', adminMiddleware, adminController.getAllUsers);
router.patch('/users/:id/block', adminMiddleware, adminController.toggleUserBlock);
router.patch('/users/:id/admin', adminMiddleware, adminController.toggleAdminStatus);
router.get('/orders', adminMiddleware, adminController.getAllOrders);
router.patch('/orders/:id/status', adminMiddleware, adminController.updateOrderStatus);
router.get('/analytics', adminMiddleware, adminController.getDashboardAnalytics);
router.post('/discounts', adminMiddleware, adminController.createDiscount);
router.get('/discounts', adminMiddleware, adminController.getAllDiscounts);
router.patch('/discounts/:id', adminMiddleware, adminController.updateDiscount);
router.delete('/discounts/:id', adminMiddleware, adminController.deleteDiscount);
router.get('/audit-logs', adminMiddleware, adminController.getAuditLogs);

module.exports = router;