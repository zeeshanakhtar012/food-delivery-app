const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');

// GET /api/analytics/sales?restaurantId=xxx
router.get('/sales', analyticsController.getSalesStats);

module.exports = router;