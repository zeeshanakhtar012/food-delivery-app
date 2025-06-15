const express = require('express');
const router = express.Router();
const { getAllFoods, getFoodDetails, placeOrder, addFood, updatePricesByCategory } = require('../controllers/foodController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// Public routes
router.get('/', getAllFoods);
router.get('/:id', getFoodDetails);

// Protected routes (user)
router.post('/order', authMiddleware, placeOrder);

// Protected routes (admin)
router.post('/', authMiddleware, adminMiddleware, addFood);
router.patch('/prices', authMiddleware, adminMiddleware, updatePricesByCategory);

module.exports = router;