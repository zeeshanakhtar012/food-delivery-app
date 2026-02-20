const express = require('express');
const router = express.Router();
const reservationController = require('../controllers/restaurantReservationController');
const { authenticate, authorize, requireRestaurantAccess } = require('../middleware/authMiddleware');

router.use(authenticate);
router.use(authorize('restaurant_admin'));
router.use(requireRestaurantAccess);

router.post('/', reservationController.createReservation);
router.get('/', reservationController.getReservations);
router.put('/:id', reservationController.updateReservation);
router.delete('/:id', reservationController.deleteReservation);

module.exports = router;
