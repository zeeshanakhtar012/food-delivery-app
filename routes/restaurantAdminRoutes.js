const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const restaurantAdminController = require('../controllers/restaurantAdminController');
const { authenticate, authorize, requireRestaurantAccess } = require('../middleware/authMiddleware');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/foods');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'food-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Accept only image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: fileFilter
});

// Error handler for multer errors
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: { message: 'File size too large. Maximum size is 5MB.' }
      });
    }
    return res.status(400).json({
      success: false,
      error: { message: err.message }
    });
  }
  if (err) {
    return res.status(400).json({
      success: false,
      error: { message: err.message || 'File upload error' }
    });
  }
  next();
};

// Public route
router.post('/login', restaurantAdminController.login);

// Protected routes - require restaurant admin authentication
router.use(authenticate);
router.use(authorize('restaurant_admin'));
router.use(requireRestaurantAccess);

// Food management
router.post('/foods', 
  upload.fields([{ name: 'foodImages', maxCount: 1 }]), 
  handleMulterError,
  restaurantAdminController.createFood
);
router.get('/foods', restaurantAdminController.getAllFoods);
router.put('/foods/:id', 
  upload.fields([{ name: 'foodImages', maxCount: 1 }]), 
  handleMulterError,
  restaurantAdminController.updateFood
);
router.delete('/foods/:id', restaurantAdminController.deleteFood);

// Order management
router.get('/orders', restaurantAdminController.getAllOrders);
router.put('/orders/:id/status', restaurantAdminController.updateOrderStatus);

// Rider management
router.post('/riders', restaurantAdminController.createRider);
router.get('/riders', restaurantAdminController.getAllRiders);

// Profile
router.get('/profile', restaurantAdminController.getProfile);
router.put('/profile', restaurantAdminController.updateProfile);

// Analytics
router.get('/analytics', restaurantAdminController.getAnalytics);

module.exports = router;

