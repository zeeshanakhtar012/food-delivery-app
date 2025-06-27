const express = require('express');
const router = express.Router();
const restaurantController = require('../../../controllers/admin/restaurantController');
const adminMiddleware = require('../../../middleware/adminMiddleware');
const superadminMiddleware = require('../../../middleware/superadminMiddleware');

router.post('/', superadminMiddleware, restaurantController.createRestaurant);
router.patch('/:id', adminMiddleware, restaurantController.updateRestaurant);
router.get('/', adminMiddleware, restaurantController.getRestaurantDetails);

module.exports = router;