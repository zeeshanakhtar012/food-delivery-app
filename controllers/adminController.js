const mongoose = require('mongoose');
const User = require('../models/User');
const Food = require('../models/Food');
const Order = require('../models/Order');
const AppConfig = require('../models/AppConfig');
const Advertisement = require('../models/Advertisement');
const Notification = require('../models/Notification');
const Discount = require('../models/Discount');
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

// Log admin action
const logAdminAction = async (action, entity, entityId, details, performedBy) => {
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

// Validate app config input
const validateAppConfigInput = (data) => {
  const errors = [];
  if (data.primaryColor && !/^#[0-9A-F]{6}$/.test(data.primaryColor)) {
    errors.push('Primary color must be a valid hex code');
  }
  if (data.secondaryColor && !/^#[0-9A-F]{6}$/.test(data.secondaryColor)) {
    errors.push('Secondary color must be a valid hex code');
  }
  if (data.logoUrl && !/^https?:\/\/.*\.(png|jpg|jpeg|svg)$/.test(data.logoUrl)) {
    errors.push('Logo URL must be a valid image URL');
  }
  if (data.splashScreenUrl && !/^https?:\/\/.*\.(png|jpg|jpeg)$/.test(data.splashScreenUrl)) {
    errors.push('Splash screen URL must be a valid image URL');
  }
  return errors;
};

// Update app configuration
exports.updateAppConfig = async (req, res) => {
  console.log('Update app config endpoint hit:', req.body);
  const { primaryColor, secondaryColor, logoUrl, splashScreenUrl, enableAds, enableNotifications } = req.body;

  try {
    const errors = validateAppConfigInput(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const updateData = {
      primaryColor,
      secondaryColor,
      logoUrl,
      splashScreenUrl,
      enableAds: enableAds !== undefined ? enableAds : true,
      enableNotifications: enableNotifications !== undefined ? enableNotifications : true,
      lastUpdatedBy: req.user.userId
    };

    const config = await AppConfig.findOneAndUpdate(
      {},
      { $set: updateData },
      { new: true, upsert: true, runValidators: true }
    );

    await logAdminAction(
      'Update App Config',
      'AppConfig',
      config._id,
      `Updated app configuration: ${JSON.stringify(updateData)}`,
      req.user.userId
    );

    res.status(200).json({
      message: 'App configuration updated successfully',
      config
    });
  } catch (error) {
    logger.error('Update app config error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error occurred', error: error.message });
  }
};

// Get app configuration
exports.getAppConfig = async (req, res) => {
  try {
    const config = await AppConfig.findOne({});
    if (!config) {
      return res.status(404).json({ message: 'App configuration not found' });
    }

    res.status(200).json({
      message: 'App configuration retrieved successfully',
      config
    });
  } catch (error) {
    logger.error('Get app config error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error occurred', error: error.message });
  }
};

// Create advertisement
exports.createAdvertisement = async (req, res) => {
  console.log('Create advertisement endpoint hit:', req.body);
  const { title, description, imageUrl, foodId, targetUrl, startDate, endDate, isActive } = req.body;

  try {
    if (!title || !description || !imageUrl || !startDate || !endDate) {
      return res.status(400).json({ message: 'Title, description, image URL, start date, and end date are required' });
    }
    if (!/^https?:\/\/.*\.(png|jpg|jpeg)$/.test(imageUrl)) {
      return res.status(400).json({ message: 'Image URL must be a valid image URL' });
    }
    if (foodId && !mongoose.isValidObjectId(foodId)) {
      return res.status(400).json({ message: 'Invalid food ID' });
    }
    if (new Date(endDate) <= new Date(startDate)) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }

    const ad = await Advertisement.create({
      title,
      description,
      imageUrl,
      foodId: foodId || null,
      targetUrl: targetUrl || null,
      startDate,
      endDate,
      isActive: isActive !== undefined ? isActive : true,
      createdBy: req.user.userId
    });

    await logAdminAction(
      'Create Advertisement',
      'Advertisement',
      ad._id,
      `Created ad: ${title}`,
      req.user.userId
    );

    res.status(201).json({
      message: 'Advertisement created successfully',
      advertisement: ad
    });
  } catch (error) {
    logger.error('Create advertisement error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error occurred', error: error.message });
  }
};

// Get all advertisements
exports.getAllAdvertisements = async (req, res) => {
  try {
    const { isActive, sortBy = 'createdAt', order = 'desc' } = req.query;
    const query = {};
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const sort = { [sortBy]: order === 'asc' ? 1 : -1 };

    const ads = await Advertisement.find(query)
      .populate('foodId', 'name price')
      .sort(sort)
      .limit(50);

    res.status(200).json({
      message: 'Advertisements retrieved successfully',
      count: ads.length,
      advertisements: ads
    });
  } catch (error) {
    logger.error('Get advertisements error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error occurred', error: error.message });
  }
};

