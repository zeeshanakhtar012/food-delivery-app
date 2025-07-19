const mongoose = require('mongoose');
const Restaurant = require('../models/Restaurant');
const Category = require('../models/Category');
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

// Validate restaurant input
const validateRestaurantInput = (data) => {
  const errors = [];
  if (!data.name || data.name.trim().length < 3) errors.push('Restaurant name must be at least 3 characters');
  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.push('Invalid email format');
  if (!data.phone || !/^\+?[1-9]\d{1,14}$/.test(data.phone)) errors.push('Invalid phone number format');
  if (!data.address || !data.address.street || !data.address.city || !data.address.state || !data.address.postalCode || !data.address.country) {
    errors.push('Complete address is required');
  }
  return errors;
};

// Create restaurant (super admin only)
exports.createRestaurant = async (req, res) => {
  const { name, description, address, phone, email, logo } = req.body;

  try {
    const errors = validateRestaurantInput(req.body);
    if (errors.length > 0) return res.status(400).json({ errors });

    const existingRestaurant = await Restaurant.findOne({ $or: [{ email }, { phone }] });
    if (existingRestaurant) {
      return res.status(400).json({ message: existingRestaurant.email === email ? 'Email already exists' : 'Phone number already exists' });
    }

    const restaurant = await Restaurant.create({
      name,
      description,
      address,
      phone,
      email,
      logo,
      createdBy: req.user.userId
    });

    await logAdminAction(
      'Create Restaurant',
      'Restaurant',
      restaurant._id,
      `Created restaurant: ${name}`,
      req.user.userId
    );

    res.status(201).json({ message: 'Restaurant created successfully', restaurant });
  } catch (error) {
    logger.error('Create restaurant error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error occurred', error: error.message });
  }
};

// Update restaurant (super admin only)
exports.updateRestaurant = async (req, res) => {
  const { id } = req.params;
  const { name, description, address, phone, email, logo, isActive } = req.body;

  try {
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid restaurant ID' });

    const errors = validateRestaurantInput(req.body);
    if (errors.length > 0) return res.status(400).json({ errors });

    const restaurant = await Restaurant.findByIdAndUpdate(
      id,
      { $set: { name, description, address, phone, email, logo, isActive } },
      { new: true, runValidators: true }
    );

    if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });

    await logAdminAction(
      'Update Restaurant',
      'Restaurant',
      restaurant._id,
      `Updated restaurant: ${name}`,
      req.user.userId
    );

    res.status(200).json({ message: 'Restaurant updated successfully', restaurant });
  } catch (error) {
    logger.error('Update restaurant error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error occurred', error: error.message });
  }
};

// Delete restaurant (super admin only)
exports.deleteRestaurant = async (req, res) => {
  const { id } = req.params;

  try {
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid restaurant ID' });

    const restaurant = await Restaurant.findByIdAndDelete(id);
    if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });

    await logAdminAction(
      'Delete Restaurant',
      'Restaurant',
      restaurant._id,
      `Deleted restaurant: ${restaurant.name}`,
      req.user.userId
    );

    res.status(200).json({ message: 'Restaurant deleted successfully' });
  } catch (error) {
    logger.error('Delete restaurant error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error occurred', error: error.message });
  }
};

// Create category (super admin or restaurant admin)
exports.createCategory = async (req, res) => {
  const { name, restaurantId } = req.body;

  try {
    if (!name || name.trim().length < 3) return res.status(400).json({ message: 'Category name must be at least 3 characters' });
    if (!mongoose.isValidObjectId(restaurantId)) return res.status(400).json({ message: 'Invalid restaurant ID' });

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });

    if (req.user.role === 'super_admin' || (req.user.role === 'restaurant_admin' && req.user.restaurantId.toString() === restaurantId)) {
      const category = await Category.create({ name, restaurantId, createdBy: req.user.userId });

      await logAdminAction(
        'Create Category',
        'Category',
        category._id,
        `Created category: ${name} for restaurant ${restaurantId}`,
        req.user.userId
      );

      res.status(201).json({ message: 'Category created successfully', category });
    } else {
      return res.status(403).json({ message: 'Unauthorized to create category for this restaurant' });
    }
  } catch (error) {
    logger.error('Create category error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error occurred', error: error.message });
  }
};

// Update category (super admin or restaurant admin)
exports.updateCategory = async (req, res) => {
  const { id } = req.params;
  const { name, isActive } = req.body;

  try {
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid category ID' });
    if (name && name.trim().length < 3) return res.status(400).json({ message: 'Category name must be at least 3 characters' });

    const category = await Category.findById(id).populate('restaurantId');
    if (!category) return res.status(404).json({ message: 'Category not found' });

    if (req.user.role === 'super_admin' || (req.user.role === 'restaurant_admin' && req.user.restaurantId.toString() === category.restaurantId._id.toString())) {
      const updatedCategory = await Category.findByIdAndUpdate(
        id,
        { $set: { name, isActive } },
        { new: true, runValidators: true }
      );

      await logAdminAction(
        'Update Category',
        'Category',
        updatedCategory._id,
        `Updated category: ${name}`,
        req.user.userId
      );

      res.status(200).json({ message: 'Category updated successfully', category: updatedCategory });
    } else {
      return res.status(403).json({ message: 'Unauthorized to update this category' });
    }
  } catch (error) {
    logger.error('Update category error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error occurred', error: error.message });
  }
};

// Delete category (super admin or restaurant admin)
exports.deleteCategory = async (req, res) => {
  const { id } = req.params;

  try {
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid category ID' });

    const category = await Category.findById(id).populate('restaurantId');
    if (!category) return res.status(404).json({ message: 'Category not found' });

    if (req.user.role === 'super_admin' || (req.user.role === 'restaurant_admin' && req.user.restaurantId.toString() === category.restaurantId._id.toString())) {
      await Category.findByIdAndDelete(id);

      await logAdminAction(
        'Delete Category',
        'Category',
        category._id,
        `Deleted category: ${category.name}`,
        req.user.userId
      );

      res.status(200).json({ message: 'Category deleted successfully' });
    } else {
      return res.status(403).json({ message: 'Unauthorized to delete this category' });
    }
  } catch (error) {
    logger.error('Delete category error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error occurred', error: error.message });
  }
};