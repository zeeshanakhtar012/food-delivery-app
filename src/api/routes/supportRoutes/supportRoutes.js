const express = require('express');
const router = express.Router();
const supportController = require('../../../controllers/support/supportController');
const authMiddleware = require('../../../middleware/authMiddleware');
const adminMiddleware = require('../../../middleware/adminMiddleware');

router.post('/messages', authMiddleware, supportController.sendMessage);
router.get('/messages', authMiddleware, adminMiddleware, supportController.getMessages);
router.patch('/messages/:id/read', authMiddleware, adminMiddleware, supportController.markMessageAsRead);

module.exports = router;