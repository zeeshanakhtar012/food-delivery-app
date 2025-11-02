const express = require('express');
const router = express.Router();
const userFavoriteController = require('../controllers/userFavoriteController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// Protected routes
router.use(authenticate);
router.use(authorize('user'));

// Restaurant favorites
router.post('/restaurants', userFavoriteController.addFavoriteRestaurant);
router.delete('/restaurants/:restaurant_id', userFavoriteController.removeFavoriteRestaurant);
router.get('/restaurants', userFavoriteController.getFavoriteRestaurants);
router.get('/restaurants/:restaurant_id/check', userFavoriteController.isFavoriteRestaurant);

// Food favorites
router.post('/foods', userFavoriteController.addFavoriteFood);
router.delete('/foods/:food_id', userFavoriteController.removeFavoriteFood);
router.get('/foods', userFavoriteController.getFavoriteFoods);
router.get('/foods/:food_id/check', userFavoriteController.isFavoriteFood);

module.exports = router;

