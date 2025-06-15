const mongoose = require('mongoose');
const Message = require('../models/Message');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const winston = require('winston');

// Configure Winston logger
const logger = winston.createLogger({
  level: 'error',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

// Log action
const logAction = async (action, entity, entityId, details, performedBy) => {
  try {
    await AuditLog.create({
      action,
      entity,
      entityId,
      details,
      performedBy
    });
  } catch (error) {
    logger.error('Audit log error', { error: error.message, stack: error.stack });
  }
};

// Get message history for user
exports.getMessages = async (req, res) => {
  console.log('Get messages endpoint hit');
  try {
    const messages = await Message.find({ userId: req.user.userId })
      .select('senderType content isRead createdAt')
      .sort({ createdAt: 1 })
      .limit(50);

    res.status(200).json({
      message: 'Messages retrieved successfully',
      count: messages.length,
      messages
    });
  } catch (error) {
    logger.error('Get messages error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Send message (REST fallback)
exports.sendMessage = async (req, res) => {
  console.log('Send message endpoint hit:', req.body);
  const { content } = req.body;

  try {
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ message: 'Message content is required' });
    }

    // Sanitize content
    const sanitizedContent = content.trim().substring(0, 1000);

    const message = await Message.create({
      userId: req.user.userId,
      senderType: req.user.isAdmin ? 'admin' : 'user',
      content: sanitizedContent
    });

    await logAction(
      'Send Support Message',
      'Message',
      message._id,
      `Sent message: ${sanitizedContent}`,
      req.user.userId
    );

    res.status(201).json({
      message: 'Message sent successfully',
      data: {
        _id: message._id,
        userId: message.userId,
        senderType: message.senderType,
        content: message.content,
        createdAt: message.createdAt
      }
    });
  } catch (error) {
    logger.error('Send message error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get message history for a specific user (admin only)
exports.getUserMessages = async (req, res) => {
  console.log('Get user messages endpoint hit:', req.params);
  const { userId } = req.params;

  try {
    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const user = await User.findById(userId).select('_id');
    if (!user || user.isDeleted) {
      return res.status(404).json({ message: 'User not found' });
    }

    const messages = await Message.find({ userId })
      .select('senderType content isRead createdAt')
      .sort({ createdAt: 1 })
      .limit(50);

    res.status(200).json({
      message: 'User messages retrieved successfully',
      count: messages.length,
      messages
    });
  } catch (error) {
    logger.error('Get user messages error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};