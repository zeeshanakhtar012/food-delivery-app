const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const AppUser = require('../models/AppUser');
const Restaurant = require('../models/Restaurant');
const Category = require('../models/Category');
const Food = require('../models/Food');
const Order = require('../models/Order');
const AuditLog = require('../models/AuditLog');
const winston = require('winston');

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
    await AuditLog.create({ action, entity, entityId, details, performedBy });
  } catch (error) {
    logger.error('Audit log error', { error: error.message, stack: error.stack });
  }
};

// Restaurant Admin Login
const signinRestaurantAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Basic input validation
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    // Find restaurant admin
    const user = await AppUser.findOne({ email, role: 'restaurant_admin' });
    if (!user || user.isDeleted) {
      return res.status(401).json({ message: 'Invalid email or account deactivated' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, role: 'restaurant_admin', isAdmin: true, restaurantId: user.restaurantId },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Log audit action
    await logAdminAction(
      'SIGNIN_RESTAURANT_ADMIN',
      'User',
      user._id,
      `Restaurant admin signed in with email: ${email}`,
      user._id
    );

    console.log(`Restaurant admin signed in: ${email}`);
    res.json({ message: 'Signed in successfully', token });
  } catch (error) {
    logger.error('Restaurant admin signin error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Restaurant Details
const getRestaurantDetails = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.user.restaurantId)
      .select('name description address email phone logo isActive')
      .populate('createdBy', 'name email');
    if (!restaurant || !restaurant.isActive) {
      return res.status(404).json({ message: 'Restaurant not found or inactive' });
    }

    console.log(`Restaurant details retrieved for ID: ${req.user.restaurantId}`);
    res.json({ message: 'Restaurant details retrieved successfully', restaurant });
  } catch (error) {
    logger.error('Get restaurant details error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Add Food Category
const addCategory = async (req, res) => {
  try {
    const { name } = req.body;

    // Validate input
    if (!name || name.trim().length < 3) {
      return res.status(400).json({ message: 'Category name must be at least 3 characters' });
    }

    // Check if category already exists for this restaurant
    const existingCategory = await Category.findOne({ name, restaurantId: req.user.restaurantId });
    if (existingCategory) {
      return res.status(400).json({ message: 'Category already exists for this restaurant' });
    }

    // Create category
    const category = new Category({
      name,
      restaurantId: req.user.restaurantId,
      createdBy: req.user.userId,
      isActive: true,
    });

    await category.save();

    // Log audit action
    await logAdminAction(
      'CREATE_CATEGORY',
      'Category',
      category._id,
      `Category ${name} created for restaurant ${req.user.restaurantId}`,
      req.user.userId
    );

    console.log(`Category created: ${name}`);
    res.status(201).json({ message: 'Category created successfully', category });
  } catch (error) {
    logger.error('Add category error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Validate food input
const validateAddFoodInput = (data) => {
  const errors = [];
  if (!data.name || data.name.trim().length < 3) errors.push('Food name must be at least 3 characters');
  if (!data.description || data.description.trim().length < 10) errors.push('Description must be at least 10 characters');
  if (!data.category || !mongoose.isValidObjectId(data.category)) errors.push('Valid category ID is required');
  if (!data.price || data.price < 0) errors.push('Price must be a non-negative number');
  if (data.preparationTime && data.preparationTime < 0) errors.push('Preparation time cannot be negative');
  if (data.nutritionalInfo) {
    if (data.nutritionalInfo.calories < 0) errors.push('Calories cannot be negative');
    if (data.nutritionalInfo.protein < 0) errors.push('Protein cannot be negative');
    if (data.nutritionalInfo.fat < 0) errors.push('Fat cannot be negative');
    if (data.nutritionalInfo.carbohydrates < 0) errors.push('Carbohydrates cannot be negative');
  }
  return errors;
};

// Add Food
const addFood = async (req, res) => {
  const { name, description, category, price, image, ingredients, nutritionalInfo, preparationTime, isAvailable } = req.body;

  try {
    const errors = validateAddFoodInput(req.body);
    if (errors.length > 0) return res.status(400).json({ errors });

    const categoryDoc = await Category.findById(category);
    if (!categoryDoc || categoryDoc.restaurantId.toString() !== req.user.restaurantId.toString()) {
      return res.status(403).json({ message: 'Unauthorized to add food to this category' });
    }

    const restaurant = await Restaurant.findById(req.user.restaurantId);
    if (!restaurant || !restaurant.isActive) {
      return res.status(404).json({ message: 'Restaurant not found or inactive' });
    }

    const food = await Food.create({
      name,
      description,
      category,
      price,
      image: image || 'https://images.unsplash.com/photo-1504674900247-0877df9cc926?q=80&w=2070&auto=format&fit=crop',
      ingredients: ingredients || [],
      nutritionalInfo: nutritionalInfo || { calories: 0, protein: 0, fat: 0, carbohydrates: 0 },
      preparationTime: preparationTime || 15,
      isAvailable: isAvailable !== undefined ? isAvailable : true,
      restaurantId: req.user.restaurantId,
      city: restaurant.address.city
    });

    await logAdminAction(
      'CREATE_FOOD',
      'Food',
      food._id,
      `Food ${name} added for restaurant ${req.user.restaurantId}`,
      req.user.userId
    );

    console.log(`Food added: ${name}`);
    res.status(201).json({ message: 'Food added successfully', food });
  } catch (error) {
    logger.error('Add food error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update Food
const updateFood = async (req, res) => {
  const { id } = req.params;
  const { name, description, category, price, image, ingredients, nutritionalInfo, preparationTime, isAvailable } = req.body;

  try {
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid food ID' });

    const errors = validateAddFoodInput(req.body);
    if (errors.length > 0) return res.status(400).json({ errors });

    const food = await Food.findById(id);
    if (!food || food.restaurantId.toString() !== req.user.restaurantId.toString()) {
      return res.status(403).json({ message: 'Unauthorized to update this food' });
    }

    const categoryDoc = await Category.findById(category);
    if (!categoryDoc || categoryDoc.restaurantId.toString() !== req.user.restaurantId.toString()) {
      return res.status(403).json({ message: 'Unauthorized to use this category' });
    }

    const updatedFood = await Food.findByIdAndUpdate(
      id,
      { $set: { name, description, category, price, image, ingredients, nutritionalInfo, preparationTime, isAvailable } },
      { new: true, runValidators: true }
    );

    await logAdminAction(
      'UPDATE_FOOD',
      'Food',
      updatedFood._id,
      `Food ${name} updated for restaurant ${req.user.restaurantId}`,
      req.user.userId
    );

    console.log(`Food updated: ${name}`);
    res.status(200).json({ message: 'Food updated successfully', food: updatedFood });
  } catch (error) {
    logger.error('Update food error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete Food
const deleteFood = async (req, res) => {
  const { id } = req.params;

  try {
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid food ID' });

    const food = await Food.findById(id);
    if (!food || food.restaurantId.toString() !== req.user.restaurantId.toString()) {
      return res.status(403).json({ message: 'Unauthorized to delete this food' });
    }

    await Food.findByIdAndDelete(id);

    await logAdminAction(
      'DELETE_FOOD',
      'Food',
      food._id,
      `Food ${food.name} deleted for restaurant ${req.user.restaurantId}`,
      req.user.userId
    );

    console.log(`Food deleted: ${food.name}`);
    res.status(200).json({ message: 'Food deleted successfully' });
  } catch (error) {
    logger.error('Delete food error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Restaurant Orders
const getRestaurantOrders = async (req, res) => {
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

    console.log(`Orders retrieved for restaurant: ${req.user.restaurantId}`);
    res.status(200).json({ message: 'Orders retrieved successfully', count: orders.length, orders });
  } catch (error) {
    logger.error('Get restaurant orders error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Accept Order
const acceptOrder = async (req, res) => {
  const { id } = req.params;

  try {
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid order ID' });

    const order = await Order.findById(id);
    if (!order || order.restaurantId.toString() !== req.user.restaurantId.toString()) {
      return res.status(403).json({ message: 'Unauthorized to accept this order' });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({ message: 'Order must be in pending status to accept' });
    }

    order.status = 'processing';
    await order.save();

    await logAdminAction(
      'ACCEPT_ORDER',
      'Order',
      order._id,
      `Order ${order.orderId} accepted for restaurant ${req.user.restaurantId}`,
      req.user.userId
    );

    console.log(`Order accepted: ${order.orderId}`);
    res.status(200).json({ message: 'Order accepted successfully', order });
  } catch (error) {
    logger.error('Accept order error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Reject Order
const rejectOrder = async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  try {
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid order ID' });
    if (!reason) return res.status(400).json({ message: 'Reason is required for rejection' });

    const order = await Order.findById(id);
    if (!order || order.restaurantId.toString() !== req.user.restaurantId.toString()) {
      return res.status(403).json({ message: 'Unauthorized to reject this order' });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({ message: 'Order must be in pending status to reject' });
    }

    order.status = 'cancelled';
    order.reason = reason;
    await order.save();

    await logAdminAction(
      'REJECT_ORDER',
      'Order',
      order._id,
      `Order ${order.orderId} rejected for restaurant ${req.user.restaurantId} with reason: ${reason}`,
      req.user.userId
    );

    console.log(`Order rejected: ${order.orderId}`);
    res.status(200).json({ message: 'Order rejected successfully', order });
  } catch (error) {
    logger.error('Reject order error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update Restaurant Order Status
const updateRestaurantOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status, reason } = req.body;

  try {
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid order ID' });
    if (!status || !['pending', 'processing', 'shipped', 'delivered', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    if (status === 'cancelled' && !reason) return res.status(400).json({ message: 'Reason is required for cancellation' });

    const order = await Order.findById(id);
    if (!order || order.restaurantId.toString() !== req.user.restaurantId.toString()) {
      return res.status(403).json({ message: 'Unauthorized to update this order' });
    }

    order.status = status;
    if (status === 'cancelled') order.reason = reason;
    await order.save();

    await logAdminAction(
      'UPDATE_ORDER_STATUS',
      'Order',
      order._id,
      `Order ${order.orderId} status updated to ${status} for restaurant ${req.user.restaurantId}`,
      req.user.userId
    );

    console.log(`Order status updated: ${order.orderId} to ${status}`);
    res.status(200).json({ message: 'Order status updated successfully', order });
  } catch (error) {
    logger.error('Update restaurant order status error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Restaurant Analytics
const getRestaurantAnalytics = async (req, res) => {
  try {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 6);

    const [orderStats, revenueStats, topFoods] = await Promise.all([
      Order.aggregate([
        { $match: { restaurantId: mongoose.Types.ObjectId(req.user.restaurantId), createdAt: { $gte: startDate } } },
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
        { $match: { restaurantId: mongoose.Types.ObjectId(req.user.restaurantId), createdAt: { $gte: startDate }, status: 'delivered' } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalAmount' },
            averageOrderValue: { $avg: '$totalAmount' }
          }
        }
      ]),
      Order.aggregate([
        { $match: { restaurantId: mongoose.Types.ObjectId(req.user.restaurantId), createdAt: { $gte: startDate } } },
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

    console.log(`Analytics retrieved for restaurant: ${req.user.restaurantId}`);
    res.status(200).json({
      message: 'Analytics retrieved successfully',
      analytics: {
        orders: orderStats[0] || { totalOrders: 0, pendingOrders: 0, deliveredOrders: 0, cancelledOrders: 0 },
        revenue: revenueStats[0] || { totalRevenue: 0, averageOrderValue: 0 },
        topFoods
      }
    });
  } catch (error) {
    logger.error('Get restaurant analytics error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  signinRestaurantAdmin,
  getRestaurantDetails,
  addCategory,
  addFood,
  updateFood,
  deleteFood,
  getRestaurantOrders,
  acceptOrder,
  rejectOrder,
  updateRestaurantOrderStatus,
  getRestaurantAnalytics
};