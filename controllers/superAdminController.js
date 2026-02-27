const Restaurant = require('../models/PostgreSQL/Restaurant');
const Admin = require('../models/PostgreSQL/Admin');
const Rider = require('../models/PostgreSQL/Rider');
const Analytics = require('../models/PostgreSQL/Analytics');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Create restaurant + admin
exports.createRestaurant = async (req, res) => {
  try {
    const { restaurant, admin } = req.body;

    // Validate required fields
    if (!restaurant || !admin) {
      return res.status(400).json({
        message: 'Restaurant and admin data are required'
      });
    }

    if (!restaurant.name || !restaurant.email || !restaurant.phone || !restaurant.address) {
      return res.status(400).json({
        message: 'Restaurant name, email, phone, and address are required'
      });
    }

    if (!admin.name || !admin.email || !admin.password) {
      return res.status(400).json({
        message: 'Admin name, email, and password are required'
      });
    }

    // Check if restaurant email exists
    const existingRestaurant = await Restaurant.findByEmail(restaurant.email);
    if (existingRestaurant) {
      return res.status(400).json({ message: 'Restaurant email already exists' });
    }

    // Check if admin email exists
    const existingAdmin = await Admin.findByEmail(admin.email);
    if (existingAdmin) {
      return res.status(400).json({ message: 'Admin email already exists' });
    }

    // Create restaurant
    const newRestaurant = await Restaurant.create(restaurant);

    // Create restaurant admin
    const newAdmin = await Admin.create({
      name: admin.name,
      email: admin.email,
      password: admin.password,
      restaurant_id: newRestaurant.id,
      role: 'restaurant_admin'
    });

    res.status(201).json({
      message: 'Restaurant and admin created successfully',
      restaurant: {
        id: newRestaurant.id,
        name: newRestaurant.name,
        email: newRestaurant.email,
        phone: newRestaurant.phone,
        address: newRestaurant.address,
        logo_url: newRestaurant.logo_url,
        theme_color: newRestaurant.theme_color,
        is_active: newRestaurant.is_active
      },
      admin: {
        id: newAdmin.id,
        name: newAdmin.name,
        email: newAdmin.email,
        role: newAdmin.role
      }
    });
  } catch (error) {
    console.error('Create restaurant error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete restaurant
exports.deleteRestaurant = async (req, res) => {
  try {
    const { id } = req.params;

    // Remove colon if accidentally included
    const restaurantId = id.startsWith(':') ? id.substring(1) : id;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(restaurantId)) {
      return res.status(400).json({
        message: 'Invalid restaurant ID format. Expected UUID format.'
      });
    }

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }

    await Restaurant.delete(restaurantId);

    res.json({ message: 'Restaurant deleted successfully' });
  } catch (error) {
    console.error('Delete restaurant error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Freeze/unfreeze restaurant
exports.toggleRestaurantFreeze = async (req, res) => {
  try {
    const { id } = req.params;

    // Remove colon if accidentally included
    const restaurantId = id.startsWith(':') ? id.substring(1) : id;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(restaurantId)) {
      return res.status(400).json({
        message: 'Invalid restaurant ID format. Expected UUID format.'
      });
    }

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }

    const updatedRestaurant = await Restaurant.toggleActive(restaurantId);

    res.json({
      message: `Restaurant ${updatedRestaurant.is_active ? 'activated' : 'frozen'} successfully`,
      restaurant: {
        id: updatedRestaurant.id,
        name: updatedRestaurant.name,
        is_active: updatedRestaurant.is_active
      }
    });
  } catch (error) {
    console.error('Toggle restaurant freeze error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all restaurants
exports.getAllRestaurants = async (req, res) => {
  try {
    const restaurants = await Restaurant.findAll();

    res.json({
      message: 'Restaurants retrieved successfully',
      restaurants
    });
  } catch (error) {
    console.error('Get all restaurants error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get restaurant details (admins, riders)
exports.getRestaurantDetails = async (req, res) => {
  try {
    const { id } = req.params;

    // Remove colon if accidentally included
    const restaurantId = id.startsWith(':') ? id.substring(1) : id;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(restaurantId)) {
      return res.status(400).json({
        message: 'Invalid restaurant ID format. Expected UUID format.'
      });
    }

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }

    const admins = await Admin.findByRestaurantId(restaurantId);
    const riders = await Rider.findByRestaurantId(restaurantId);

    const User = require('../models/PostgreSQL/User');
    const users = await User.findByRestaurantId(restaurantId);

    // Fallback if Analytics is not imported globally or needs to be invoked
    const AnalyticsModel = require('../models/PostgreSQL/Analytics');
    const analytics = await AnalyticsModel.getRestaurantAnalytics(restaurantId);

    res.json({
      message: 'Restaurant details retrieved successfully',
      restaurant: {
        ...restaurant,
        admins,
        riders,
        users,
        analytics
      }
    });
  } catch (error) {
    console.error('Get restaurant details error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get restaurant analytics
exports.getRestaurantAnalytics = async (req, res) => {
  try {
    const { id } = req.params;

    // Remove colon if accidentally included
    const restaurantId = id.startsWith(':') ? id.substring(1) : id;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(restaurantId)) {
      return res.status(400).json({
        message: 'Invalid restaurant ID format. Expected UUID format.'
      });
    }

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }

    const analytics = await Analytics.getRestaurantAnalytics(restaurantId);

    res.json({
      message: 'Analytics retrieved successfully',
      restaurant: {
        id: restaurant.id,
        name: restaurant.name
      },
      analytics
    });
  } catch (error) {
    console.error('Get restaurant analytics error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Super Admin Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const admin = await Admin.findByEmail(email);
    if (!admin || admin.role !== 'super_admin') {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isValidPassword = await Admin.comparePassword(password, admin.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: admin.id,
        role: admin.role,
        restaurant_id: null
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (error) {
    console.error('Super admin login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get platform analytics
exports.getPlatformAnalytics = async (req, res) => {
  try {
    const analytics = await Analytics.getAllRestaurantsAnalytics();

    res.json({
      message: 'Platform analytics retrieved successfully',
      analytics
    });
  } catch (error) {
    console.error('Get platform analytics error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const User = require('../models/PostgreSQL/User');
    const users = await User.findAll();
    res.json({ message: 'Users retrieved successfully', users });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Freeze/unfreeze user
exports.toggleUserFreeze = async (req, res) => {
  try {
    const { id } = req.params;
    const User = require('../models/PostgreSQL/User');
    const user = await User.toggleActive(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: `User ${user.is_active ? 'activated' : 'frozen'} successfully`, user });
  } catch (error) {
    console.error('Toggle user freeze error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete user
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const User = require('../models/PostgreSQL/User');
    const user = await User.delete(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all riders
exports.getAllRiders = async (req, res) => {
  try {
    const Rider = require('../models/PostgreSQL/Rider');
    const riders = await Rider.findAll();
    res.json({ message: 'Riders retrieved successfully', riders });
  } catch (error) {
    console.error('Get all riders error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Freeze/unfreeze rider
exports.toggleRiderFreeze = async (req, res) => {
  try {
    const { id } = req.params;
    const Rider = require('../models/PostgreSQL/Rider');
    const rider = await Rider.toggleActive(id);
    if (!rider) {
      return res.status(404).json({ message: 'Rider not found' });
    }
    res.json({ message: `Rider ${rider.is_active ? 'activated' : 'frozen'} successfully`, rider });
  } catch (error) {
    console.error('Toggle rider freeze error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete rider
exports.deleteRider = async (req, res) => {
  try {
    const { id } = req.params;
    const Rider = require('../models/PostgreSQL/Rider');
    const rider = await Rider.delete(id);
    if (!rider) {
      return res.status(404).json({ message: 'Rider not found' });
    }
    res.json({ message: 'Rider deleted successfully' });
  } catch (error) {
    console.error('Delete rider error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
