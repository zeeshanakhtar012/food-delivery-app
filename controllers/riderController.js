const Rider = require('../models/PostgreSQL/Rider');
const Order = require('../models/PostgreSQL/Order');
const OrderTracking = require('../models/PostgreSQL/OrderTracking');
const Restaurant = require('../models/PostgreSQL/Restaurant');
const jwt = require('jsonwebtoken');
const { successResponse, errorResponse } = require('../helpers/response');

// Rider Login
exports.login = async (req, res) => {
  try {
    const { email, password, restaurant_id } = req.body;

    if (!email || !password || !restaurant_id) {
      return errorResponse(res, 'Email, password, and restaurant_id are required', 400);
    }

    // Verify restaurant exists and is active
    const restaurant = await Restaurant.findById(restaurant_id);
    if (!restaurant) {
      return errorResponse(res, 'Restaurant not found', 404);
    }
    if (!restaurant.is_active) {
      return errorResponse(res, 'Restaurant account is frozen. Please contact support.', 403);
    }

    const rider = await Rider.findByEmailAndRestaurant(email, restaurant_id);
    if (!rider) {
      return errorResponse(res, 'Invalid credentials', 401);
    }

    const isValidPassword = await Rider.comparePassword(password, rider.password);
    if (!isValidPassword) {
      return errorResponse(res, 'Invalid credentials', 401);
    }

    if (!rider.is_active) {
      // Emit socket event to admin dashboard
      const io = req.app.get('io');
      if (io) {
        io.to(`restaurant:${restaurant_id}`).emit('riderLoginRequest', {
          rider_id: rider.id,
          name: rider.name,
          email: rider.email,
          vehicle_number: rider.vehicle_number,
          timestamp: new Date()
        });
      }
      return errorResponse(res, 'Your account is pending approval or has been frozen by the admin. Please wait for approval.', 403);
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: rider.id,
        role: 'rider',
        restaurant_id: rider.restaurant_id
      },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    return successResponse(res, {
      token,
      rider: {
        id: rider.id,
        name: rider.name,
        email: rider.email,
        phone: rider.phone,
        vehicle_number: rider.vehicle_number,
        restaurant_id: rider.restaurant_id,
        is_available: rider.is_available,
        is_active: rider.is_active,
        role: 'rider'
      }
    }, 'Login successful');
  } catch (error) {
    console.error('Rider login error:', error);
    next(error);
  }
};

