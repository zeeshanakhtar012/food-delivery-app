const mongoose = require('mongoose');
const Food = require('../../../models/Food');
const FoodCategory = require('../../../models/FoodCategory');
const Comment = require('../../../models/Comment');
const Rating = require('../../../models/Rating');
const AuditLog = require('../../../models/AuditLog');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'error',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

exports.getAllFoods = async (req, res) => {
  try {
    const { city, restaurantId, categoryId, search, sortBy = 'createdAt', order = 'desc' } = req.query;
    const query = { isAvailable: true };
    if (city) query.city = city;
    if (restaurantId) query.restaurantId = restaurantId;
    if (categoryId) {
      if (!mongoose.isValidObjectId(categoryId)) {
        return res.status(400).json({ message: 'Invalid category ID' });
      }
      query.category = categoryId;
    }
    if (search) {
      query.$text = { $search: search };
    }
    const sort = { [sortBy]: order === 'asc' ? 1 : -1 };
    const foods = await Food.find(query)
      .populate('category', 'name')
      .sort(sort)
      .limit(50);
    res.status(200).json({
      message: 'Foods retrieved successfully',
      count: foods.length,
      foods
    });
  } catch (error) {
    logger.error('Get foods error', { error: error.message });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getFoodDetails = async (req, res) => {
  const { id } = req.params;
  try {
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid food ID' });
    }
    const food = await Food.findById(id)
      .populate('category', 'name')
      .populate('comments', 'content userId createdAt');
    if (!food) {
      return res.status(404).json({ message: 'Food not found' });
    }
    res.status(200).json({
      message: 'Food details retrieved successfully',
      food
    });
  } catch (error) {
    logger.error('Get food details error', { error: error.message });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.addFood = async (req, res) => {
  const { name, description, category, price, restaurantId, city, image, ingredients, nutritionalInfo, isAvailable, preparationTime } = req.body;
  try {
    if (!name || !description || !category || !price || !restaurantId || !city) {
      return res.status(400).json({ message: 'Name, description, category, price, restaurantId, and city are required' });
    }
    if (!mongoose.isValidObjectId(category)) {
      return res.status(400).json({ message: 'Invalid category ID' });
    }
    const categoryExists = await FoodCategory.findById(category);
    if (!categoryExists) {
      return res.status(404).json({ message: 'Category not found' });
    }
    if (restaurantId !== req.user.restaurantId) {
      return res.status(403).json({ message: 'Unauthorized restaurant ID' });
    }
    const food = await Food.create({
      name,
      description,
      category,
      price,
      restaurantId,
      city,
      image: image || 'https://images.unsplash.com/photo-1504674900247-0877df9cc926?q=80&w=2070&auto=format&fit=crop',
      ingredients: ingredients || [],
      nutritionalInfo: nutritionalInfo || { calories: 0, protein: 0, fat: 0, carbohydrates: 0 },
      isAvailable: isAvailable !== undefined ? isAvailable : true,
      preparationTime: preparationTime || 15
    });
    await AuditLog.create({
      action: 'Create Food',
      entity: 'Food',
      entityId: food._id,
      restaurantId,
      details: `Created food: ${name}`,
      performedBy: req.user.userId
    });
    res.status(201).json({
      message: 'Food added successfully',
      food
    });
  } catch (error) {
    logger.error('Add food error', { error: error.message });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateFood = async (req, res) => {
  const { id } = req.params;
  const { name, description, category, price, image, ingredients, nutritionalInfo, isAvailable, preparationTime } = req.body;
  try {
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid food ID' });
    }
    if (category && !mongoose.isValidObjectId(category)) {
      return res.status(400).json({ message: 'Invalid category ID' });
    }
    if (category) {
      const categoryExists = await FoodCategory.findById(category);
      if (!categoryExists) {
        return res.status(404).json({ message: 'Category not found' });
      }
    }
    const food = await Food.findOne({ _id: id, restaurantId: req.user.restaurantId });
    if (!food) {
      return res.status(404).json({ message: 'Food not found' });
    }
    const updateData = {
      name,
      description,
      category,
      price,
      image,
      ingredients,
      nutritionalInfo,
      isAvailable,
      preparationTime
    };
    const updatedFood = await Food.findByIdAndUpdate(id, { $set: updateData }, { new: true, runValidators: true });
    await AuditLog.create({
      action: 'Update Food',
      entity: 'Food',
      entityId: id,
      restaurantId: req.user.restaurantId,
      details: `Updated food: ${name || food.name}`,
      performedBy: req.user.userId
    });
    res.status(200).json({
      message: 'Food updated successfully',
      food: updatedFood
    });
  } catch (error) {
    logger.error('Update food error', { error: error.message });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updatePricesByCategory = async (req, res) => {
  const { categoryId, percentageChange } = req.body;
  try {
    if (!mongoose.isValidObjectId(categoryId)) {
      return res.status(400).json({ message: 'Invalid category ID' });
    }
    if (!percentageChange || isNaN(percentageChange)) {
      return res.status(400).json({ message: 'Valid percentage change is required' });
    }
    const category = await FoodCategory.findById(categoryId);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    const foods = await Food.find({ category: categoryId, restaurantId: req.user.restaurantId });
    if (!foods.length) {
      return res.status(404).json({ message: 'No foods found in this category' });
    }
    for (const food of foods) {
      food.price = Math.round(food.price * (1 + percentageChange / 100) * 100) / 100;
      await food.save();
    }
    await AuditLog.create({
      action: 'Update Prices by Category',
      entity: 'Food',
      restaurantId: req.user.restaurantId,
      details: `Updated prices for category ${category.name} by ${percentageChange}%`,
      performedBy: req.user.userId
    });
    res.status(200).json({
      message: `Prices updated by ${percentageChange}% for category ${category.name}`,
      updatedCount: foods.length
    });
  } catch (error) {
    logger.error('Update prices by category error', { error: error.message });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.addComment = async (req, res) => {
  const { foodId, content } = req.body;
  try {
    if (!mongoose.isValidObjectId(foodId)) {
      return res.status(400).json({ message: 'Invalid food ID' });
    }
    if (!content || content.trim().length < 1) {
      return res.status(400).json({ message: 'Comment content is required' });
    }
    const food = await Food.findById(foodId);
    if (!food) {
      return res.status(404).json({ message: 'Food not found' });
    }
    const comment = await Comment.create({
      foodId,
      userId: req.user.userId,
      restaurantId: food.restaurantId,
      city: food.city,
      content
    });
    await AuditLog.create({
      action: 'Add Comment',
      entity: 'Comment',
      entityId: comment._id,
      restaurantId: food.restaurantId,
      details: `Added comment to food: ${food.name}`,
      performedBy: req.user.userId
    });
    res.status(201).json({
      message: 'Comment added successfully',
      comment
    });
  } catch (error) {
    logger.error('Add comment error', { error: error.message });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.addRating = async (req, res) => {
  const { foodId, rating } = req.body;
  try {
    if (!mongoose.isValidObjectId(foodId)) {
      return res.status(400).json({ message: 'Invalid food ID' });
    }
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }
    const food = await Food.findById(foodId);
    if (!food) {
      return res.status(404).json({ message: 'Food not found' });
    }
    const existingRating = await Rating.findOne({ foodId, userId: req.user.userId });
    if (existingRating) {
      return res.status(400).json({ message: 'You have already rated this food' });
    }
    const newRating = await Rating.create({
      foodId,
      userId: req.user.userId,
      restaurantId: food.restaurantId,
      city: food.city,
      rating
    });
    food.ratingCount += 1;
    food.averageRating = ((food.averageRating * (food.ratingCount - 1) + rating) / food.ratingCount).toFixed(1);
    await food.save();
    await AuditLog.create({
      action: 'Add Rating',
      entity: 'Rating',
      entityId: newRating._id,
      restaurantId: food.restaurantId,
      details: `Rated food ${food.name} with ${rating} stars`,
      performedBy: req.user.userId
    });
    res.status(201).json({
      message: 'Rating added successfully',
      rating: newRating
    });
  } catch (error) {
    logger.error('Add rating error', { error: error.message });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};