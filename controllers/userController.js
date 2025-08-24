const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
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

// Ensure JWT_SECRET is defined
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error('JWT_SECRET is not defined in environment variables');
}

// Token Blacklist Schema
const tokenBlacklistSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: '7d' // Automatically remove after 7 days (matching JWT expiry)
  }
});

const TokenBlacklist = mongoose.model('TokenBlacklist', tokenBlacklistSchema);

// Input validation helper for registration
const validateRegisterInput = (data) => {
  const errors = [];
  if (!data.name || data.name.trim().length < 3) {
    errors.push('Name must be at least 3 characters long');
  }
  if (!data.email || !/^\S+@\S+\.\S+$/.test(data.email)) {
    errors.push('Invalid email format');
  }
  if (!data.password || data.password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  if (!data.phone || !/^\+?[1-9]\d{1,14}$/.test(data.phone)) {
    errors.push('Invalid phone number');
  }
  if (!data.address || !data.address.street || !data.address.city || 
      !data.address.state || !data.address.postalCode || !data.address.country) {
    errors.push('Complete address is required');
  }
  return errors;
};

// Input validation helper for profile update
const validateUpdateInput = (data) => {
  const errors = [];
  if (data.name && data.name.trim().length < 3) {
    errors.push('Name must be at least 3 characters long');
  }
  if (data.phone && !/^\+?[1-9]\d{1,14}$/.test(data.phone)) {
    errors.push('Invalid phone number');
  }
  if (data.bio && data.bio.length > 200) {
    errors.push('Bio cannot exceed 200 characters');
  }
  if (data.addresses && Array.isArray(data.addresses)) {
    data.addresses.forEach((addr, idx) => {
      if (!addr.street || !addr.city || !addr.state || !addr.postalCode || !addr.country) {
        errors.push(`Address at index ${idx} is incomplete`);
      }
    });
  }
  return errors;
};

// Input validation helper for adding address
const validateAddressInput = (data) => {
  const errors = [];
  if (!data.street || !data.city || !data.state || !data.postalCode || !data.country) {
    errors.push('Complete address is required');
  }
  return errors;
};

// Input validation helper for preferences
const validatePreferencesInput = (data) => {
  const errors = [];
  if (data.dietary && !Array.isArray(data.dietary)) {
    errors.push('Dietary preferences must be an array');
  }
  if (data.dietary) {
    const validDietary = ['vegetarian', 'vegan', 'gluten-free', 'non-vegetarian', 'other'];
    data.dietary.forEach((pref, idx) => {
      if (!validDietary.includes(pref)) {
        errors.push(`Invalid dietary preference at index ${idx}`);
      }
    });
  }
  if (data.notifications && typeof data.notifications !== 'object') {
    errors.push('Notifications must be an object');
  }
  return errors;
};

// Register user
exports.registerUser = async (req, res) => {
  console.log('Register endpoint hit:', req.body);
  const { name, email, password, phone, dateOfBirth, address, bio, preferences, role, isAdmin, restaurantId } = req.body;

  try {
    // Validate input
    const errors = validateRegisterInput(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    // Check if user exists
    const userExists = await User.findOne({ $or: [{ email }, { phone }] });
    if (userExists) {
      return res.status(400).json({ message: 'Email or phone already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Prepare address
    const addressData = {
      street: address.street,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country,
      isDefault: true,
      coordinates: address.coordinates || [0, 0]
    };

    // Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      phone,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      addresses: [addressData],
      location: address.coordinates || [0, 0],
      bio,
      preferences: preferences || {
        dietary: [],
        notifications: {
          email: true,
          sms: true,
          push: true
        }
      },
      role: role || 'user', // Default to 'user' if not provided
      isAdmin: isAdmin || false, // Default to false if not provided
      restaurantId: restaurantId || null // Default to null if not provided
    });

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, role: user.role, isAdmin: user.isAdmin, restaurantId: user.restaurantId },
      jwtSecret,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        dateOfBirth: user.dateOfBirth,
        addresses: user.addresses,
        bio: user.bio,
        profileImage: user.profileImage,
        isVerified: user.isVerified,
        role: user.role,
        isAdmin: user.isAdmin,
        restaurantId: user.restaurantId
      }
    });
  } catch (error) {
    logger.error('Register error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error occurred' });
  }
};

// Login user
exports.loginUser = async (req, res) => {
  console.log('Login endpoint hit:', req.body);
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email, isDeleted: false }).select('+password');
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign(
      { userId: user._id, role: user.role, isAdmin: user.isAdmin, restaurantId: user.restaurantId },
      jwtSecret,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        profileImage: user.profileImage,
        isVerified: user.isVerified,
        role: user.role,
        isAdmin: user.isAdmin,
        restaurantId: user.restaurantId
      }
    });
  } catch (error) {
    logger.error('Login error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error occurred' });
  }
};

