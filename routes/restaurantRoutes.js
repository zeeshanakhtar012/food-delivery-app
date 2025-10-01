const express = require('express');
const router = express.Router();
const {
  createRestaurant,
  updateRestaurant,
  deleteRestaurant,
  getRestaurantImages,
  getRestaurantDetails,
  createCategory,
  updateCategory,
  deleteCategory
} = require('../controllers/restaurantController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// Public routes
router.get('/:id/images', getRestaurantImages);
router.get('/:id', getRestaurantDetails);

// Super admin routes (protected)
router.use(authMiddleware);
router.use(adminMiddleware);
router.post('/', createRestaurant);
router.put('/:id', updateRestaurant);
router.delete('/:id', deleteRestaurant);
router.post('/categories', createCategory);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

module.exports = router;