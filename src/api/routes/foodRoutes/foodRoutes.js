const express = require('express');
const router = express.Router();
const foodController = require('../../../controllers/food/foodController');
const authMiddleware = require('../../../middleware/authMiddleware');
const adminMiddleware = require('../../../middleware/adminMiddleware');

router.get('/', foodController.getAllFoods);
router.get('/:id', foodController.getFoodDetails);
router.post('/', authMiddleware, adminMiddleware, foodController.addFood);
router.patch('/:id', authMiddleware, adminMiddleware, foodController.updateFood);
router.patch('/category/update-prices', authMiddleware, adminMiddleware, foodController.updatePricesByCategory);
router.post('/comment', authMiddleware, foodController.addComment);
router.post('/rating', authMiddleware, foodController.addRating);

module.exports = router;