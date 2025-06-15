const express = require('express');
const router = express.Router();
const {
  getMessages,
  sendMessage,
  getUserMessages
} = require('../controllers/supportController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// Protected routes
router.get('/messages', authMiddleware, getMessages);
router.post('/messages', authMiddleware, sendMessage);

// Admin routes
router.get('/messages/:userId', authMiddleware, adminMiddleware, getUserMessages);

module.exports = router;