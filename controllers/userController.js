const User = require('../models/PostgreSQL/User');
const Food = require('../models/PostgreSQL/Food');
const Order = require('../models/PostgreSQL/Order');
const OrderTracking = require('../models/PostgreSQL/OrderTracking');
const jwt = require('jsonwebtoken');
const Restaurant = require('../models/PostgreSQL/Restaurant');

// User Register
exports.register = async (req, res) => {
  try {
    const { name, email, password, phone, restaurant_id } = req.body;

    if (!name || !email || !password || !restaurant_id) {
      return res.status(400).json({
        message: 'Name, email, password, and restaurant_id are required'
      });
    }

    // Verify restaurant exists and is active
    const restaurant = await Restaurant.findById(restaurant_id);
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }
    if (!restaurant.is_active) {
      return res.status(403).json({
        message: 'Restaurant account is frozen. Please contact support.'
      });
    }

    // Check if user email exists for this restaurant
    const existingUser = await User.findByEmailAndRestaurant(email, restaurant_id);
    if (existingUser) {
      return res.status(400).json({
        message: 'Email already registered for this restaurant'
      });
    }

    const newUser = await User.create({
      name,
      email,
      password,
      phone,
      restaurant_id
    });

    // Generate JWT token
    const token = jwt.sign(
      {
        id: newUser.id,
        role: 'user',
        restaurant_id: newUser.restaurant_id
      },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        restaurant_id: newUser.restaurant_id
      }
    });
  } catch (error) {
    console.error('User register error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// User Login
exports.login = async (req, res) => {
  try {
    const { email, password, restaurant_id } = req.body;

    if (!email || !password || !restaurant_id) {
      return res.status(400).json({
        message: 'Email, password, and restaurant_id are required'
      });
    }

    // Verify restaurant exists and is active
    const restaurant = await Restaurant.findById(restaurant_id);
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }
    if (!restaurant.is_active) {
      return res.status(403).json({
        message: 'Restaurant account is frozen. Please contact support.'
      });
    }

    const user = await User.findByEmailAndRestaurant(email, restaurant_id);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isValidPassword = await User.comparePassword(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if user is blocked
    if (user.is_active === false) {
      return res.status(403).json({
        message: 'Your account has been blocked. Please contact the restaurant admin.'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        role: 'user',
        restaurant_id: user.restaurant_id
      },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        restaurant_id: user.restaurant_id
      }
    });
  } catch (error) {
    console.error('User login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get homepage data
exports.getHomepage = async (req, res) => {
  try {
    const restaurant_id = req.user?.restaurant_id;

    if (!restaurant_id) {
      return res.status(400).json({ message: 'Restaurant not found' });
    }

    // Verify restaurant is active
    const restaurant = await Restaurant.findById(restaurant_id);
    if (!restaurant || !restaurant.is_active) {
      return res.status(403).json({
        message: 'Restaurant account is frozen or not found'
      });
    }

    // Import required models
    const Banner = require('../models/PostgreSQL/Banner');
    const Coupon = require('../models/PostgreSQL/Coupon');
    const FoodCategory = require('../models/PostgreSQL/FoodCategory');

    // Get all data in parallel for better performance
    const [banners, coupons, categories, featuredFoods] = await Promise.all([
      // Get active banners/sliders for this restaurant
      Banner.getActiveBanners(restaurant_id),
      // Get available promotions/coupons
      Coupon.getAvailableCoupons(restaurant_id),
      // Get active food categories
      FoodCategory.findByRestaurantId(restaurant_id, true),
      // Get featured foods (top-rated, available, featured flag)
      Food.findFeaturedFoods(restaurant_id)
    ]);

    // Format sliders/banners
    const sliders = banners.map(banner => ({
      id: banner.id,
      image_url: banner.image_url,
      title: banner.title || null,
      description: banner.description || null,
      link_url: banner.link_url || null
    }));

    // Format promotions/coupons
    const promotions = coupons.map(coupon => {
      let discount_percentage = null;
      if (coupon.type === 'percentage') {
        discount_percentage = parseFloat(coupon.value);
      }

      return {
        id: coupon.id,
        title: `${coupon.type === 'percentage' ? discount_percentage + '%' : '$' + coupon.value} Off` +
          (coupon.code ? ` - ${coupon.code}` : ''),
        discount_percentage: discount_percentage,
        image_url: null, // Coupons don't have images in current schema
        valid_till: coupon.valid_until
      };
    });

    // Format food categories
    const foodCategories = categories.map(category => ({
      id: category.id,
      name: category.name,
      image_url: category.image_url || null,
      description: category.description || null
    }));

    // Format featured foods
    const featured = featuredFoods.map(food => ({
      id: food.id,
      name: food.name,
      category_id: food.category_id,
      price: parseFloat(food.price),
      image_url: food.image_url || null,
      rating: parseFloat(food.rating || 0),
      description: food.description || null
    }));

    // Return structured response
    res.json({
      success: true,
      message: 'Homepage data retrieved successfully',
      data: {
        sliders,
        promotions,
        food_categories: foodCategories,
        featured_foods: featured
      }
    });
  } catch (error) {
    console.error('Get homepage error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get foods (filtered by restaurant_id from config or user's restaurant_id)
exports.getFoods = async (req, res) => {
  try {
    // [DEBUG] Log request data to debug undefined restaurant_id
    console.log('[DEBUG] getFoods - req.user:', req.user);
    console.log('[DEBUG] getFoods - req.restaurant_id:', req.restaurant_id);
    console.log('[DEBUG] getFoods - req.body:', req.body);

    // Use restaurant_id from user or request (if using config-based restaurant_id)
    // Preference: 1. req.restaurant_id (set by middleware), 2. req.user.restaurant_id, 3. req.body.restaurant_id
    const restaurant_id = req.restaurant_id || req.user?.restaurant_id || req.body?.restaurant_id;

    if (!restaurant_id) {
      console.error('[ERROR] getFoods - No restaurant_id found in request');
      return res.status(400).json({ message: 'restaurant_id is required' });
    }

    // Verify restaurant is active
    const restaurant = await Restaurant.findById(restaurant_id);
    if (!restaurant || !restaurant.is_active) {
      return res.status(403).json({
        message: 'Restaurant account is frozen or not found'
      });
    }

    const foods = await Food.findByRestaurantId(restaurant_id, true); // Only available foods

    res.json({
      message: 'Foods retrieved successfully',
      foods
    });
  } catch (error) {
    console.error('Get foods error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Place order
exports.placeOrder = async (req, res) => {
  try {
    const { items, delivery_lat, delivery_lng } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: 'Order items are required'
      });
    }

    if (!delivery_lat || !delivery_lng) {
      return res.status(400).json({
        message: 'Delivery location (latitude and longitude) is required'
      });
    }

    // Calculate total amount
    let total_amount = 0;
    for (const item of items) {
      if (!item.food_id || !item.quantity || !item.price) {
        return res.status(400).json({
          message: 'Each item must have food_id, quantity, and price'
        });
      }
      total_amount += parseFloat(item.price) * parseInt(item.quantity);
    }

    // Verify restaurant is active
    const restaurant = await Restaurant.findById(req.user.restaurant_id);
    if (!restaurant || !restaurant.is_active) {
      return res.status(403).json({
        message: 'Restaurant account is frozen'
      });
    }

    // Verify all foods belong to the restaurant
    for (const item of items) {
      const food = await Food.findById(item.food_id);
      if (!food || food.restaurant_id !== req.user.restaurant_id) {
        return res.status(400).json({
          message: `Food ${item.food_id} not found or does not belong to restaurant`
        });
      }
      if (!food.is_available) {
        return res.status(400).json({
          message: `Food ${food.name} is not available`
        });
      }
      // Check stock
      if (food.stock_quantity !== undefined && food.stock_quantity !== null && !food.is_unlimited) {
        if (food.stock_quantity < parseInt(item.quantity)) {
          return res.status(400).json({
            message: `Insufficient stock for ${food.name}. Only ${food.stock_quantity} left.`
          });
        }
      }
    }

    const order = await Order.create({
      user_id: req.user.id,
      restaurant_id: req.user.restaurant_id,
      total_amount,
      delivery_lat: parseFloat(delivery_lat),
      delivery_lng: parseFloat(delivery_lng),
      items
    });

    res.status(201).json({
      message: 'Order placed successfully',
      order
    });
  } catch (error) {
    console.error('Place order error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get order tracking
exports.getOrderTracking = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Verify order belongs to user
    if (order.user_id !== req.user.id) {
      return res.status(403).json({
        message: 'Access denied: Order does not belong to you'
      });
    }

    // Get latest tracking
    const latestTracking = await OrderTracking.getLatestByOrderId(id);
    const allTracking = await OrderTracking.getByOrderId(id);

    // Get rider info if assigned
    let rider = null;
    if (order.rider_id) {
      const Rider = require('../models/PostgreSQL/Rider');
      rider = await Rider.findById(order.rider_id);
    }

    res.json({
      message: 'Tracking information retrieved successfully',
      order: {
        id: order.id,
        status: order.status,
        delivery_lat: order.delivery_lat,
        delivery_lng: order.delivery_lng,
        rider: rider ? {
          id: rider.id,
          name: rider.name,
          phone: rider.phone,
          current_lat: rider.current_lat,
          current_lng: rider.current_lng
        } : null
      },
      latest_tracking: latestTracking,
      tracking_history: allTracking
    });
  } catch (error) {
    console.error('Get order tracking error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get user orders
exports.getMyOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const orders = await Order.findByUserId(req.user.id);

    res.json({
      message: 'Orders retrieved successfully',
      orders
    });
  } catch (error) {
    console.error('Get my orders error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get Profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'Profile retrieved successfully',
      user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update Profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, avatar_url } = req.body;
    const updateData = {};

    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    if (avatar_url) updateData.avatar_url = avatar_url;

    const { query } = require('../config/db');
    const updates = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updateData)) {
      updates.push(`${key} = $${paramCount++}`);
      values.push(value);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(req.user.id);

    const result = await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} 
       RETURNING id, name, email, phone, restaurant_id, avatar_url, created_at`,
      values
    );

    res.json({
      message: 'Profile updated successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
