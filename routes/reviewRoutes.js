const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// Public routes
router.get('/restaurants/:id', reviewController.getRestaurantReviews);
router.get('/foods/:id', reviewController.getFoodReviews);
router.get('/riders/:id', reviewController.getRiderReviews);

// Protected routes - user
router.use(authenticate);
router.use(authorize('user'));

router.post('/', reviewController.createReview);
router.get('/my', reviewController.getMyReviews);
router.put('/:id', reviewController.updateReview);
router.delete('/:id', reviewController.deleteReview);

module.exports = router;

