// routes/restaurantAdminRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const restaurantAdminController = require('../controllers/restaurantAdminController');
const restaurantTableController = require('../controllers/restaurantTableController');
const {
  authenticate,
  authorize,
  requireRestaurantAccess,
} = require('../middleware/authMiddleware');

const reservationController = require('../controllers/reservationController');

// ---------------------------------------------------------------------
// Multer configuration (unchanged)
// ---------------------------------------------------------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/foods');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'food-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter,
});

// ---------------------------------------------------------------------
// Multer error-handler middleware
// ---------------------------------------------------------------------
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: { message: 'File size too large. Maximum size is 5 MB.' },
      });
    }
    return res.status(400).json({
      success: false,
      error: { message: err.message },
    });
  }
  if (err) {
    return res.status(400).json({
      success: false,
      error: { message: err.message || 'File upload error' },
    });
  }
  next();
};

// ---------------------------------------------------------------------
// PUBLIC ROUTES
// ---------------------------------------------------------------------
router.post('/login', restaurantAdminController.login);

// ---------------------------------------------------------------------
// PROTECTED ROUTES – apply auth middlewares **once**, before any route
// ---------------------------------------------------------------------
router.use(authenticate);
router.use(authorize('restaurant_admin'));
router.use(requireRestaurantAccess);

// ! TEMPORARY RIDER DB PATCH - DELETE LATER !
const { pool } = require('../config/db');
router.get('/migrate-riders', async (req, res) => {
  try {
    await pool.query('ALTER TABLE riders ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;');
    await pool.query('ALTER TABLE riders ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false;');
    await pool.query('ALTER TABLE riders ADD COLUMN IF NOT EXISTS blocked_reason TEXT;');
    await pool.query('ALTER TABLE riders ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMP;');
    await pool.query('UPDATE riders SET is_active = true WHERE is_active IS NULL;');
    res.json({ success: true, message: 'Riders table patched successfully!' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------------------------------------------------------------------
// FOOD MANAGEMENT
// ---------------------------------------------------------------------
router.post(
  '/foods',
  upload.fields([{ name: 'foodImages', maxCount: 1 }]),
  handleMulterError,
  restaurantAdminController.createFood
);

router.get('/foods', restaurantAdminController.getAllFoods);

router.put(
  '/foods/:id',
  upload.fields([{ name: 'foodImages', maxCount: 1 }]),
  handleMulterError,
  restaurantAdminController.updateFood
);

router.delete('/foods/:id', restaurantAdminController.deleteFood);

// ---------------------------------------------------------------------
// ORDER MANAGEMENT
// ---------------------------------------------------------------------
router.post('/orders', restaurantAdminController.createOrder); // [NEW] Manual Order
router.put('/orders/:id/items', restaurantAdminController.updateOrderItems); // [NEW] Add items
router.get('/orders', restaurantAdminController.getAllOrders);
router.put('/orders/:id/status', restaurantAdminController.updateOrderStatus);

// ---------------------------------------------------------------------
// TABLE MANAGEMENT
// ---------------------------------------------------------------------
router.post('/tables', restaurantTableController.createTable);
router.get('/tables', restaurantTableController.getTables);
router.get('/tables/:id/order', restaurantTableController.getTableActiveOrder); // [NEW] Get active order
router.put('/tables/:id/checkout', restaurantTableController.checkoutTable); // [NEW] Table checkout
router.put('/tables/:id', restaurantTableController.updateTable);
router.delete('/tables/:id', restaurantTableController.deleteTable);

// ---------------------------------------------------------------------
// RIDER MANAGEMENT
// ---------------------------------------------------------------------
router.post('/riders', restaurantAdminController.createRider);
router.get('/riders', restaurantAdminController.getAllRiders);
router.put('/riders/:id', restaurantAdminController.updateRider);
router.delete('/riders/:id', restaurantAdminController.deleteRider);
router.put('/riders/:id/block', restaurantAdminController.blockRider);
router.put('/riders/:id/unblock', restaurantAdminController.unblockRider);
router.get('/riders/performance', restaurantAdminController.getRiderPerformance);

// ---------------------------------------------------------------------
// RESERVATIONS
// ---------------------------------------------------------------------
router.post('/reservations', reservationController.createReservation);
router.get('/reservations', reservationController.getReservations);
router.put('/reservations/:id', reservationController.updateReservation);
router.delete('/reservations/:id', reservationController.deleteReservation);

// ---------------------------------------------------------------------
// PROFILE & RESTAURANT DETAILS
// ---------------------------------------------------------------------
router.get('/profile', restaurantAdminController.getProfile);
router.put('/profile', restaurantAdminController.updateProfile);
router.get('/restaurant', restaurantAdminController.getRestaurant); // [NEW] Get my restaurant details

// ---------------------------------------------------------------------
// ANALYTICS (basic)
// ---------------------------------------------------------------------
router.get('/analytics', restaurantAdminController.getAnalytics);

// ---------------------------------------------------------------------
// ADVANCED REPORTING & ANALYTICS
// ---------------------------------------------------------------------
router.get('/reports/sales', restaurantAdminController.getSalesReport);
router.get('/reports/income', restaurantAdminController.getIncomeReport);
router.get('/reports/top-products', restaurantAdminController.getTopProducts);
router.get('/reports/low-stock', restaurantAdminController.getLowStockItems); // Renamed from remaining-items
router.get('/reports/export', restaurantAdminController.exportReport);

// ---------------------------------------------------------------------
// PRODUCT & CATEGORY INSIGHTS
// ---------------------------------------------------------------------
router.get('/reports/products-summary', restaurantAdminController.getProductsSummary); // Moved to reports
router.get('/reports/category-performance', restaurantAdminController.getCategoryPerformance); // Moved to reports

// ---------------------------------------------------------------------
// INCOME OVERVIEW
// ---------------------------------------------------------------------
router.get('/reports/income-summary', restaurantAdminController.getIncomeSummary); // Moved to reports
router.get('/reports/income-trends', restaurantAdminController.getIncomeTrends); // Moved to reports

// ---------------------------------------------------------------------
// EXPORT THE ROUTER
// ---------------------------------------------------------------------
module.exports = router;