// Update advertisement
exports.updateAdvertisement = async (req, res) => {
  console.log('Update advertisement endpoint hit:', req.body);
  const { id } = req.params;
  const { title, description, imageUrl, foodId, targetUrl, startDate, endDate, isActive } = req.body;

  try {
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid advertisement ID' });
    }
    if (imageUrl && !/^https?:\/\/.*\.(png|jpg|jpeg)$/.test(imageUrl)) {
      return res.status(400).json({ message: 'Image URL must be a valid image URL' });
    }
    if (foodId && !mongoose.isValidObjectId(foodId)) {
      return res.status(400).json({ message: 'Invalid food ID' });
    }
    if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }

    const updateData = {
      title,
      description,
      imageUrl,
      foodId: foodId || null,
      targetUrl: targetUrl || null,
      startDate,
      endDate,
      isActive,
      createdBy: req.user.userId
    };

    const ad = await Advertisement.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!ad) {
      return res.status(404).json({ message: 'Advertisement not found' });
    }

    await logAdminAction(
      'Update Advertisement',
      'Advertisement',
      ad._id,
      `Updated ad: ${title}`,
      req.user.userId
    );

    res.status(200).json({
      message: 'Advertisement updated successfully',
      advertisement: ad
    });
  } catch (error) {
    logger.error('Update advertisement error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error occurred', error: error.message });
  }
};

// Delete advertisement
exports.deleteAdvertisement = async (req, res) => {
  console.log('Delete advertisement endpoint hit:', req.params);
  const { id } = req.params;

  try {
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid advertisement ID' });
    }

    const ad = await Advertisement.findByIdAndDelete(id);
    if (!ad) {
      return res.status(404).json({ message: 'Advertisement not found' });
    }

    await logAdminAction(
      'Delete Advertisement',
      'Advertisement',
      ad._id,
      `Deleted ad: ${ad.title}`,
      req.user.userId
    );

    res.status(200).json({ message: 'Advertisement deleted successfully' });
  } catch (error) {
    logger.error('Delete advertisement error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error occurred', error: error.message });
  }
};

// Send push notification
exports.sendPushNotification = async (req, res) => {
  console.log('Send push notification endpoint hit:', req.body);
  const { title, message, targetUsers, foodId } = req.body;

  try {
    if (!title || !message) {
      return res.status(400).json({ message: 'Title and message are required' });
    }
    if (targetUsers && !Array.isArray(targetUsers)) {
      return res.status(400).json({ message: 'Target users must be an array' });
    }
    if (foodId && !mongoose.isValidObjectId(foodId)) {
      return res.status(400).json({ message: 'Invalid food ID' });
    }

    const notification = await Notification.create({
      title,
      message,
      targetUsers: targetUsers || [],
      foodId: foodId || null,
      createdBy: req.user.userId
    });

    await logAdminAction(
      'Send Notification',
      'Notification',
      notification._id,
      `Sent notification: ${title}`,
      req.user.userId
    );

    // Simulate sending push notification (integrate with Firebase/OneSignal in production)
    console.log('Push notification sent:', { title, message, targetUsers: targetUsers || 'All users' });

    res.status(200).json({
      message: 'Notification sent successfully',
      notification
    });
  } catch (error) {
    logger.error('Send notification error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error occurred', error: error.message });
  }
};

// Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const { isDeleted, sortBy = 'createdAt', order = 'desc' } = req.query;
    const query = {};
    if (isDeleted !== undefined) query.isDeleted = isDeleted === 'true';

    const sort = { [sortBy]: order === 'asc' ? 1 : -1 };

    const users = await User.find(query)
      .select('name email phone isAdmin isDeleted createdAt lastLogin')
      .sort(sort)
      .limit(50);

    res.status(200).json({
      message: 'Users retrieved successfully',
      count: users.length,
      users
    });
  } catch (error) {
    logger.error('Get users error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error occurred', error: error.message });
  }
};