// Get available orders (unassigned and ready/preparing)
exports.getAvailableOrders = async (req, res) => {
  try {
    const { query } = require('../config/db');
    // Fetch orders that are 'accepted' or 'preparing' or 'ready' AND have NO rider_id
    // And belong to the rider's restaurant? Or any restaurant?
    // Usually riders are tied to a restaurant in this schema (user.restaurant_id).

    // Note: If rider is "free", they can pick up orders.
    const result = await query(
      `SELECT o.*, 
              u.name as user_name, u.phone as user_phone, u.avatar_url as user_avatar,
              r.name as restaurant_name, r.address as restaurant_address, r.logo_url as restaurant_logo
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       JOIN restaurants r ON o.restaurant_id = r.id
       WHERE o.rider_id IS NULL 
       AND o.status IN ('accepted', 'preparing', 'ready')
       AND o.restaurant_id = $1
       ORDER BY o.created_at ASC`, // Oldest first
      [req.user.restaurant_id]
    );

    // Fetch items for each order (optional, but good for rider to see size)
    // skipping distinct items fetch for speed, or can implement if needed.

    return successResponse(res, result.rows, 'Available orders retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// Get assigned orders
exports.getAssignedOrders = async (req, res) => {
  try {
    const orders = await Order.findByRiderId(req.user.id);

    return successResponse(res, orders, 'Assigned orders retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// Update order status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return errorResponse(res, 'Status is required', 400);
    }

    const validStatuses = ['accepted', 'preparing', 'picked_up', 'delivered'];
    if (!validStatuses.includes(status)) {
      return errorResponse(res, `Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400);
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Verify order is assigned to this rider
    if (order.rider_id !== req.user.id) {
      return res.status(403).json({
        message: 'Access denied: Order is not assigned to you'
      });
    }

    // Verify order belongs to rider's restaurant
    if (order.restaurant_id !== req.user.restaurant_id) {
      return errorResponse(res, 'Access denied: Order does not belong to your restaurant', 403);
    }

    const updatedOrder = await Order.updateStatus(id, status);

    return successResponse(res, updatedOrder, 'Order status updated successfully');
  } catch (error) {
    next(error);
  }
};

// Send live GPS location
exports.sendLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const { lat, lng } = req.body;

    if (!lat || !lng) {
      return errorResponse(res, 'Latitude and longitude are required', 400);
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Verify order is assigned to this rider
    if (order.rider_id !== req.user.id) {
      return res.status(403).json({
        message: 'Access denied: Order is not assigned to you'
      });
    }

    // Update rider's current location
    await Rider.updateLocation(req.user.id, parseFloat(lat), parseFloat(lng));

    // Create tracking entry
    const tracking = await OrderTracking.create({
      order_id: id,
      rider_id: req.user.id,
      current_lat: parseFloat(lat),
      current_lng: parseFloat(lng)
    });

    // Emit Socket.IO event for real-time tracking
    const io = req.app.get('io');
    if (io) {
      // Emit to order room (user and restaurant admin watching this order)
      io.to(`order:${id}`).emit('riderLocationUpdate', {
        order_id: id,
        rider_id: req.user.id,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        timestamp: tracking.timestamp
      });

      // Emit to user specifically
      io.to(`user:${order.user_id}`).emit('riderLocationUpdate', {
        order_id: id,
        rider_id: req.user.id,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        timestamp: tracking.timestamp
      });

      // Emit to restaurant admin room
      io.to(`restaurant:${order.restaurant_id}`).emit('riderLocationUpdate', {
        order_id: id,
        rider_id: req.user.id,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        timestamp: tracking.timestamp
      });
    }

    return successResponse(res, {
      id: tracking.id,
      order_id: tracking.order_id,
      current_lat: tracking.current_lat,
      current_lng: tracking.current_lng,
      timestamp: tracking.timestamp
    }, 'Location updated successfully');
  } catch (error) {
    next(error);
  }
};

// Get rider profile
exports.getProfile = async (req, res) => {
  try {
    const rider = await Rider.findById(req.user.id);

    if (!rider) {
      return res.status(404).json({ message: 'Rider not found' });
    }

    res.json({
      message: 'Profile retrieved successfully',
      rider: {
        id: rider.id,
        name: rider.name,
        email: rider.email,
        phone: rider.phone,
        vehicle_number: rider.vehicle_number,
        restaurant_id: rider.restaurant_id,
        current_lat: rider.current_lat,
        current_lng: rider.current_lng,
        is_available: rider.is_available,
        status: rider.status,
        rating: rider.rating,
        total_reviews: rider.total_reviews,
        total_deliveries: rider.total_deliveries,
        total_earnings: rider.total_earnings,
        wallet_balance: rider.wallet_balance,
        created_at: rider.created_at,
        role: 'rider'
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Check status (GET)
exports.getStatus = async (req, res) => {
  try {
    const rider = await Rider.findById(req.user.id);
    if (!rider) {
      return errorResponse(res, 'Rider not found', 404);
    }
    return successResponse(res, {
      id: rider.id,
      is_active: rider.is_active,
      status: rider.status,
      is_available: rider.is_available,
      role: 'rider'
    }, 'Status retrieved');
  } catch (error) {
    next(error);
  }
};

// Update profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, vehicle_number, avatar_url } = req.body;
    const { query } = require('../config/db');

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (phone) {
      updates.push(`phone = $${paramCount++}`);
      values.push(phone);
    }
    if (vehicle_number !== undefined) {
      updates.push(`vehicle_number = $${paramCount++}`);
      values.push(vehicle_number);
    }
    if (avatar_url) {
      updates.push(`avatar_url = $${paramCount++}`);
      values.push(avatar_url);
    }

    if (updates.length === 0) {
      return errorResponse(res, 'No fields to update', 400);
    }

    values.push(req.user.id);
    const result = await query(
      `UPDATE riders SET ${updates.join(', ')} WHERE id = $${paramCount} 
       RETURNING id, name, email, phone, vehicle_number, restaurant_id, avatar_url, is_active, created_at`,
      values
    );

    return successResponse(res, { ...result.rows[0], role: 'rider' }, 'Profile updated successfully');
  } catch (error) {
    next(error);
  }
};

// Toggle availability
exports.toggleAvailability = async (req, res) => {
  try {
    const { is_available } = req.body;

    if (is_available === undefined) {
      return res.status(400).json({ message: 'is_available is required' });
    }

    const updated = await Rider.updateAvailability(req.user.id, is_available);

    res.json({
      message: `Rider ${is_available ? 'marked as available' : 'marked as unavailable'}`,
      rider: { ...updated, role: 'rider' }
    });
  } catch (error) {
    console.error('Toggle availability error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update status (online/offline/busy)
exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const validStatuses = ['online', 'offline', 'busy'];
    if (!status || !validStatuses.includes(status)) {
      return errorResponse(res, `Status is required and must be one of: ${validStatuses.join(', ')}`, 400);
    }

    const { query } = require('../config/db');
    const result = await query(
      `UPDATE riders SET status = $1 WHERE id = $2 
       RETURNING id, status, is_available`,
      [status, req.user.id]
    );

    return successResponse(res, { ...result.rows[0], role: 'rider' }, 'Status updated successfully');
  } catch (error) {
    next(error);
  }
};

// Accept order
exports.acceptOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id);
    if (!order) {
      return errorResponse(res, 'Order not found', 404);
    }

    // Verify order is assigned to this rider or available
    if (order.rider_id && order.rider_id !== req.user.id) {
      return errorResponse(res, 'Access denied: Order is assigned to another rider', 403);
    }

    // Verify order belongs to rider's restaurant
    if (order.restaurant_id !== req.user.restaurant_id) {
      return errorResponse(res, 'Access denied: Order does not belong to your restaurant', 403);
    }

    // Update order with rider
    const updatedOrder = await Order.updateStatus(id, 'accepted', req.user.id);

    // Update rider status to busy
    await Rider.updateAvailability(req.user.id, false);

    return successResponse(res, updatedOrder, 'Order accepted successfully');
  } catch (error) {
    next(error);
  }
};

// Reject order (unassign rider)
exports.rejectOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id);
    if (!order) {
      return errorResponse(res, 'Order not found', 404);
    }

    // Verify order is assigned to this rider
    if (order.rider_id !== req.user.id) {
      return errorResponse(res, 'Access denied: Order is not assigned to you', 403);
    }

    // Remove rider from order (set status back to accepted or preparing)
    const updatedOrder = await Order.updateStatus(id, order.status, null);

    return successResponse(res, updatedOrder, 'Order rejected successfully');
  } catch (error) {
    next(error);
  }
};

