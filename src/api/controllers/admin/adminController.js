const mongoose = require('mongoose');
const User = require('../../../models/User');
const Order = require('../../../models/Order');
const AppConfig = require('../../../models/AppConfig');
const Advertisement = require('../../../models/Advertisement');
const Notification = require('../../../models/Notification');
const Discount = require('../../../models/Discount');
const AuditLog = require('../../../models/AuditLog');
const Restaurant = require('../../../models/Restaurant');
const { getRestaurantAnalytics } = require('../../../services/analyticsService');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'error',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

exports.updateAppConfig = async (req, res) => {
  const { enableAds, enableNotifications } = req.body;
  try {
    const updateData = {
      enableAds: enableAds !== undefined ? enableAds : true,
      enableNotifications: enableNotifications !== undefined ? enableNotifications : true,
      lastUpdatedBy: req.user.userId
    };
    const config = await AppConfig.findOneAndUpdate(
      {},
      { $set: updateData },
      { new: true, upsert: true, runValidators: true }
    );
    await AuditLog.create({
      action: 'Update App Config',
      entity: 'AppConfig',
      entityId: config._id,
      restaurantId: req.user.restaurantId,
      details: `Updated app configuration: ${JSON.stringify(updateData)}`,
      performedBy: req.user.userId
    });
    res.status(200).json({
      message: 'App configuration updated successfully',
      config
    });
  } catch (error) {
    logger.error('Update app config error', { error: error.message });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

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
    logger.error('Get app config error', { error: error.message });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.createAdvertisement = async (req, res) => {
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
    const restaurant = await Restaurant.findOne({ restaurantId: req.user.restaurantId });
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }
    const ad = await Advertisement.create({
      title,
      description,
      imageUrl,
      restaurantId: req.user.restaurantId,
      city: restaurant.city,
      foodId: foodId || null,
      targetUrl: targetUrl || null,
      startDate,
      endDate,
      isActive: isActive !== undefined ? isActive : true,
      createdBy: req.user.userId
    });
    await AuditLog.create({
      action: 'Create Advertisement',
      entity: 'Advertisement',
      entityId: ad._id,
      restaurantId: req.user.restaurantId,
      details: `Created ad: ${title}`,
      performedBy: req.user.userId
    });
    res.status(201).json({
      message: 'Advertisement created successfully',
      advertisement: ad
    });
  } catch (error) {
    logger.error('Create advertisement error', { error: error.message });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getAllAdvertisements = async (req, res) => {
  try {
    const { isActive, sortBy = 'createdAt', order = 'desc' } = req.query;
    const query = { restaurantId: req.user.restaurantId };
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
    logger.error('Get advertisements error', { error: error.message });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateAdvertisement = async (req, res) => {
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
    const ad = await Advertisement.findOneAndUpdate(
      { _id: id, restaurantId: req.user.restaurantId },
      { $set: updateData },
      { new: true, runValidators: true }
    );
    if (!ad) {
      return res.status(404).json({ message: 'Advertisement not found' });
    }
    await AuditLog.create({
      action: 'Update Advertisement',
      entity: 'Advertisement',
      entityId: ad._id,
      restaurantId: req.user.restaurantId,
      details: `Updated ad: ${title}`,
      performedBy: req.user.userId
    });
    res.status(200).json({
      message: 'Advertisement updated successfully',
      advertisement: ad
    });
  } catch (error) {
    logger.error('Update advertisement error', { error: error.message });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.deleteAdvertisement = async (req, res) => {
  const { id } = req.params;
  try {
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid advertisement ID' });
    }
    const ad = await Advertisement.findOneAndDelete({ _id: id, restaurantId: req.user.restaurantId });
    if (!ad) {
      return res.status(404).json({ message: 'Advertisement not found' });
    }
    await AuditLog.create({
      action: 'Delete Advertisement',
      entity: 'Advertisement',
      entityId: ad._id,
      restaurantId: req.user.restaurantId,
      details: `Deleted ad: ${ad.title}`,
      performedBy: req.user.userId
    });
    res.status(200).json({ message: 'Advertisement deleted successfully' });
  } catch (error) {
    logger.error('Delete advertisement error', { error: error.message });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.sendPushNotification = async (req, res) => {
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
    const restaurant = await Restaurant.findOne({ restaurantId: req.user.restaurantId });
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }
    const notification = await Notification.create({
      title,
      message,
      targetUsers: targetUsers || [],
      foodId: foodId || null,
      restaurantId: req.user.restaurantId,
      city: restaurant.city,
      createdBy: req.user.userId
    });
    await AuditLog.create({
      action: 'Send Notification',
      entity: 'Notification',
      entityId: notification._id,
      restaurantId: req.user.restaurantId,
      details: `Sent notification: ${title}`,
      performedBy: req.user.userId
    });
    res.status(200).json({
      message: 'Notification sent successfully',
      notification
    });
  } catch (error) {
    logger.error('Send notification error', { error: error.message });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const { isDeleted, sortBy = 'createdAt', order = 'desc' } = req.query;
    const query = { restaurantId: req.user.restaurantId };
    if (isDeleted !== undefined) query.isDeleted = isDeleted === 'true';
    const sort = { [sortBy]: order === 'asc' ? 1 : -1 };
    const users = await User.find(query)
      .select('name email phone role restaurantId isDeleted createdAt lastLogin')
      .sort(sort)
      .limit(50);
    res.status(200).json({
      message: 'Users retrieved successfully',
      count: users.length,
      users
    });
  } catch (error) {
    logger.error('Get users error', { error: error.message });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.toggleUserBlock = async (req, res) => {
  const { id } = req.params;
  try {
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    if (id === req.user.userId.toString()) {
      return res.status(400).json({ message: 'Cannot block yourself' });
    }
    const user = await User.findById(id);
    if (!user || user.restaurantId !== req.user.restaurantId) {
      return res.status(404).json({ message: 'User not found' });
    }
    user.isDeleted = !user.isDeleted;
    user.deletedAt = user.isDeleted ? new Date() : null;
    await user.save();
    await AuditLog.create({
      action: user.isDeleted ? 'Block User' : 'Unblock User',
      entity: 'User',
      entityId: user._id,
      restaurantId: req.user.restaurantId,
      details: `User ${user.email} ${user.isDeleted ? 'blocked' : 'unblocked'}`,
      performedBy: req.user.userId
    });
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
    logger.error('Toggle user block error', { error: error.message });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.toggleAdminStatus = async (req, res) => {
  const { id } = req.params;
  try {
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    if (id === req.user.userId.toString()) {
      return res.status(400).json({ message: 'Cannot change your own admin status' });
    }
    const user = await User.findById(id);
    if (!user || user.restaurantId !== req.user.restaurantId) {
      return res.status(404).json({ message: 'User not found' });
    }
    user.role = user.role === 'admin' ? 'customer' : 'admin';
    await user.save();
    await AuditLog.create({
      action: user.role === 'admin' ? 'Grant Admin' : 'Revoke Admin',
      entity: 'User',
      entityId: user._id,
      restaurantId: req.user.restaurantId,
      details: `User ${user.email} ${user.role === 'admin' ? 'granted' : 'revoked'} admin status`,
      performedBy: req.user.userId
    });
    res.status(200).json({
      message: `User ${user.role === 'admin' ? 'granted' : 'revoked'} admin status successfully`,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    logger.error('Toggle admin status error', { error: error.message });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getAllOrders = async (req, res) => {
  try {
    const { status, sortBy = 'createdAt', order = 'desc' } = req.query;
    const query = { restaurantId: req.user.restaurantId };
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
    logger.error('Get orders error', { error: error.message });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateOrderStatus = async (req, res) => {
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
    const order = await Order.findOne({ _id: id, restaurantId: req.user.restaurantId });
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
    await AuditLog.create({
      action: 'Update Order Status',
      entity: 'Order',
      entityId: order._id,
      restaurantId: req.user.restaurantId,
      details: `Updated order ${order.orderId} to status: ${status}`,
      performedBy: req.user.userId
    });
    res.status(200).json({
      message: 'Order status updated successfully',
      order
    });
  } catch (error) {
    logger.error('Update order status error', { error: error.message });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getDashboardAnalytics = async (req, res) => {
  try {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 6);
    const analytics = await getRestaurantAnalytics(req.user.restaurantId, startDate, new Date());
    res.status(200).json({
      message: 'Analytics retrieved successfully',
      analytics
    });
  } catch (error) {
    logger.error('Get analytics error', { error: error.message });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.createDiscount = async (req, res) => {
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
    const restaurant = await Restaurant.findOne({ restaurantId: req.user.restaurantId });
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
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
      restaurantId: req.user.restaurantId,
      city: restaurant.city,
      createdBy: req.user.userId
    });
    await AuditLog.create({
      action: 'Create Discount',
      entity: 'Discount',
      entityId: discount._id,
      restaurantId: req.user.restaurantId,
      details: `Created discount: ${code}`,
      performedBy: req.user.userId
    });
    res.status(201).json({
      message: 'Discount created successfully',
      discount
    });
  } catch (error) {
    logger.error('Create discount error', { error: error.message });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getAllDiscounts = async (req, res) => {
  try {
    const { isActive, sortBy = 'createdAt', order = 'desc' } = req.query;
    const query = { restaurantId: req.user.restaurantId };
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
    logger.error('Get discounts error', { error: error.message });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateDiscount = async (req, res) => {
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
    const discount = await Discount.findOneAndUpdate(
      { _id: id, restaurantId: req.user.restaurantId },
      { $set: updateData },
      { new: true, runValidators: true }
    );
    if (!discount) {
      return res.status(404).json({ message: 'Discount not found' });
    }
    await AuditLog.create({
      action: 'Update Discount',
      entity: 'Discount',
      entityId: discount._id,
      restaurantId: req.user.restaurantId,
      details: `Updated discount: ${discount.code}`,
      performedBy: req.user.userId
    });
    res.status(200).json({
      message: 'Discount updated successfully',
      discount
    });
  } catch (error) {
    logger.error('Update discount error', { error: error.message });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.deleteDiscount = async (req, res) => {
  const { id } = req.params;
  try {
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid discount ID' });
    }
    const discount = await Discount.findOneAndDelete({ _id: id, restaurantId: req.user.restaurantId });
    if (!discount) {
      return res.status(404).json({ message: 'Discount not found' });
    }
    await AuditLog.create({
      action: 'Delete Discount',
      entity: 'Discount',
      entityId: discount._id,
      restaurantId: req.user.restaurantId,
      details: `Deleted discount: ${discount.code}`,
      performedBy: req.user.userId
    });
    res.status(200).json({ message: 'Discount deleted successfully' });
  } catch (error) {
    logger.error('Delete discount error', { error: error.message });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getAuditLogs = async (req, res) => {
  try {
    const { action, entity, sortBy = 'createdAt', order = 'desc' } = req.query;
    const query = { restaurantId: req.user.restaurantId };
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
    logger.error('Get audit logs error', { error: error.message });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};