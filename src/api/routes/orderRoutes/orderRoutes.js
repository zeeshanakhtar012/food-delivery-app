const express = require('express');
const router = express.Router();
const orderController = require('../../../controllers/order/orderController');
const authMiddleware = require('../../../middleware/authMiddleware');

router.post('/', authMiddleware, orderController.createOrder);
router.get('/user', authMiddleware, orderController.getUserOrders);
router.get('/track/:id', authMiddleware, orderController.trackOrder);
router.patch('/cancel/:id', authMiddleware, orderController.cancelOrder);

module.exports = router;