// Get user profile
exports.getUserProfile = async (req, res) => {
  try {
    console.log('User ID:', req.user.userId);
    const user = await User.findOne({ _id: req.user.userId, isDeleted: false })
      .select('-password')
      .populate({
        path: 'orders',
        select: 'orderId totalAmount status items shipping createdAt',
        populate: {
          path: 'items.productId',
          select: 'name price'
        },
        options: { sort: { createdAt: -1 }, limit: 50 }
      })
      .populate({
        path: 'cancelledOrders',
        select: 'orderId totalAmount status reason createdAt',
        options: { sort: { createdAt: -1 }, limit: 50 }
      });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Fetch order analytics
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 6); // Last 6 months
    const analytics = await User.getOrderAnalytics(user._id, startDate, new Date());

    res.status(200).json({
      message: 'Profile retrieved successfully',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        dateOfBirth: user.dateOfBirth,
        addresses: user.addresses,
        location: user.location,
        bio: user.bio,
        profileImage: user.profileImage,
        isVerified: user.isVerified,
        preferences: user.preferences,
        orders: user.orders,
        cancelledOrders: user.cancelledOrders,
        loyaltyPoints: user.loyaltyPoints,
        totalOrders: user.totalOrders,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        role: user.role,
        isAdmin: user.isAdmin,
        restaurantId: user.restaurantId,
        orderAnalytics: analytics[0] || {
          totalOrders: 0,
          totalSpent: 0,
          averageOrderValue: 0,
          statusCounts: {}
        }
      }
    });
  } catch (error) {
    logger.error('Get profile error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error occurred', error: error.message });
  }
};

// Update user profile
exports.updateUserProfile = async (req, res) => {
  console.log('Update profile endpoint hit:', req.body);
  const { name, phone, dateOfBirth, addresses, bio, preferences, profileImage } = req.body;

  try {
    // Validate input
    const errors = validateUpdateInput(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    // Prepare update object
    const updateData = {};
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    if (dateOfBirth) updateData.dateOfBirth = new Date(dateOfBirth);
    if (addresses) {
      const updatedAddresses = addresses.map((addr, idx) => ({
        ...addr,
        isDefault: addr.isDefault || (idx === 0 && !addresses.some(a => a.isDefault))
      }));
      updateData.addresses = updatedAddresses;
      if (updatedAddresses[0]?.coordinates) {
        updateData.location = {
          type: 'Point',
          coordinates: updatedAddresses[0].coordinates
        };
      }
    }
    if (bio) updateData.bio = bio;
    if (preferences) {
      const preferenceErrors = validatePreferencesInput(preferences);
      if (preferenceErrors.length > 0) {
        return res.status(400).json({ errors: preferenceErrors });
      }
      updateData.preferences = preferences;
    }
    if (profileImage) updateData.profileImage = profileImage;

    // Check if phone is already in use
    if (phone) {
      const phoneExists = await User.findOne({ phone, _id: { $ne: req.user.userId }, isDeleted: false });
      if (phoneExists) {
        return res.status(400).json({ message: 'Phone number already in use' });
      }
    }

    const user = await User.findOneAndUpdate(
      { _id: req.user.userId, isDeleted: false },
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      message: 'Profile updated successfully',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        dateOfBirth: user.dateOfBirth,
        addresses: user.addresses,
        location: user.location,
        bio: user.bio,
        profileImage: user.profileImage,
        isVerified: user.isVerified,
        preferences: user.preferences,
        loyaltyPoints: user.loyaltyPoints,
        totalOrders: user.totalOrders,
        lastLogin: user.lastLogin,
        role: user.role,
        isAdmin: user.isAdmin,
        restaurantId: user.restaurantId
      }
    });
  } catch (error) {
    logger.error('Update profile error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error occurred' });
  }
};

// Change password
exports.changePassword = async (req, res) => {
  console.log('Change password endpoint hit:', req.body);
  const { currentPassword, newPassword } = req.body;

  try {
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new passwords are required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters' });
    }

    const user = await User.findOne({ _id: req.user.userId, isDeleted: false }).select('+password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.status(200).json({ message: 'Password changed successfully' });
  } catch (error) {
    logger.error('Change password error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error occurred' });
  }
};

// Delete account (soft delete)
exports.deleteAccount = async (req, res) => {
  console.log('Delete account endpoint hit:', req.user.userId);
  try {
    const user = await User.findOneAndUpdate(
      { _id: req.user.userId, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date() } },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ message: 'Account deleted successfully' });
  } catch (error) {
    logger.error('Delete account error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error occurred' });
  }
};

