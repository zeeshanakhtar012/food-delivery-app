const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// Protected routes
router.use(authenticate);
router.use(authorize('user', 'rider', 'restaurant_admin'));

router.post('/send', chatController.sendMessage);
router.get('/orders/:order_id', chatController.getOrderMessages);
router.put('/orders/:order_id/read', chatController.markAsRead);
router.get('/unread/count', chatController.getUnreadCount);

module.exports = router;

