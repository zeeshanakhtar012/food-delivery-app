const express = require('express');
const router = express.Router();
const superAdminController = require('../controllers/superAdminController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// Public routes
router.post('/login', superAdminController.login);

// Protected routes - require super admin authentication
router.use(authenticate);
router.use(authorize('super_admin'));

// ! TEMPORARY RIDER DB PATCH - DELETE LATER !
const { pool } = require('../config/db');
router.get('/migrate-riders', async (req, res) => {
    try {
        await pool.query('ALTER TABLE riders ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;');
        await pool.query('ALTER TABLE riders ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false;');
        await pool.query('ALTER TABLE riders ADD COLUMN IF NOT EXISTS blocked_reason TEXT;');
        await pool.query('ALTER TABLE riders ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMP;');
        await pool.query('UPDATE riders SET is_active = true WHERE is_active IS NULL;');
        res.json({ success: true, message: 'Riders table patched successfully!' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Restaurant management
router.post('/restaurants', superAdminController.createRestaurant);
router.get('/restaurants', superAdminController.getAllRestaurants);
router.get('/restaurants/:id/details', superAdminController.getRestaurantDetails);
router.get('/restaurants/:id/analytics', superAdminController.getRestaurantAnalytics);
router.delete('/restaurants/:id', superAdminController.deleteRestaurant);
router.put('/restaurants/:id/freeze', superAdminController.toggleRestaurantFreeze);

// Platform Analytics
router.get('/analytics', superAdminController.getPlatformAnalytics);

// User Management
router.get('/users', superAdminController.getAllUsers);
router.put('/users/:id/freeze', superAdminController.toggleUserFreeze);
router.delete('/users/:id', superAdminController.deleteUser);

// Rider Management
router.get('/riders', superAdminController.getAllRiders);
router.put('/riders/:id/freeze', superAdminController.toggleRiderFreeze);
router.delete('/riders/:id', superAdminController.deleteRider);

module.exports = router;
