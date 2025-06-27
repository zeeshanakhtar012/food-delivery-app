const mongoose = require('mongoose');
const User = require('../../../models/User');
const Food = require('../../../models/Food');
const AuditLog = require('../../../models/AuditLog');
const jwt = require('jsonwebtoken');
const { uploadToS3 } = require('../../../config/aws');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'error',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

exports.signup = async (req, res) => {
  const { name, email, password, phone, dateOfBirth, addresses, bio, preferences } = req.body;
  try {
    if (!name || !email || !password || !phone) {
      return res.status(400).json({ message: 'Name, email, password, and phone are required' });
    }
    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      return res.status(400).json({ message: 'Email or phone already exists' });
    }
    const user = await User.create({
      name,
      email,
      password,
      phone,
      dateOfBirth: dateOfBirth || null,
      addresses: addresses || [],
      bio: bio || '',
      preferences: preferences || { dietary: [], notifications: { email: true, sms: true, push: true } }
    });
    const token = jwt.sign(
      { userId: user._id, role: user.role, restaurantId: user.restaurantId },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    await AuditLog.create({
      action: 'User Signup',
      entity: 'User',
      entityId: user._id,
      details: `User ${email} signed up`,
      performedBy: user._id
    });
    res.status(201).json({
      message: 'User created successfully',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      token
    });
  } catch (error) {
    logger.error('Signup error', { error: error.message });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    const user = await User.findOne({ email });
    if (!user || user.isDeleted) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign(
      { userId: user._id, role: user.role, restaurantId: user.restaurantId },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    user.lastLogin = new Date();
    await user.save();
    await AuditLog.create({
      action: 'User Login',
      entity: 'User',
      entityId: user._id,
      restaurantId: user.restaurantId,
      details: `User ${email} logged in`,
      performedBy: user._id
    });
    res.status(200).json({
      message: 'Login successful',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      token
    });
  } catch (error) {
    logger.error('Login error', { error: error.message });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .select('-password -orders -cancelledOrders');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({
      message: 'Profile retrieved successfully',
      user
    });
  } catch (error) {
    logger.error('Get profile error', { error: error.message });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  const { name, phone, dateOfBirth, addresses, bio, preferences } = req.body;
  try {
    const updateData = {
      name,
      phone,
      dateOfBirth,
      addresses,
      bio,
      preferences
    };
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    await AuditLog.create({
      action: 'Update Profile',
      entity: 'User',
      entityId: user._id,
      restaurantId: user.restaurantId,
      details: `User ${user.email} updated profile`,
      performedBy: user._id
    });
    res.status(200).json({
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    logger.error('Update profile error', { error: error.message });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.logout = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    await AuditLog.create({
      action: 'User Logout',
      entity: 'User',
      entityId: user._id,
      restaurantId: user.restaurantId,
      details: `User ${user.email} logged out`,
      performedBy: user._id
    });
    res.status(200).json({ message: 'Logout successful' });
  } catch (error) {
    logger.error('Logout error', { error: error.message });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.addFavorite = async (req, res) => {
  const { foodId } = req.body;
  try {
    if (!mongoose.isValidObjectId(foodId)) {
      return res.status(400).json({ message: 'Invalid food ID' });
    }
    const food = await Food.findById(foodId);
    if (!food) {
      return res.status(404).json({ message: 'Food not found' });
    }
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (user.favorites.includes(foodId)) {
      return res.status(400).json({ message: 'Food already in favorites' });
    }
    user.favorites.push(foodId);
    await user.save();
    await AuditLog.create({
      action: 'Add Favorite',
      entity: 'User',
      entityId: user._id,
      restaurantId: food.restaurantId,
      details: `Added food ${food.name} to favorites`,
      performedBy: user._id
    });
    res.status(200).json({
      message: 'Food added to favorites',
      foodId
    });
  } catch (error) {
    logger.error('Add favorite error', { error: error.message });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.removeFavorite = async (req, res) => {
  const { foodId } = req.params;
  try {
    if (!mongoose.isValidObjectId(foodId)) {
      return res.status(400).json({ message: 'Invalid food ID' });
    }
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (!user.favorites.includes(foodId)) {
      return res.status(400).json({ message: 'Food not in favorites' });
    }
    user.favorites.pull(foodId);
    await user.save();
    await AuditLog.create({
      action: 'Remove Favorite',
      entity: 'User',
      entityId: user._id,
      restaurantId: req.user.restaurantId,
      details: `Removed food ${foodId} from favorites`,
      performedBy: user._id
    });
    res.status(200).json({
      message: 'Food removed from favorites',
      foodId
    });
  } catch (error) {
    logger.error('Remove favorite error', { error: error.message });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getFavorites = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .populate('favorites', 'name price restaurantId city');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({
      message: 'Favorites retrieved successfully',
      favorites: user.favorites
    });
  } catch (error) {
    logger.error('Get favorites error', { error: error.message });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const imageUrl = await uploadToS3(req.file, `profile-images/${user._id}`);
    user.profileImage = imageUrl;
    await user.save();
    await AuditLog.create({
      action: 'Upload Profile Image',
      entity: 'User',
      entityId: user._id,
      restaurantId: user.restaurantId,
      details: `Uploaded profile image for user ${user.email}`,
      performedBy: user._id
    });
    res.status(200).json({
      message: 'Profile image uploaded successfully',
      imageUrl
    });
  } catch (error) {
    logger.error('Upload profile image error', { error: error.message });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};