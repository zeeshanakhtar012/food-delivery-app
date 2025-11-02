const express = require('express');
const router = express.Router();
const userCartController = require('../controllers/userCartController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// Protected routes
router.use(authenticate);
router.use(authorize('user'));

router.post('/', userCartController.addToCart);
router.get('/', userCartController.getCart);
router.get('/count', userCartController.getCartCount);
router.put('/:id', userCartController.updateCartItem);
router.delete('/:id', userCartController.removeFromCart);
router.delete('/', userCartController.clearCart);

module.exports = router;

