const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// Protected routes - user
router.use(authenticate);
router.use(authorize('user'));

router.post('/', paymentController.createPayment);
router.post('/stripe', paymentController.createStripePayment);
router.post('/:id/confirm', paymentController.confirmPayment);
router.get('/:id', paymentController.getPayment);
router.get('/', paymentController.getMyPayments);

module.exports = router;

