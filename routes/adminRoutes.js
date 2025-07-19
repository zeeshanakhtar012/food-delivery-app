const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const {
  createAdmin,
  loginSuperAdmin,
  createRestaurantAdmin,
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

// SuperAdmin creation (no auth required)
router.post('/create-admin', createAdmin);

// SuperAdmin login (no auth required)
router.post('/login-super-admin', loginSuperAdmin);

// Apply auth middleware to all routes below
router.use(authMiddleware);

// SuperAdmin routes
router.use((req, res, next) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ message: 'SuperAdmin access required' });
  }
  next();
});

router.post('/admin/restaurant-admins', createRestaurantAdmin);
router.post('/admin/restaurant-admins/:id/status', toggleRestaurantAdminStatus);
router.post('/admin/users/:id/credentials', updateAdminCredentials);
router.post('/admin/app-config', updateAppConfig);
router.get('/admin/app-config', getAppConfig);
router.post('/admin/advertisements', createAdvertisement);
router.get('/admin/advertisements', getAllAdvertisements);
router.post('/admin/advertisements/:id', updateAdvertisement);
router.delete('/admin/advertisements/:id', deleteAdvertisement);
router.post('/admin/notifications', sendPushNotification);
router.get('/admin/users', getAllUsers);
router.post('/admin/users/:id/block', toggleUserBlock);
router.post('/admin/users/:id/admin', toggleAdminStatus);
router.get('/admin/orders', getAllOrders);
router.post('/admin/orders/:id/status', updateOrderStatus);
router.get('/admin/analytics', getDashboardAnalytics);
router.post('/admin/discounts', createDiscount);
router.get('/admin/discounts', getAllDiscounts);
router.post('/admin/discounts/:id', updateDiscount);
router.delete('/admin/discounts/:id', deleteDiscount);
router.get('/admin/audit-logs', getAuditLogs);

module.exports = router;