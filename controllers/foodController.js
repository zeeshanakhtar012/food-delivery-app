const mongoose = require('mongoose');
const Food = require('../models/Food');
const Comment = require('../models/Comment');
const Rating = require('../models/Rating');
const Order = require('../models/Order');
const User = require('../models/User');
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

// Input validation helper for adding food
const validateAddFoodInput = (data) => {
  const errors = [];
  if (!data.name || data.name.trim().length < 3) {
    errors.push('Food name must be at least 3 characters long');
  }
  if (!data.description || data.description.trim().length < 10) {
    errors.push('Description must be at least 10 characters long');
  }
  if (!data.category || ![
    'Fast Food', 'Pizza', 'Burger', 'Desserts', 'Beverages', 'Salads', 'Pasta',
    'Seafood', 'Vegetarian', 'Vegan', 'Grill', 'Breakfast', 'Asian', 'Italian', 'Mexican'
  ].includes(data.category)) {
    errors.push('Invalid category');
  }
  if (!data.price || data.price < 0) {
    errors.push('Price must be a non-negative number');
  }
  if (data.preparationTime && data.preparationTime < 0) {
    errors.push('Preparation time cannot be negative');
  }
  if (data.nutritionalInfo) {
    if (data.nutritionalInfo.calories < 0) errors.push('Calories cannot be negative');
    if (data.nutritionalInfo.protein < 0) errors.push('Protein cannot be negative');
    if (data.nutritionalInfo.fat < 0) errors.push('Fat cannot be negative');
    if (data.nutritionalInfo.carbohydrates < 0) errors.push('Carbohydrates cannot be negative');
  }
  return errors;
};

// Get all foods (public)
exports.getAllFoods = async (req, res) => {
  try {
    const { category, search, minPrice, maxPrice, sortBy = 'createdAt', order = 'desc' } = req.query;
    const query = { isAvailable: true };

    if (category) query.category = category;
    if (search) query.$text = { $search: search };
    if (minPrice) query.price = { ...query.price, $gte: Number(minPrice) };
    if (maxPrice) query.price = { ...query.price, $lte: Number(maxPrice) };

    const sort = { [sortBy]: order === 'asc' ? 1 : -1 };

    const foods = await Food.find(query)
      .select('name description category price image averageRating ratingCount preparationTime')
      .sort(sort)
      .limit(50);

    res.status(200).json({
      message: 'Foods retrieved successfully',
      count: foods.length,
      foods
    });
  } catch (error) {
    logger.error('Get foods error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error occurred', error: error.message });
  }
};

// Get food details by ID (public)
exports.getFoodDetails = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid food ID' });
    }

    const food = await Food.findById(id)
      .select('-__v')
      .populate({
        path: 'comments',
        select: 'content userId createdAt',
        populate: {
          path: 'userId',
          select: 'name profileImage'
        },
        options: { sort: { createdAt: -1 }, limit: 20 }
      });

    if (!food) {
      return res.status(404).json({ message: 'Food not found' });
    }

    res.status(200).json({
      message: 'Food details retrieved successfully',
      food
    });
  } catch (error) {
    logger.error('Get food details error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error occurred', error: error.message });
  }
};

