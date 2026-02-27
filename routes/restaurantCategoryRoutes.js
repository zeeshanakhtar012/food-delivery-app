const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { getUploadMiddleware } = require('../services/uploadService');

// Initialize upload middleware for categories
const uploadCategory = getUploadMiddleware({
    fieldName: 'image',
    maxCount: 1,
    maxSize: 5 * 1024 * 1024 // 5 MB
});
const restaurantCategoryController = require('../controllers/restaurantCategoryController');
const { authenticate, authorize, requireRestaurantAccess } = require('../middleware/authMiddleware');

// Protected routes
router.use(authenticate);
router.use(authorize('restaurant_admin'));
router.use(requireRestaurantAccess);

router.post(
    '/',
    uploadCategory.single('image'),
    restaurantCategoryController.createCategory
);
router.get('/', restaurantCategoryController.getCategories);
router.get('/:id', restaurantCategoryController.getCategory);
router.put(
    '/:id',
    uploadCategory.single('image'),
    restaurantCategoryController.updateCategory
);
router.delete('/:id', restaurantCategoryController.deleteCategory);

module.exports = router;

