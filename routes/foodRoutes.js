const express = require('express');
const router = express.Router();
const {
  getAllFoods,
  getFoodDetails,
  placeOrder,
  addFood,
  updatePricesByCategory,
  addToCart,
  getCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  trackOrder
} = require('../controllers/foodController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// Public routes
router.get('/', getAllFoods);
router.get('/:id', getFoodDetails);

// Protected routes
router.post('/order', authMiddleware, placeOrder);
router.post('/cart/add', authMiddleware, addToCart);
router.get('/cart', authMiddleware, getCart);
router.put('/cart/update', authMiddleware, updateCartItem);
router.delete('/cart/remove/:foodId', authMiddleware, removeCartItem);
router.delete('/cart/clear', authMiddleware, clearCart);
router.get('/orders/:id/track', authMiddleware, trackOrder);

// Admin routes
router.post('/', authMiddleware, adminMiddleware, addFood);
router.put('/prices', authMiddleware, adminMiddleware, updatePricesByCategory);

module.exports = router;