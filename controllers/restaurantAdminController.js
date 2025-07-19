const mongoose = require('mongoose');
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

// Add food (restaurant admin)
exports.addFood = async (req, res) => {
  const { name, description, category, price, image, ingredients, nutritionalInfo, preparationTime, isAvailable } = req.body;

  try {
    const errors = validateAddFoodInput(req.body);
    if (errors.length > 0) return res.status(400).json({ errors });

    const categoryDoc = await Category.findById(category);
    if (!categoryDoc || categoryDoc.restaurantId.toString() !== req.user.restaurantId.toString()) {
      return res.status(403).json({ message: 'Unauthorized to add food to this category' });
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
      city: categoryDoc.restaurantId.address.city
    });

    await logAdminAction(
      'Add Food',
      'Food',
      food._id,
      `Added food ${name} for restaurant ${req.user.restaurantId}`,
      req.user.userId
    );

    res.status(201).json({ message: 'Food added successfully', food });
  } catch (error) {
    logger.error('Add food error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error occurred', error: error.message });
  }
};

// Update food (restaurant admin)
exports.updateFood = async (req, res) => {
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
      'Update Food',
      'Food',
      updatedFood._id,
      `Updated food: ${name}`,
      req.user.userId
    );

    res.status(200).json({ message: 'Food updated successfully', food: updatedFood });
  } catch (error) {
    logger.error('Update food error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error occurred', error: error.message });
  }
};

// Delete food (restaurant admin)
exports.deleteFood = async (req, res) => {
  const { id } = req.params;

  try {
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid food ID' });

    const food = await Food.findById(id);
    if (!food || food.restaurantId.toString() !== req.user.restaurantId.toString()) {
      return res.status(403).json({ message: 'Unauthorized to delete this food' });
    }

    await Food.findByIdAndDelete(id);

    await logAdminAction(
      'Delete Food',
      'Food',
      food._id,
      `Deleted food: ${food.name}`,
      req.user.userId
    );

    res.status(200).json({ message: 'Food deleted successfully' });
  } catch (error) {
    logger.error('Delete food error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error occurred', error: error.message });
  }
};

// Get restaurant orders (restaurant admin)
exports.getRestaurantOrders = async (req, res) => {
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

    res.status(200).json({ message: 'Orders retrieved successfully', count: orders.length, orders });
  } catch (error) {
    logger.error('Get restaurant orders error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error occurred', error: error.message });
  }
};

// Update restaurant order status (restaurant admin)
exports.updateRestaurantOrderStatus = async (req, res) => {
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
      'Update Order Status',
      'Order',
      order._id,
      `Updated order ${order.orderId} to status: ${status}`,
      req.user.userId
    );

    res.status(200).json({ message: 'Order status updated successfully', order });
  } catch (error) {
    logger.error('Update restaurant order status error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error occurred', error: error.message });
  }
};

// Get restaurant analytics (restaurant admin)
exports.getRestaurantAnalytics = async (req, res) => {
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
    res.status(500).json({ message: 'Server error occurred', error: error.message });
  }
};