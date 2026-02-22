const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Placeholder for storage and fileFilter if they are defined elsewhere
// For this specific change, we'll define categoryStorage and uploadCategory
// If 'storage' and 'fileFilter' for 'upload' are meant to be global, they should be defined.
// Assuming 'upload' itself is not directly used for categories, but 'uploadCategory' is.

// Define a generic fileFilter for images
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'), false);
    }
};

// Define a generic handleMulterError middleware
const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ message: err.message });
    } else if (err) {
        return res.status(400).json({ message: err.message });
    }
    next();
};

// Category storage
const categoryStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads/categories');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'category-' + uniqueSuffix + path.extname(file.originalname));
    },
});

const uploadCategory = multer({
    storage: categoryStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter,
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
    handleMulterError,
    restaurantCategoryController.createCategory
);
router.get('/', restaurantCategoryController.getCategories);
router.get('/:id', restaurantCategoryController.getCategory);
router.put(
    '/:id',
    uploadCategory.single('image'),
    handleMulterError,
    restaurantCategoryController.updateCategory
);
router.delete('/:id', restaurantCategoryController.deleteCategory);

module.exports = router;