// Toggle user block status
exports.toggleUserBlock = async (req, res) => {
  console.log('Toggle user block endpoint hit:', req.params);
  const { id } = req.params;

  try {
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    if (id === req.user.userId.toString()) {
      return res.status(400).json({ message: 'Cannot block yourself' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.isDeleted = !user.isDeleted;
    user.deletedAt = user.isDeleted ? new Date() : null;
    await user.save();

    await logAdminAction(
      user.isDeleted ? 'Block User' : 'Unblock User',
      'User',
      user._id,
      `User ${user.email} ${user.isDeleted ? 'blocked' : 'unblocked'}`,
      req.user.userId
    );

    res.status(200).json({
      message: `User ${user.isDeleted ? 'blocked' : 'unblocked'} successfully`,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        isDeleted: user.isDeleted
      }
    });
  } catch (error) {
    logger.error('Toggle user block error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error occurred', error: error.message });
  }
};

// Toggle admin status
exports.toggleAdminStatus = async (req, res) => {
  console.log('Toggle admin status endpoint hit:', req.params);
  const { id } = req.params;

  try {
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    if (id === req.user.userId.toString()) {
      return res.status(400).json({ message: 'Cannot change your own admin status' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.isAdmin = !user.isAdmin;
    await user.save();

    await logAdminAction(
      user.isAdmin ? 'Grant Admin' : 'Revoke Admin',
      'User',
      user._id,
      `User ${user.email} ${user.isAdmin ? 'granted' : 'revoked'} admin status`,
      req.user.userId
    );

    res.status(200).json({
      message: `User ${user.isAdmin ? 'granted' : 'revoked'} admin status successfully`,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin
      }
    });
  } catch (error) {
    logger.error('Toggle admin status error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error occurred', error: error.message });
  }
};

// Get all orders
exports.getAllOrders = async (req, res) => {
  try {
    const { status, sortBy = 'createdAt', order = 'desc' } = req.query;
    const query = {};
    if (status) query.status = status;

    const sort = { [sortBy]: order === 'asc' ? 1 : -1 };

    const orders = await Order.find(query)
      .populate('userId', 'name email')
      .populate('items.productId', 'name price')
      .sort(sort)
      .limit(50);

    res.status(200).json({
      message: 'Orders retrieved successfully',
      count: orders.length,
      orders
    });
  } catch (error) {
    logger.error('Get orders error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error occurred', error: error.message });
  }
};

// Update order status
exports.updateOrderStatus = async (req, res) => {
  console.log('Update order status endpoint hit:', req.body);
  const { id } = req.params;
  const { status, reason } = req.body;

  try {
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid order ID' });
    }
    if (!status || !['pending', 'processing', 'shipped', 'delivered', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    if (status === 'cancelled' && !reason) {
      return res.status(400).json({ message: 'Reason is required for cancellation' });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    order.status = status;
    if (status === 'cancelled') order.reason = reason;
    await order.save();

    if (status === 'cancelled') {
      const user = await User.findById(order.userId);
      if (user) {
        user.orders.pull(order._id);
        user.cancelledOrders.push(order._id);
        await user.save();
      }
    }

    await logAdminAction(
      'Update Order Status',
      'Order',
      order._id,
      `Updated order ${order.orderId} to status: ${status}`,
      req.user.userId
    );

    res.status(200).json({
      message: 'Order status updated successfully',
      order
    });
  } catch (error) {
    logger.error('Update order status error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error occurred', error: error.message });
  }
};

// Get dashboard analytics
exports.getDashboardAnalytics = async (req, res) => {
  try {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 6); // Last 6 months

    const [userStats, orderStats, revenueStats, topFoods] = await Promise.all([
      User.aggregate([
        {
          $group: {
            _id: null,
            totalUsers: { $sum: 1 },
            activeUsers: { $sum: { $cond: [{ $eq: ['$isDeleted', false] }, 1, 0] } },
            adminUsers: { $sum: { $cond: [{ $eq: ['$isAdmin', true] }, 1, 0] } }
          }
        }
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            pendingOrders: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
            deliveredOrders: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
            cancelledOrders: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } }
          }
        }
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: startDate }, status: 'delivered' } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalAmount' },
            averageOrderValue: { $avg: '$totalAmount' }
          }
        }
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.productId',
            totalSold: { $sum: '$items.quantity' }
          }
        },
        { $sort: { totalSold: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'foods',
            localField: '_id',
            foreignField: '_id',
            as: 'food'
          }
        },
        { $unwind: '$food' },
        {
          $project: {
            name: '$food.name',
            category: '$food.category',
            totalSold: 1
          }
        }
      ])
    ]);

    res.status(200).json({
      message: 'Analytics retrieved successfully',
      analytics: {
        users: userStats[0] || { totalUsers: 0, activeUsers: 0, adminUsers: 0 },
        orders: orderStats[0] || { totalOrders: 0, pendingOrders: 0, deliveredOrders: 0, cancelledOrders: 0 },
        revenue: revenueStats[0] || { totalRevenue: 0, averageOrderValue: 0 },
        topFoods
      }
    });
  } catch (error) {
    logger.error('Get analytics error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error occurred', error: error.message });
  }
};

