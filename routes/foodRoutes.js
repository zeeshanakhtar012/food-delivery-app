// foodRoutes.js (updated)
const express = require('express');
const router = express.Router();
const {
  getFoodDetails,
  placeOrder,
  addToCart,
  getCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  trackOrder,
  addFood,
  updateFood,
  deleteFood,
  updatePricesByCategory,
  addToFavorites,
  removeFromFavorites,
  getFavorites,
  getUniqueCategories,
  getAllRestaurants,
  getCategoriesByRestaurant,
  getFoodsByRestaurantAndCategory
} = require('../controllers/foodController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// Public routes
router.get('/categories', getUniqueCategories);
router.get('/restaurants', getAllRestaurants);
router.get('/restaurants/:restaurantId/categories', getCategoriesByRestaurant);
router.get('/restaurants/:restaurantId/categories/:categoryId/foods', getFoodsByRestaurantAndCategory);
router.get('/restaurants/:restaurantId/foods/:id', getFoodDetails); // Secured with restaurantId

// Protected routes (user)
router.post('/order', authMiddleware, placeOrder);
router.post('/cart/add', authMiddleware, addToCart);
router.get('/cart', authMiddleware, getCart);
router.post('/cart/update', authMiddleware, updateCartItem);
router.delete('/cart/remove/:foodId', authMiddleware, removeCartItem);
router.delete('/cart/clear', authMiddleware, clearCart);
router.get('/orders/:id/track', authMiddleware, trackOrder);
router.post('/favorites', authMiddleware, addToFavorites);
router.delete('/favorites/:foodId', authMiddleware, removeFromFavorites);
router.get('/favorites', authMiddleware, getFavorites);

// Admin routes
router.post('/', authMiddleware, adminMiddleware, addFood);
router.post('/:id', authMiddleware, adminMiddleware, updateFood);
router.delete('/:id', authMiddleware, adminMiddleware, deleteFood);
router.post('/prices/category', authMiddleware, adminMiddleware, updatePricesByCategory);

module.exports = router;