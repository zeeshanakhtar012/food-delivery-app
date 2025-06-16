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
const Food = require('../models/Food');

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
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const food = await Food.findByIdAndDelete(req.params.id);
    if (!food) {
      return res.status(404).json({ message: 'Food not found' });
    }
    res.json({ message: 'Food deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;