// Create discount
exports.createDiscount = async (req, res) => {
  console.log('Create discount endpoint hit:', req.body);
  const { code, description, discountType, value, minOrderAmount, maxDiscountAmount, startDate, endDate, isActive } = req.body;

  try {
    if (!code || !discountType || !value || !startDate || !endDate) {
      return res.status(400).json({ message: 'Code, discount type, value, start date, and end date are required' });
    }
    if (!['percentage', 'fixed'].includes(discountType)) {
      return res.status(400).json({ message: 'Invalid discount type' });
    }
    if (value <= 0) {
      return res.status(400).json({ message: 'Value must be positive' });
    }
    if (minOrderAmount && minOrderAmount < 0) {
      return res.status(400).json({ message: 'Minimum order amount cannot be negative' });
    }
    if (maxDiscountAmount && maxDiscountAmount < 0) {
      return res.status(400).json({ message: 'Maximum discount amount cannot be negative' });
    }
    if (new Date(endDate) <= new Date(startDate)) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }

    const discount = await Discount.create({
      code: code.toUpperCase(),
      description,
      discountType,
      value,
      minOrderAmount: minOrderAmount || 0,
      maxDiscountAmount: maxDiscountAmount || null,
      startDate,
      endDate,
      isActive: isActive !== undefined ? isActive : true,
      createdBy: req.user.userId
    });

    await logAdminAction(
      'Create Discount',
      'Discount',
      discount._id,
      `Created discount: ${code}`,
      req.user.userId
    );

    res.status(201).json({
      message: 'Discount created successfully',
      discount
    });
  } catch (error) {
    logger.error('Create discount error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error occurred', error: error.message });
  }
};

// Get all discounts
exports.getAllDiscounts = async (req, res) => {
  try {
    const { isActive, sortBy = 'createdAt', order = 'desc' } = req.query;
    const query = {};
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const sort = { [sortBy]: order === 'asc' ? 1 : -1 };

    const discounts = await Discount.find(query)
      .sort(sort)
      .limit(50);

    res.status(200).json({
      message: 'Discounts retrieved successfully',
      count: discounts.length,
      discounts
    });
  } catch (error) {
    logger.error('Get discounts error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error occurred', error: error.message });
  }
};

// Update discount
exports.updateDiscount = async (req, res) => {
  console.log('Update discount endpoint hit:', req.body);
  const { id } = req.params;
  const { code, description, discountType, value, minOrderAmount, maxDiscountAmount, startDate, endDate, isActive } = req.body;

  try {
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid discount ID' });
    }
    if (discountType && !['percentage', 'fixed'].includes(discountType)) {
      return res.status(400).json({ message: 'Invalid discount type' });
    }
    if (value && value <= 0) {
      return res.status(400).json({ message: 'Value must be positive' });
    }
    if (minOrderAmount && minOrderAmount < 0) {
      return res.status(400).json({ message: 'Minimum order amount cannot be negative' });
    }
    if (maxDiscountAmount && maxDiscountAmount < 0) {
      return res.status(400).json({ message: 'Maximum discount amount cannot be negative' });
    }
    if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }

    const updateData = {
      code: code ? code.toUpperCase() : undefined,
      description,
      discountType,
      value,
      minOrderAmount,
      maxDiscountAmount,
      startDate,
      endDate,
      isActive,
      createdBy: req.user.userId
    };

    const discount = await Discount.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!discount) {
      return res.status(404).json({ message: 'Discount not found' });
    }

    await logAdminAction(
      'Update Discount',
      'Discount',
      discount._id,
      `Updated discount: ${discount.code}`,
      req.user.userId
    );

    res.status(200).json({
      message: 'Discount updated successfully',
      discount
    });
  } catch (error) {
    logger.error('Update discount error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error occurred', error: error.message });
  }
};

// Delete discount
exports.deleteDiscount = async (req, res) => {
  console.log('Delete discount endpoint hit:', req.params);
  const { id } = req.params;

  try {
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid discount ID' });
    }

    const discount = await Discount.findByIdAndDelete(id);
    if (!discount) {
      return res.status(404).json({ message: 'Discount not found' });
    }

    await logAdminAction(
      'Delete Discount',
      'Discount',
      discount._id,
      `Deleted discount: ${discount.code}`,
      req.user.userId
    );

    res.status(200).json({ message: 'Discount deleted successfully' });
  } catch (error) {
    logger.error('Delete discount error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error occurred', error: error.message });
  }
};

// Get audit logs
exports.getAuditLogs = async (req, res) => {
  try {
    const { action, entity, sortBy = 'createdAt', order = 'desc' } = req.query;
    const query = {};
    if (action) query.action = action;
    if (entity) query.entity = entity;

    const sort = { [sortBy]: order === 'asc' ? 1 : -1 };

    const logs = await AuditLog.find(query)
      .populate('performedBy', 'name email')
      .sort(sort)
      .limit(50);

    res.status(200).json({
      message: 'Audit logs retrieved successfully',
      count: logs.length,
      logs
    });
  } catch (error) {
    logger.error('Get audit logs error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error occurred', error: error.message });
  }
};