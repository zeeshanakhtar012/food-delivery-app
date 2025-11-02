const Notification = require('../models/PostgreSQL/Notification');
const { successResponse, errorResponse, paginatedResponse } = require('../helpers/response');
const { getPaginationParams, getPaginationMeta } = require('../utils/pagination');

// Get notifications
exports.getNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, unread_only } = req.query;
    const unreadOnly = unread_only === 'true';

    let result;
    if (req.user.role === 'user') {
      result = await Notification.getForUser(req.user.id, page, limit, unreadOnly);
    } else if (req.user.role === 'rider') {
      result = await Notification.getForRider(req.user.id, page, limit, unreadOnly);
    } else if (req.user.role === 'restaurant_admin') {
      // For restaurant admin, get notifications for restaurant
      result = await Notification.getForRestaurant(req.user.restaurant_id, page, limit, unreadOnly);
    } else {
      return errorResponse(res, 'Invalid user role', 400);
    }

    const pagination = getPaginationMeta(page, limit, result.total);

    return paginatedResponse(res, result.notifications, pagination, 'Notifications retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// Mark notification as read
exports.markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;

    let updated;
    if (req.user.role === 'user') {
      updated = await Notification.markAsRead(id, req.user.id);
    } else if (req.user.role === 'rider') {
      updated = await Notification.markAsRead(id, null, req.user.id);
    } else if (req.user.role === 'restaurant_admin') {
      updated = await Notification.markAsRead(id, null, null, req.user.restaurant_id);
    }

    if (!updated) {
      return errorResponse(res, 'Notification not found', 404);
    }

    return successResponse(res, updated, 'Notification marked as read');
  } catch (error) {
    next(error);
  }
};

// Mark all as read
exports.markAllAsRead = async (req, res, next) => {
  try {
    let count;
    if (req.user.role === 'user') {
      count = await Notification.markAllAsRead(req.user.id);
    } else if (req.user.role === 'rider') {
      count = await Notification.markAllAsRead(null, req.user.id);
    } else if (req.user.role === 'restaurant_admin') {
      count = await Notification.markAllAsRead(null, null, req.user.restaurant_id);
    }

    return successResponse(res, { count }, 'All notifications marked as read');
  } catch (error) {
    next(error);
  }
};

// Get unread count
exports.getUnreadCount = async (req, res, next) => {
  try {
    let count;
    if (req.user.role === 'user') {
      count = await Notification.getUnreadCount(req.user.id);
    } else if (req.user.role === 'rider') {
      count = await Notification.getUnreadCount(null, req.user.id);
    } else if (req.user.role === 'restaurant_admin') {
      count = await Notification.getUnreadCount(null, null, req.user.restaurant_id);
    }

    return successResponse(res, { unread_count: count }, 'Unread count retrieved');
  } catch (error) {
    next(error);
  }
};

// Delete notification
exports.deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params;

    let deleted;
    if (req.user.role === 'user') {
      deleted = await Notification.delete(id, req.user.id);
    } else if (req.user.role === 'rider') {
      deleted = await Notification.delete(id, null, req.user.id);
    } else if (req.user.role === 'restaurant_admin') {
      deleted = await Notification.delete(id, null, null, req.user.restaurant_id);
    }

    if (!deleted) {
      return errorResponse(res, 'Notification not found', 404);
    }

    return successResponse(res, null, 'Notification deleted successfully');
  } catch (error) {
    next(error);
  }
};

