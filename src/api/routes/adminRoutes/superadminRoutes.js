const express = require('express');
const router = express.Router();
const superadminController = require('../../../controllers/admin/superadminController');
const superadminMiddleware = require('../../../middleware/superadminMiddleware');

router.get('/restaurants', superadminMiddleware, superadminController.getAllRestaurants);
router.patch('/restaurants/:id/block', superadminMiddleware, superadminController.toggleRestaurantBlock);
router.delete('/restaurants/:id', superadminMiddleware, superadminController.deleteRestaurant);
router.get('/analytics', superadminMiddleware, superadminController.getSystemAnalytics);
router.get('/audit-logs', superadminMiddleware, superadminController.getSystemAuditLogs);
router.post('/food-categories', superadminMiddleware, superadminController.createFoodCategory);
router.patch('/food-categories/:id', superadminMiddleware, superadminController.updateFoodCategory);
router.delete('/food-categories/:id', superadminMiddleware, superadminController.deleteFoodCategory);
router.get('/food-categories', superadminMiddleware, superadminController.getAllFoodCategories);
router.get('/users', superadminMiddleware, superadminController.getAllUsers);
router.patch('/users/:id/block', superadminMiddleware, superadminController.toggleUserBlock);
router.patch('/users/:id/admin', superadminMiddleware, superadminController.toggleAdminStatus);
router.post('/cities', superadminMiddleware, superadminController.createCity);
router.patch('/cities/:id', superadminMiddleware, superadminController.updateCity);
router.delete('/cities/:id', superadminMiddleware, superadminController.deleteCity);
router.get('/cities', superadminMiddleware, superadminController.getAllCities);

module.exports = router;