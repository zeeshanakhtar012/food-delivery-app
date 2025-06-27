const mongoose = require('mongoose');
const Message = require('../../../models/Message');
const Restaurant = require('../../../models/Restaurant');
const AuditLog = require('../../../models/AuditLog');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'error',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

exports.sendMessage = async (req, res) => {
  const { restaurantId, content } = req.body;
  try {
    if (!mongoose.isValidObjectId(restaurantId)) {
      return res.status(400).json({ message: 'Invalid restaurant ID' });
    }
    if (!content || content.trim().length < 1) {
      return res.status(400).json({ message: 'Message content is required' });
    }
    const restaurant = await Restaurant.findOne({ restaurantId });
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }
    const message = await Message.create({
      userId: req.user.userId,
      restaurantId,
      senderType: 'user',
      content
    });
    await AuditLog.create({
      action: 'Send Message',
      entity: 'Message',
      entityId: message._id,
      restaurantId,
      details: `User sent message to restaurant ${restaurantId}`,
      performedBy: req.user.userId
    });
    res.status(201).json({
      message: 'Message sent successfully',
      message: message
    });
  } catch (error) {
    logger.error('Send message error', { error: error.message });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const messages = await Message.find({ restaurantId: req.user.restaurantId })
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(50);
    res.status(200).json({
      message: 'Messages retrieved successfully',
      count: messages.length,
      messages
    });
  } catch (error) {
    logger.error('Get messages error', { error: error.message });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.markMessageAsRead = async (req, res) => {
  const { id } = req.params;
  try {
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid message ID' });
    }
    const message = await Message.findOne({ _id: id, restaurantId: req.user.restaurantId });
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    message.isRead = true;
    await message.save();
    await AuditLog.create({
      action: 'Mark Message as Read',
      entity: 'Message',
      entityId: message._id,
      restaurantId: req.user.restaurantId,
      details: `Marked message ${id} as read`,
      performedBy: req.user.userId
    });
    res.status(200).json({
      message: 'Message marked as read successfully',
      message
    });
  } catch (error) {
    logger.error('Mark message as read error', { error: error.message });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};