const jwt = require('jsonwebtoken');
const jwtSecret = process.env.JWT_SECRET;
const Restaurant = require('../models/PostgreSQL/Restaurant');

// Main authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check for Restaurant Admin single-session security
    if (decoded.role === 'restaurant_admin') {
      const Admin = require('../models/PostgreSQL/Admin');
      const admin = await Admin.findById(decoded.id);

      // KICK OUT if the admin no longer exists OR the session token doesn't match the DB
      if (!admin || admin.session_token !== decoded.session_token) {
        return res.status(401).json({ message: 'Session expired or logged in from another device. Please log in again.' });
      }
    }

    // === FIX: Check restaurant_id exists AND is not null ===
    if (decoded.role !== 'super_admin' && decoded.restaurant_id) {
      const restaurant = await Restaurant.findById(decoded.restaurant_id);
      if (!restaurant) {
        return res.status(403).json({ message: 'Restaurant not found' });
      }
      if (!restaurant.is_active) {
        return res.status(403).json({ message: 'Restaurant account is frozen' });
      }
    }

    // === Only set req.user if everything is valid ===
    req.user = {
      id: decoded.id,
      role: decoded.role,
      restaurant_id: decoded.restaurant_id || null,
      session_token: decoded.session_token || null
    };

    next(); // ← This is called
  } catch (error) {
    console.error('Auth middleware error:', error.message);
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access denied. Required role: ${roles.join(' or ')}`
      });
    }

    next();
  };
};

// Restaurant isolation middleware - ensures user can only access their restaurant's data
const requireRestaurantAccess = async (req, res, next) => {
  console.log('requireRestaurantAccess: START - req.user =', req.user);

  try {
    // === SAFETY GUARD FIRST ===
    if (!req.user || !req.user.id) {
      console.error('requireRestaurantAccess: MISSING req.user!', req.user);
      return res.status(401).json({ message: 'Unauthorized: No user' });
    }

    // Store user data in local variables immediately to prevent issues
    const userId = req.user.id;
    const userRole = req.user.role;
    const userRestaurantId = req.user.restaurant_id;

    if (userRole === 'super_admin') {
      return next();
    }

    // === NOW SAFE TO ACCESS restaurant_id ===
    if (!userRestaurantId) {
      return res.status(403).json({ message: 'No restaurant assigned. Contact super admin.' });
    }

    const restaurant = await Restaurant.findById(userRestaurantId);
    if (!restaurant) {
      return res.status(403).json({ message: 'Restaurant not found' });
    }
    if (!restaurant.is_active) {
      return res.status(403).json({ message: 'Restaurant account is frozen' });
    }

    // Check if request tries to access a different restaurant
    const restaurantId = req.params.restaurant_id || req.body?.restaurant_id || req.query?.restaurant_id;
    if (restaurantId && restaurantId !== userRestaurantId.toString()) {
      return res.status(403).json({ message: 'Access denied: Cannot access other restaurant' });
    }

    // Set restaurant_id on req for easy access in controllers
    req.restaurant_id = userRestaurantId;
    // Ensure req.user is still set (defensive)
    if (!req.user) {
      req.user = { id: userId, role: userRole, restaurant_id: userRestaurantId };
    }
    next();
  } catch (error) {
    console.error('Restaurant access error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  authenticate,
  authorize,
  requireRestaurantAccess
};
