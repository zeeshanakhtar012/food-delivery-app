const mongoose = require('mongoose');
const City = require('../../../models/City');
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

exports.createCity = async (req, res) => {
  const { name } = req.body;
  try {
    if (!name || name.trim().length < 2) {
      return res.status(400).json({ message: 'City name must be at least 2 characters long' });
    }
    const existingCity = await City.findOne({ name });
    if (existingCity) {
      return res.status(400).json({ message: 'City already exists' });
    }
    const city = await City.create({
      name,
      createdBy: req.user.userId
    });
    await AuditLog.create({
      action: 'Create City',
      entity: 'City',
      entityId: city._id,
      details: `Created city: ${name}`,
      performedBy: req.user.userId
    });
    res.status(201).json({
      message: 'City created successfully',
      city
    });
  } catch (error) {
    logger.error('Create city error', { error: error.message });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getAllCities = async (req, res) => {
  try {
    const { sortBy = 'createdAt', order = 'desc' } = req.query;
    const sort = { [sortBy]: order === 'asc' ? 1 : -1 };
    const cities = await City.find({})
      .populate('createdBy', 'name email')
      .sort(sort)
      .limit(50);
    res.status(200).json({
      message: 'Cities retrieved successfully',
      count: cities.length,
      cities
    });
  } catch (error) {
    logger.error('Get cities error', { error: error.message });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateCity = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  try {
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid city ID' });
    }
    if (!name || name.trim().length < 2) {
      return res.status(400).json({ message: 'City name must be at least 2 characters long' });
    }
    const existingCity = await City.findOne({ name, _id: { $ne: id } });
    if (existingCity) {
      return res.status(400).json({ message: 'City already exists' });
    }
    const city = await City.findByIdAndUpdate(
      id,
      { name, createdBy: req.user.userId },
      { new: true, runValidators: true }
    );
    if (!city) {
      return res.status(404).json({ message: 'City not found' });
    }
    await AuditLog.create({
      action: 'Update City',
      entity: 'City',
      entityId: city._id,
      details: `Updated city: ${name}`,
      performedBy: req.user.userId
    });
    res.status(200).json({
      message: 'City updated successfully',
      city
    });
  } catch (error) {
    logger.error('Update city error', { error: error.message });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.deleteCity = async (req, res) => {
  const { id } = req.params;
  try {
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid city ID' });
    }
    const city = await City.findById(id);
    if (!city) {
      return res.status(404).json({ message: 'City not found' });
    }
    const restaurantCount = await Restaurant.countDocuments({ city: city.name });
    if (restaurantCount > 0) {
      return res.status(400).json({ message: 'Cannot delete city with associated restaurants' });
    }
    await city.remove();
    await AuditLog.create({
      action: 'Delete City',
      entity: 'City',
      entityId: id,
      details: `Deleted city: ${city.name}`,
      performedBy: req.user.userId
    });
    res.status(200).json({ message: 'City deleted successfully' });
  } catch (error) {
    logger.error('Delete city error', { error: error.message });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};