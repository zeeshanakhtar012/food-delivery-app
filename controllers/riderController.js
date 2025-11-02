const Rider = require('../models/PostgreSQL/Rider');
const Order = require('../models/PostgreSQL/Order');
const OrderTracking = require('../models/PostgreSQL/OrderTracking');
const Restaurant = require('../models/PostgreSQL/Restaurant');
const jwt = require('jsonwebtoken');

// Rider Login
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

    const rider = await Rider.findByEmailAndRestaurant(email, restaurant_id);
    if (!rider) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isValidPassword = await Rider.comparePassword(password, rider.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
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

    res.json({
      message: 'Login successful',
      token,
      rider: {
        id: rider.id,
        name: rider.name,
        email: rider.email,
        phone: rider.phone,
        vehicle_number: rider.vehicle_number,
        restaurant_id: rider.restaurant_id,
        is_available: rider.is_available
      }
    });
  } catch (error) {
    console.error('Rider login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get assigned orders
exports.getAssignedOrders = async (req, res) => {
  try {
    const orders = await Order.findByRiderId(req.user.id);

    res.json({
      message: 'Assigned orders retrieved successfully',
      orders
    });
  } catch (error) {
    console.error('Get assigned orders error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update order status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    const validStatuses = ['accepted', 'preparing', 'picked_up', 'delivered'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
      });
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
      return res.status(403).json({ 
        message: 'Access denied: Order does not belong to your restaurant' 
      });
    }

    const updatedOrder = await Order.updateStatus(id, status);

    res.json({
      message: 'Order status updated successfully',
      order: updatedOrder
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Send live GPS location
exports.sendLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const { lat, lng } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({ 
        message: 'Latitude and longitude are required' 
      });
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

    res.json({
      message: 'Location updated successfully',
      tracking: {
        id: tracking.id,
        order_id: tracking.order_id,
        current_lat: tracking.current_lat,
        current_lng: tracking.current_lng,
        timestamp: tracking.timestamp
      }
    });
  } catch (error) {
    console.error('Send location error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
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
        created_at: rider.created_at
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
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
      return res.status(400).json({ message: 'No fields to update' });
    }

    values.push(req.user.id);
    const result = await query(
      `UPDATE riders SET ${updates.join(', ')} WHERE id = $${paramCount} 
       RETURNING id, name, email, phone, vehicle_number, restaurant_id, avatar_url, created_at`,
      values
    );

    res.json({
      message: 'Profile updated successfully',
      rider: result.rows[0]
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
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
      rider: updated
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
      return res.status(400).json({ 
        message: `Status is required and must be one of: ${validStatuses.join(', ')}` 
      });
    }

    const { query } = require('../config/db');
    const result = await query(
      `UPDATE riders SET status = $1 WHERE id = $2 
       RETURNING id, status, is_available`,
      [status, req.user.id]
    );

    res.json({
      message: 'Status updated successfully',
      rider: result.rows[0]
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Accept order
exports.acceptOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Verify order is assigned to this rider or available
    if (order.rider_id && order.rider_id !== req.user.id) {
      return res.status(403).json({ 
        message: 'Access denied: Order is assigned to another rider' 
      });
    }

    // Verify order belongs to rider's restaurant
    if (order.restaurant_id !== req.user.restaurant_id) {
      return res.status(403).json({ 
        message: 'Access denied: Order does not belong to your restaurant' 
      });
    }

    // Update order with rider
    const updatedOrder = await Order.updateStatus(id, 'accepted', req.user.id);

    // Update rider status to busy
    await Rider.updateAvailability(req.user.id, false);

    res.json({
      message: 'Order accepted successfully',
      order: updatedOrder
    });
  } catch (error) {
    console.error('Accept order error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Reject order (unassign rider)
exports.rejectOrder = async (req, res) => {
  try {
    const { id } = req.params;

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

    // Remove rider from order (set status back to accepted or preparing)
    const updatedOrder = await Order.updateStatus(id, order.status, null);

    res.json({
      message: 'Order rejected successfully',
      order: updatedOrder
    });
  } catch (error) {
    console.error('Reject order error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

