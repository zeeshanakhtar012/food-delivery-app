const express = require('express');
const router = express.Router();
const restaurantAddonController = require('../controllers/restaurantAddonController');
const { authenticate, authorize, requireRestaurantAccess } = require('../middleware/authMiddleware');

// Protected routes
router.use(authenticate);
router.use(authorize('restaurant_admin'));
router.use(requireRestaurantAccess);

router.post('/', restaurantAddonController.createAddon);
router.get('/foods/:food_id', restaurantAddonController.getFoodAddons);
router.put('/:id', restaurantAddonController.updateAddon);
router.delete('/:id', restaurantAddonController.deleteAddon);

module.exports = router;

