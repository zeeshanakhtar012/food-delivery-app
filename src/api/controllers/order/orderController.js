const mongoose = require('mongoose');
const Order = require('../../../models/Order');
const Food = require('../../../models/Food');
const User = require('../../../models/User');
const Cart = require('../../../models/Cart');
const AuditLog = require('../../../models/AuditLog');
const { generateUniqueOrderId } = require('../../../utils/generateIds');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'error',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

exports.createOrder = async (req, res) => {
  const { items, shipping, discountCode } = req.body;
  try {
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Items are required' });
    }
    if (!shipping || !shipping.street || !shipping.city || !shipping.state || !shipping.postalCode || !shipping.country) {
      return res.status(400).json({ message: 'Complete shipping address is required' });
    }
    const foodIds = items.map(item => item.productId);
    const foods = await Food.find({ _id: { $in: foodIds }, isAvailable: true });
    if (foods.length !== items.length) {
      return res.status(400).json({ message: 'Some foods are not available or invalid' });
    }
    const restaurantId = foods[0].restaurantId;
    const city = foods[0].city;
    if (!foods.every(food => food.restaurantId === restaurantId && food.city === city)) {
      return res.status(400).json({ message: 'All items must belong to the same restaurant and city' });
    }
    let totalAmount = 0;
    const orderItems = [];
    for (const item of items) {
      const food = foods.find(f => f._id.toString() === item.productId);
      if (!food || item.quantity < 1) {
        return res.status(400).json({ message: `Invalid item or quantity for ${food ? food.name : 'food'}` });
      }
      orderItems.push({
        productId: food._id,
        quantity: item.quantity,
        price: food.price
      });
      totalAmount += food.price * item.quantity;
    }
    if (discountCode) {
      const discount = await Discount.findOne({
        code: discountCode.toUpperCase(),
        restaurantId,
        isActive: true,
        startDate: { $lte: new Date() },
        endDate: { $gte: new Date() }
      });
      if (discount) {
        if (totalAmount >= discount.minOrderAmount) {
          if (discount.discountType === 'percentage') {
            let discountAmount = (discount.value / 100) * totalAmount;
            if (discount.maxDiscountAmount && discountAmount > discount.maxDiscountAmount) {
              discountAmount = discount.maxDiscountAmount;
            }
            totalAmount -= discountAmount;
          } else if (discount.discountType === 'fixed') {
            totalAmount = Math.max(0, totalAmount - discount.value);
          }
        }
      }
    }
    const order = await Order.create({
      orderId: generateUniqueOrderId(),
      userId: req.user.userId,
      restaurantId,
      city,
      items: orderItems,
      totalAmount,
      shipping,
      estimatedDeliveryTime: new Date(Date.now() + 30 * 60 * 1000)
    });
    await User.findByIdAndUpdate(req.user.userId, { $push: { orders: order._id } });
    await Cart.findOneAndDelete({ userId: req.user.userId, restaurantId });
    await AuditLog.create({
      action: 'Create Order',
      entity: 'Order',
      entityId: order._id,
      restaurantId,
      details: `Created order ${order.orderId} with total ${totalAmount}`,
      performedBy: req.user.userId
    });
    res.status(201).json({
      message: 'Order created successfully',
      order
    });
  } catch (error) {
    logger.error('Create order error', { error: error.message });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getUserOrders = async (req, res) => {
  try {
    const { status, sortBy = 'createdAt', order = 'desc' } = req.query;
    const query = { userId: req.user.userId };
    if (status) query.status = status;
    const sort = { [sortBy]: order === 'asc' ? 1 : -1 };
    const orders = await Order.find(query)
      .populate('items.productId', 'name price')
      .sort(sort)
      .limit(50);
    res.status(200).json({
      message: 'Orders retrieved successfully',
      count: orders.length,
      orders
    });
  } catch (error) {
    logger.error('Get user orders error', { error: error.message });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.trackOrder = async (req, res) => {
  const { id } = req.params;
  try {
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid order ID' });
    }
    const order = await Order.findOne({ _id: id, userId: req.user.userId })
      .populate('items.productId', 'name price');
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.status(200).json({
      message: 'Order details retrieved successfully',
      order
    });
  } catch (error) {
    logger.error('Track order error', { error: error.message });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.cancelOrder = async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  try {
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid order ID' });
    }
    if (!reason) {
      return res.status(400).json({ message: 'Cancellation reason is required' });
    }
    const order = await Order.findOne({ _id: id, userId: req.user.userId });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    if (order.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending orders can be cancelled' });
    }
    order.status = 'cancelled';
    order.reason = reason;
    await order.save();
    await User.findByIdAndUpdate(req.user.userId, {
      $pull: { orders: order._id },
      $push: { cancelledOrders: order._id }
    });
    await AuditLog.create({
      action: 'Cancel Order',
      entity: 'Order',
      entityId: order._id,
      restaurantId: order.restaurantId,
      details: `Cancelled order ${order.orderId} with reason: ${reason}`,
      performedBy: req.user.userId
    });
    res.status(200).json({
      message: 'Order cancelled successfully',
      order
    });
  } catch (error) {
    logger.error('Cancel order error', { error: error.message });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};