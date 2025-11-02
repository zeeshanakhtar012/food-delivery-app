const ChatMessage = require('../models/PostgreSQL/ChatMessage');
const { successResponse, errorResponse, paginatedResponse } = require('../helpers/response');
const { getPaginationParams, getPaginationMeta } = require('../utils/pagination');

// Send message
exports.sendMessage = async (req, res, next) => {
  try {
    const { order_id, receiver_id, receiver_type, message } = req.body;

    if (!receiver_id || !receiver_type || !message) {
      return errorResponse(res, 'Receiver ID, receiver type, and message are required', 400);
    }

    const validReceiverTypes = ['user', 'rider', 'restaurant_admin'];
    if (!validReceiverTypes.includes(receiver_type)) {
      return errorResponse(res, `Invalid receiver type. Must be one of: ${validReceiverTypes.join(', ')}`, 400);
    }

    // Determine sender type from user role
    const sender_type = req.user.role === 'user' ? 'user' : 
                       req.user.role === 'rider' ? 'rider' : 
                       'restaurant_admin';

    const chatMessage = await ChatMessage.create({
      order_id: order_id || null,
      sender_id: req.user.id,
      sender_type,
      receiver_id,
      receiver_type,
      message
    });

    // Emit via Socket.IO
    const io = req.app.get('io');
    if (io && order_id) {
      io.to(`order:${order_id}`).emit('chatMessage', chatMessage);
    }

    return successResponse(res, chatMessage, 'Message sent successfully', 201);
  } catch (error) {
    next(error);
  }
};

// Get order messages
exports.getOrderMessages = async (req, res, next) => {
  try {
    const { order_id } = req.params;
    const { page = 1, limit = 50 } = getPaginationParams(req);

    // Verify order access
    const Order = require('../models/PostgreSQL/Order');
    const order = await Order.findById(order_id);

    if (!order) {
      return errorResponse(res, 'Order not found', 404);
    }

    // Check access based on role
    const hasAccess = 
      (req.user.role === 'user' && order.user_id === req.user.id) ||
      (req.user.role === 'rider' && order.rider_id === req.user.id) ||
      (req.user.role === 'restaurant_admin' && order.restaurant_id === req.user.restaurant_id);

    if (!hasAccess) {
      return errorResponse(res, 'Access denied', 403);
    }

    const result = await ChatMessage.getOrderMessages(order_id, page, limit);
    const pagination = getPaginationMeta(page, limit, result.total);

    return paginatedResponse(res, result.messages, pagination, 'Messages retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// Mark messages as read
exports.markAsRead = async (req, res, next) => {
  try {
    const { order_id } = req.params;

    const sender_type = req.user.role === 'user' ? 'user' : 
                       req.user.role === 'rider' ? 'rider' : 
                       'restaurant_admin';

    const count = await ChatMessage.markAsRead(req.user.id, sender_type, order_id || null);
    return successResponse(res, { count }, 'Messages marked as read');
  } catch (error) {
    next(error);
  }
};

// Get unread count
exports.getUnreadCount = async (req, res, next) => {
  try {
    const sender_type = req.user.role === 'user' ? 'user' : 
                       req.user.role === 'rider' ? 'rider' : 
                       'restaurant_admin';

    const count = await ChatMessage.getUnreadCount(req.user.id, sender_type);
    return successResponse(res, { unread_count: count }, 'Unread count retrieved');
  } catch (error) {
    next(error);
  }
};

