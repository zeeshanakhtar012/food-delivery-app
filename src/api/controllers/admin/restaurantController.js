const mongoose = require('mongoose');
const Restaurant = require('../../../models/Restaurant');
const User = require('../../../models/User');
const City = require('../../../models/City');
const AuditLog = require('../../../models/AuditLog');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'error',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

const generateUniqueRestaurantId = () => `REST-${uuidv4().slice(0, 8)}`;

exports.createRestaurant = async (req, res) => {
  const { name, city, address, adminEmail, adminPassword } = req.body;
  try {
    if (!name || !city || !address || !adminEmail || !adminPassword) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    const cityExists = await City.findOne({ name: city });
    if (!cityExists) {
      return res.status(400).json({ message: 'Invalid city' });
    }
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      return res.status(400).json({ message: 'Admin email already exists' });
    }
    const restaurantId = generateUniqueRestaurantId();
    const admin = await User.create({
      name: `Admin for ${name}`,
      email: adminEmail,
      password: adminPassword,
      phone: `+1${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      role: 'admin',
      restaurantId
    });
    const restaurant = await Restaurant.create({
      restaurantId,
      name,
      city,
      address,
      adminId: admin._id,
      createdBy: req.user.userId
    });
    await AuditLog.create({
      action: 'Create Restaurant',
      entity: 'Restaurant',
      entityId: restaurant._id,
      restaurantId,
      details: `Created restaurant: ${name}`,
      performedBy: req.user.userId
    });
    res.status(201).json({
      message: 'Restaurant created successfully',
      restaurant,
      admin: {
        _id: admin._id,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (error) {
    logger.error('Create restaurant error', { error: error.message });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateRestaurant = async (req, res) => {
  const { id } = req.params;
  const { name, address, logoUrl, banners } = req.body;
  try {
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid restaurant ID' });
    }
    const restaurant = await Restaurant.findOne({ _id: id, restaurantId: req.user.restaurantId });
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }
    const updateData = {
      name: name || restaurant.name,
      address: address || restaurant.address,
      logoUrl: logoUrl || restaurant.logoUrl,
      banners: banners || restaurant.banners
    };
    const updatedRestaurant = await Restaurant.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );
    await AuditLog.create({
      action: 'Update Restaurant',
      entity: 'Restaurant',
      entityId: restaurant._id,
      restaurantId: restaurant.restaurantId,
      details: `Updated restaurant: ${name || restaurant.name}`,
      performedBy: req.user.userId
    });
    res.status(200).json({
      message: 'Restaurant updated successfully',
      restaurant: updatedRestaurant
    });
  } catch (error) {
    logger.error('Update restaurant error', { error: error.message });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getRestaurantDetails = async (req, res) => {
  try {
    const restaurant = await Restaurant.findOne({ restaurantId: req.user.restaurantId })
      .populate('adminId', 'name email')
      .populate('createdBy', 'name email');
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }
    res.status(200).json({
      message: 'Restaurant details retrieved successfully',
      restaurant
    });
  } catch (error) {
    logger.error('Get restaurant details error', { error: error.message });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};