const express = require('express');
const router = express.Router();
const bannerController = require('../controllers/bannerController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// Public route
router.get('/active', bannerController.getActiveBanners);

// Protected routes - super admin or restaurant admin
router.use(authenticate);
router.use(authorize('super_admin', 'restaurant_admin'));

router.post('/', bannerController.createBanner);
router.get('/', bannerController.getAllBanners);
router.get('/:id', bannerController.getBanner);
router.put('/:id', bannerController.updateBanner);
router.delete('/:id', bannerController.deleteBanner);

module.exports = router;

