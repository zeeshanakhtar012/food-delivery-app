const mongoose = require('mongoose');
const Restaurant = require('../../../models/Restaurant');
const User = require('../../../models/User');
const City = require('../../../models/City');
const Order = require('../../../models/Order');
const AuditLog = require('../../../models/AuditLog');
const FoodCategory = require('../../../models/FoodCategory');
const Food = require('../../../models/Food');
const Advertisement = require('../../../models/Advertisement');
const Notification = require('../../../models/Notification');
const Discount = require('../../../models/Discount');
const Comment = require('../../../models/Comment');
const Rating = require('../../../models/Rating');
const Cart = require('../../../models/Cart');
const { getSystemAnalytics } = require('../../../services/analyticsService');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'error',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

exports.getAllRestaurants = async (req, res) => {
  try {
    const { isActive, city, sortBy = 'createdAt', order = 'desc' } = req.query;
    const query = {};
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (city) query.city = city;
    const sort = { [sortBy]: order === 'asc' ? 1 : -1 };
    const restaurants = await Restaurant.find(query)
      .populate('adminId', 'name email')
      .populate('createdBy', 'name email')
      .sort(sort)
      .limit(50);
    res.status(200).json({
      message: 'Restaurants retrieved successfully',
      count: restaurants.length,
      restaurants
    });
  } catch (error) {
    logger.error('Get restaurants error', { error: error.message });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.toggleRestaurantBlock = async (req, res) => {
  const { id } = req.params;
  try {
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid restaurant ID' });
    }
    const restaurant = await Restaurant.findById(id);
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }
    restaurant.isActive = !restaurant.isActive;
    await restaurant.save();
    await AuditLog.create({
      action: restaurant.isActive ? 'Unblock Restaurant' : 'Block Restaurant',
      entity: 'Restaurant',
      entityId: restaurant._id,
      restaurantId: restaurant.restaurantId,
      details: `Restaurant ${restaurant.name} ${restaurant.isActive ? 'unblocked' : 'blocked'}`,
      performedBy: req.user.userId
    });
    res.status(200).json({
      message: `Restaurant ${restaurant.isActive ? 'unblocked' : 'blocked'} successfully`,
      restaurant: {
        _id: restaurant._id,
        name: restaurant.name,
        isActive: restaurant.isActive
      }
    });
  } catch (error) {
    logger.error('Toggle restaurant block error', { error: error.message });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.deleteRestaurant = async (req, res) => {
  const { id } = req.params;
  try {
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid restaurant ID' });
    }
    const restaurant = await Restaurant.findById(id);
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }
    await Food.deleteMany({ restaurantId: restaurant.restaurantId });
    await Order.deleteMany({ restaurantId: restaurant.restaurantId });
    await User.updateMany(
      { restaurantId: restaurant.restaurantId },
      { $set: { restaurantId: null, role: 'customer' } }
    );
    await Advertisement.deleteMany({ restaurantId: restaurant.restaurantId });
    await Notification.deleteMany({ restaurantId: restaurant.restaurantId });
    await Discount.deleteMany({ restaurantId: restaurant.restaurantId });
    await Comment.deleteMany({ restaurantId: restaurant.restaurantId });
    await Rating.deleteMany({ restaurantId: restaurant.restaurantId });
    await Cart.deleteMany({ restaurantId: restaurant.restaurantId });
    await FoodCategory.deleteMany({ restaurantId: restaurant.restaurantId });
    await restaurant.remove();
    await AuditLog.create({
      action: 'Delete Restaurant',
      entity: 'Restaurant',
      entityId: restaurant._id,
      restaurantId: restaurant.restaurantId,
      details: `Deleted restaurant: ${restaurant.name}`,
      performedBy: req.user.userId
    });
    res.status(200).json({ message: 'Restaurant deleted successfully' });
  } catch (error) {
    logger.error('Delete restaurant error', { error: error.message });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getSystemAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 6));
    const end = endDate ? new Date(endDate) : new Date();
    if (end < start) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }
    const analytics = await getSystemAnalytics(start, end);
    res.status(200).json({
      message: 'System analytics retrieved successfully',
      analytics
    });
  } catch (error) {
    logger.error('Get system analytics error', { error: error.message });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getSystemAuditLogs = async (req, res) => {
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
      message: 'System audit logs retrieved successfully',
      count: logs.length,
      logs
    });
  } catch (error) {
    logger.error('Get system audit logs error', { error: error.message });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.createFoodCategory = async (req, res) => {
  const { name, restaurantId, city } = req.body;
  try {
    if (!name || name.trim().length < 3) {
      return res.status(400).json({ message: 'Category name must be at least 3 characters long' });
    }
    if (restaurantId && !city) {
      return res.status(400).json({ message: 'City is required when restaurantId is provided' });
    }
    if (restaurantId) {
      const restaurant = await Restaurant.findOne({ restaurantId });
      if (!restaurant) {
        return res.status(404).json({ message: 'Restaurant not found' });
      }
      const cityExists = await City.findOne({ name: city });
      if (!cityExists) {
        return res.status(404).json({ message: 'City not found' });
      }
    }
    const existingCategory = await FoodCategory.findOne({ name, restaurantId: restaurantId || null, city: city || null });
    if (existingCategory) {
      return res.status(400).json({ message: 'Category already exists' });
    }
    const category = await FoodCategory.create({
      name,
      restaurantId: restaurantId || null,
      city: city || null,
      createdBy: req.user.userId
    });
    await AuditLog.create({
      action: 'Create Food Category',
      entity: 'FoodCategory',
      entityId: category._id,
      restaurantId: restaurantId || null,
      details: `Created food category: ${name}`,
      performedBy: req.user.userId
    });
    res.status(201).json({
      message: 'Food category created successfully',
      category
    });
  } catch (error) {
    logger.error('Create food category error', { error: error.message });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};