// Add address
exports.addAddress = async (req, res) => {
  console.log('Add address endpoint hit:', req.body);
  const { street, city, state, postalCode, country, coordinates, isDefault } = req.body;

  try {
    const errors = validateAddressInput(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const user = await User.findOne({ _id: req.user.userId, isDeleted: false });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const newAddress = {
      street,
      city,
      state,
      postalCode,
      country,
      coordinates: coordinates || [0, 0],
      isDefault: isDefault || user.addresses.length === 0
    };

    if (newAddress.isDefault) {
      user.addresses.forEach(addr => (addr.isDefault = false));
    }

    user.addresses.push(newAddress);
    if (newAddress.isDefault || user.addresses.length === 1) {
      user.location = {
        type: 'Point',
        coordinates: newAddress.coordinates
      };
    }

    await user.save();

    res.status(200).json({
      message: 'Address added successfully',
      addresses: user.addresses
    });
  } catch (error) {
    logger.error('Add address error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error occurred' });
  }
};

// Remove address
exports.removeAddress = async (req, res) => {
  console.log('Remove address endpoint hit:', req.params);
  const { addressId } = req.params;

  try {
    if (!mongoose.isValidObjectId(addressId)) {
      return res.status(400).json({ message: 'Invalid address ID' });
    }

    const user = await User.findOne({ _id: req.user.userId, isDeleted: false });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const addressIndex = user.addresses.findIndex(addr => addr._id.toString() === addressId);
    if (addressIndex === -1) {
      return res.status(404).json({ message: 'Address not found' });
    }

    const wasDefault = user.addresses[addressIndex].isDefault;
    user.addresses.splice(addressIndex, 1);

    if (wasDefault && user.addresses.length > 0) {
      user.addresses[0].isDefault = true;
      user.location = {
        type: 'Point',
        coordinates: user.addresses[0].coordinates
      };
    } else if (user.addresses.length === 0) {
      user.location = { type: 'Point', coordinates: [0, 0] };
    }

    await user.save();

    res.status(200).json({
      message: 'Address removed successfully',
      addresses: user.addresses
    });
  } catch (error) {
    logger.error('Remove address error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error occurred' });
  }
};

// Set default address
exports.setDefaultAddress = async (req, res) => {
  console.log('Set default address endpoint hit:', req.params);
  const { addressId } = req.params;

  try {
    if (!mongoose.isValidObjectId(addressId)) {
      return res.status(400).json({ message: 'Invalid address ID' });
    }

    const user = await User.findOne({ _id: req.user.userId, isDeleted: false });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const address = user.addresses.find(addr => addr._id.toString() === addressId);
    if (!address) {
      return res.status(404).json({ message: 'Address not found' });
    }

    user.addresses.forEach(addr => (addr.isDefault = false));
    address.isDefault = true;

    user.location = {
      type: 'Point',
      coordinates: address.coordinates
    };

    await user.save();

    res.status(200).json({
      message: 'Default address set successfully',
      addresses: user.addresses
    });
  } catch (error) {
    logger.error('Set default address error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error occurred' });
  }
};

// Update preferences
exports.updatePreferences = async (req, res) => {
  console.log('Update preferences endpoint hit:', req.body);
  const { dietary, notifications } = req.body;

  try {
    const preferences = { dietary, notifications };
    const errors = validatePreferencesInput(preferences);
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const user = await User.findOneAndUpdate(
      { _id: req.user.userId, isDeleted: false },
      { $set: { preferences: preferences || { dietary: [], notifications: { email: true, sms: true, push: true } } } },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      message: 'Preferences updated successfully',
      preferences: user.preferences
    });
  } catch (error) {
    logger.error('Update preferences error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error occurred' });
  }
};

// Logout user
exports.logoutUser = async (req, res) => {
  console.log('Logout endpoint hit:', req.user.userId);
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(400).json({ message: 'No token provided' });
    }

    // Verify token
    try {
      const decoded = jwt.verify(token, jwtSecret);
      if (decoded.userId !== req.user.userId) {
        return res.status(401).json({ message: 'Invalid token' });
      }
    } catch (error) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    // Add token to blacklist
    await TokenBlacklist.create({
      token,
      userId: req.user.userId
    });

    res.status(200).json({ message: 'Logout successful' });
  } catch (error) {
    logger.error('Logout error', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error occurred' });
  }
};

// Export TokenBlacklist model for use in middleware
exports.TokenBlacklist = TokenBlacklist;