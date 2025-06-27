const express = require('express');
const router = express.Router();
const cartController = require('../../../controllers/user/cartController');
const authMiddleware = require('../../../middleware/authMiddleware');

router.get('/', authMiddleware, cartController.getCart);
router.post('/items', authMiddleware, cartController.addToCart);
router.patch('/items/:foodId', authMiddleware, cartController.updateCartItem);
router.delete('/items/:foodId', authMiddleware, cartController.removeFromCart);
router.delete('/', authMiddleware, cartController.clearCart);

module.exports = router;