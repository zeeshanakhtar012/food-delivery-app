const express = require('express');
const router = express.Router();
const {
  getAllFoods,
  getFoodDetails,
  placeOrder,
  addToCart,
  getCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  trackOrder
} = require('../controllers/foodController');
const { addFood, updateFood, deleteFood } = require('../controllers/restaurantAdminController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// Public routes
router.get('/', getAllFoods);
router.get('/:id', getFoodDetails);

// Protected routes (user)
router.post('/order', authMiddleware, placeOrder);
router.post('/cart/add', authMiddleware, addToCart);
router.get('/cart', authMiddleware, getCart);
router.post('/cart/update', authMiddleware, updateCartItem);
router.delete('/cart/remove/:foodId', authMiddleware, removeCartItem);
router.delete('/cart/clear', authMiddleware, clearCart);
router.get('/orders/:id/track', authMiddleware, trackOrder);

// Admin routes (super admin or restaurant admin)
router.post('/', authMiddleware, adminMiddleware, addFood);
router.put('/:id', authMiddleware, adminMiddleware, updateFood);
router.delete('/:id', authMiddleware, adminMiddleware, deleteFood);

module.exports = router;