// Place food order (protected)
exports.placeOrder = async (req, res) => {
  console.log('Place order endpoint hit:', req.body);
  const { items, deliveryAddress, paymentMethod } = req.body;

  try {
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Items are required and must be an array' });
    }
    if (!deliveryAddress || !deliveryAddress.street || !deliveryAddress.city || 
        !deliveryAddress.state || !deliveryAddress.postalCode || !deliveryAddress.country) {
      return res.status(400).json({ message: 'Complete delivery address is required' });
    }
    if (!paymentMethod) {
      return res.status(400).json({ message: 'Payment method is required' });
    }

    const user = await User.findById(req.user.userId);
    if (!user || user.isDeleted) {
      return res.status(404).json({ message: 'User not found' });
    }

    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      if (!item.foodId || !item.quantity || item.quantity < 1) {
        return res.status(400).json({ message: 'Each item must have a valid foodId and quantity' });
      }

      const food = await Food.findById(item.foodId);
      if (!food || !food.isAvailable) {
        return res.status(400).json({ message: `Food item ${item.foodId} is not available` });
      }

      const itemTotal = food.price * item.quantity;
      totalAmount += itemTotal;

      orderItems.push({
        productId: food._id,
        quantity: item.quantity,
        price: food.price
      });
    }

    const orderId = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const order = await Order.create({
      orderId,
      userId: req.user.userId,
      items: orderItems,
      totalAmount,
      status: 'pending',
      shipping: {
        street: deliveryAddress.street,
        city: deliveryAddress.city,
        state: deliveryAddress.state,
        postalCode: deliveryAddress.postalCode,
        country: deliveryAddress.country
      }
    });

    user.orders.push(order._id);
    user.loyaltyPoints += Math.floor(totalAmount / 10);
    await user.save();

    res.status(201).json({
      message: 'Order placed successfully',
      order: {
        orderId: order.orderId,
        totalAmount: order.totalAmount,
        status: order.status,
        items: order.items,
        shipping: order.shipping,
        createdAt: order.createdAt
      }
    });
  } catch (error) {
    logger.error('Place order error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error occurred', error: error.message });
  }
};

// Add food (admin only)
exports.addFood = async (req, res) => {
  console.log('Add food endpoint hit:', req.body);
  const { name, description, category, price, image, ingredients, nutritionalInfo, preparationTime, isAvailable } = req.body;

  try {
    const errors = validateAddFoodInput(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ errors });
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
      isAvailable: isAvailable !== undefined ? isAvailable : true
    });

    res.status(201).json({
      message: 'Food added successfully',
      food: {
        _id: food._id,
        name: food.name,
        description: food.description,
        category: food.category,
        price: food.price,
        image: food.image,
        ingredients: food.ingredients,
        nutritionalInfo: food.nutritionalInfo,
        preparationTime: food.preparationTime,
        isAvailable: food.isAvailable,
        createdAt: food.createdAt
      }
    });
  } catch (error) {
    logger.error('Add food error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error occurred', error: error.message });
  }
};

// Update food prices by category (admin only)
exports.updatePricesByCategory = async (req, res) => {
  console.log('Update prices by category endpoint hit:', req.body);
  const { category, priceAdjustment, adjustmentType } = req.body;

  try {
    if (!category || ![
      'Fast Food', 'Pizza', 'Burger', 'Desserts', 'Beverages', 'Salads', 'Pasta',
      'Seafood', 'Vegetarian', 'Vegan', 'Grill', 'Breakfast', 'Asian', 'Italian', 'Mexican'
    ].includes(category)) {
      return res.status(400).json({ message: 'Valid category is required' });
    }
    if (!priceAdjustment || priceAdjustment <= 0) {
      return res.status(400).json({ message: 'Price adjustment must be a positive number' });
    }
    if (!adjustmentType || !['fixed', 'percentage'].includes(adjustmentType)) {
      return res.status(400).json({ message: 'Adjustment type must be "fixed" or "percentage"' });
    }

    const updateQuery = adjustmentType === 'fixed'
      ? { $set: { price: { $add: ['$price', priceAdjustment] } } }
      : { $set: { price: { $mul: ['$price', 1 + priceAdjustment / 100] } } };

    const result = await Food.updateMany(
      { category, isAvailable: true },
      updateQuery,
      { runValidators: true }
    );

    res.status(200).json({
      message: 'Prices updated successfully',
      modifiedCount: result.modifiedCount,
      matchedCount: result.matchedCount
    });
  } catch (error) {
    logger.error('Update prices by category error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error occurred', error: error.message });
  }
};