const express = require('express');
const router = express.Router();
const restaurantCategoryController = require('../controllers/restaurantCategoryController');
const { authenticate, authorize, requireRestaurantAccess } = require('../middleware/authMiddleware');

// Protected routes
router.use(authenticate);
router.use(authorize('restaurant_admin'));
router.use(requireRestaurantAccess);

router.post('/', restaurantCategoryController.createCategory);
router.get('/', restaurantCategoryController.getCategories);
router.get('/:id', restaurantCategoryController.getCategory);
router.put('/:id', restaurantCategoryController.updateCategory);
router.delete('/:id', restaurantCategoryController.deleteCategory);

module.exports = router;

