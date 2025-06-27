const mongoose = require('mongoose');
const Order = require('../models/Order');
const User = require('../models/User');
const Food = require('../models/Food');
const logger = require('../config/logger');

const getRestaurantAnalytics = async (restaurantId, startDate, endDate) => {
  try {
    if (!mongoose.isValidObjectId(restaurantId)) {
      throw new Error('Invalid restaurant ID');
    }
    const orders = await Order.aggregate([
      {
        $match: {
          restaurantId: mongoose.Types.ObjectId(restaurantId),
          createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
        }
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' },
          averageOrderValue: { $avg: '$totalAmount' }
        }
      }
    ]);
    const topFoods = await Order.aggregate([
      {
        $match: {
          restaurantId: mongoose.Types.ObjectId(restaurantId),
          createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
        }
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          totalQuantity: { $sum: '$items.quantity' }
        }
      },
      { $sort: { totalQuantity: -1 } },
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
          totalQuantity: 1
        }
      }
    ]);
    return {
      totalOrders: orders[0]?.totalOrders || 0,
      totalRevenue: orders[0]?.totalRevenue || 0,
      averageOrderValue: orders[0]?.averageOrderValue || 0,
      topFoods
    };
  } catch (error) {
    logger.error('Restaurant analytics error', { error: error.message });
    throw new Error(`Failed to fetch restaurant analytics: ${error.message}`);
  }
};

const getSystemAnalytics = async (startDate, endDate) => {
  try {
    const orders = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
        }
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' },
          averageOrderValue: { $avg: '$totalAmount' }
        }
      }
    ]);
    const activeUsers = await User.countDocuments({ lastLogin: { $gte: new Date(startDate) } });
    const topRestaurants = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
        }
      },
      {
        $group: {
          _id: '$restaurantId',
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' }
        }
      },
      { $sort: { totalOrders: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'restaurants',
          localField: '_id',
          foreignField: '_id',
          as: 'restaurant'
        }
      },
      { $unwind: '$restaurant' },
      {
        $project: {
          name: '$restaurant.name',
          totalOrders: 1,
          totalRevenue: 1
        }
      }
    ]);
    return {
      totalOrders: orders[0]?.totalOrders || 0,
      totalRevenue: orders[0]?.totalRevenue || 0,
      averageOrderValue: orders[0]?.averageOrderValue || 0,
      activeUsers,
      topRestaurants
    };
  } catch (error) {
    logger.error('System analytics error', { error: error.message });
    throw new Error(`Failed to fetch system analytics: ${error.message}`);
  }
};

module.exports = {
  getRestaurantAnalytics,
  getSystemAnalytics
};