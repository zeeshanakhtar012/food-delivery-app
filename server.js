require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');

// Routes
const superAdminRoutes = require('./routes/superAdminRoutes');
const restaurantAdminRoutes = require('./routes/restaurantAdminRoutes');
const userRoutes = require('./routes/userRoutes');
const riderRoutes = require('./routes/riderRoutes');

// Models for Socket.IO authentication
const Admin = require('./models/PostgreSQL/Admin');
const User = require('./models/PostgreSQL/User');
const Rider = require('./models/PostgreSQL/Rider');
const Restaurant = require('./models/PostgreSQL/Restaurant');

const app = express();
const server = http.createServer(app);

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Make io accessible to controllers
app.set('io', io);

const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  credentials: true
}));
app.use(express.json());
app.use(morgan('dev'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Test database connection
const { pool } = require('./config/db');
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ PostgreSQL connection error:', err);
  } else {
    console.log('✅ PostgreSQL connected successfully');
  }
});

// Socket.IO authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return next(new Error('Authentication error: Token missing'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if restaurant is active (unless super admin)
    if (decoded.role !== 'super_admin' && decoded.restaurant_id) {
      const restaurant = await Restaurant.findById(decoded.restaurant_id);
      if (!restaurant || !restaurant.is_active) {
        return next(new Error('Restaurant account is frozen'));
      }
    }

    // Get user details based on role
    let userDetails = null;
    if (decoded.role === 'super_admin' || decoded.role === 'restaurant_admin') {
      const admin = await Admin.findById(decoded.id);
      if (!admin) {
        return next(new Error('User not found'));
      }
      userDetails = {
        id: decoded.id,
        role: decoded.role,
        restaurant_id: decoded.restaurant_id
      };
    } else if (decoded.role === 'user') {
      const user = await User.findById(decoded.id);
      if (!user) {
        return next(new Error('User not found'));
      }
      userDetails = {
        id: decoded.id,
        role: decoded.role,
        restaurant_id: decoded.restaurant_id
      };
    } else if (decoded.role === 'rider') {
      const rider = await Rider.findById(decoded.id);
      if (!rider) {
        return next(new Error('Rider not found'));
      }
      userDetails = {
        id: decoded.id,
        role: decoded.role,
        restaurant_id: decoded.restaurant_id
      };
    }

    socket.user = userDetails;
    next();
  } catch (error) {
    console.error('Socket.IO auth error:', error.message);
    next(new Error('Authentication error: Invalid token'));
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}, User: ${socket.user.id}, Role: ${socket.user.role}`);

  // Join user-specific room
  socket.join(`user:${socket.user.id}`);

  // Join role-specific rooms
  if (socket.user.role === 'super_admin' || socket.user.role === 'restaurant_admin') {
    socket.join('admin');
    if (socket.user.restaurant_id) {
      socket.join(`restaurant:${socket.user.restaurant_id}`);
    }
  }

  // Join order tracking room if user is viewing an order
  socket.on('joinOrderRoom', (orderId) => {
    socket.join(`order:${orderId}`);
    console.log(`User ${socket.user.id} joined order room: ${orderId}`);
  });

  // Handle rider location updates
  socket.on('riderLocationUpdate', async (data) => {
    try {
      const { order_id, lat, lng } = data;

      if (!order_id || !lat || !lng) {
        socket.emit('error', { message: 'Order ID, latitude, and longitude are required' });
        return;
      }

      // Verify rider is sending the update
      if (socket.user.role !== 'rider') {
        socket.emit('error', { message: 'Only riders can send location updates' });
        return;
      }

      // Update rider location
      await Rider.updateLocation(socket.user.id, parseFloat(lat), parseFloat(lng));

      // Create tracking entry
      const OrderTracking = require('./models/PostgreSQL/OrderTracking');
      const tracking = await OrderTracking.create({
        order_id,
        rider_id: socket.user.id,
        current_lat: parseFloat(lat),
        current_lng: parseFloat(lng)
      });

      // Broadcast to order room (user and restaurant admin)
      io.to(`order:${order_id}`).emit('riderLocationUpdate', {
        order_id,
        rider_id: socket.user.id,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        timestamp: tracking.timestamp
      });

      // Also emit to restaurant admin room
      if (socket.user.restaurant_id) {
        io.to(`restaurant:${socket.user.restaurant_id}`).emit('riderLocationUpdate', {
          order_id,
          rider_id: socket.user.id,
          lat: parseFloat(lat),
          lng: parseFloat(lng),
          timestamp: tracking.timestamp
        });
      }
    } catch (error) {
      console.error('Socket.IO rider location update error:', error.message);
      socket.emit('error', { message: 'Failed to update location', error: error.message });
    }
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

// API Routes
app.use('/api/superadmin', superAdminRoutes);
app.use('/api/admin', restaurantAdminRoutes);
app.use('/api/user', userRoutes);
app.use('/api/rider', riderRoutes);

// User feature routes
app.use('/api/user/addresses', require('./routes/userAddressRoutes'));
app.use('/api/user/cart', require('./routes/userCartRoutes'));
app.use('/api/user/favorites', require('./routes/userFavoriteRoutes'));

// Common routes
app.use('/api/reviews', require('./routes/reviewRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/coupons', require('./routes/couponRoutes'));
app.use('/api/chat', require('./routes/chatRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));

// Rider routes
app.use('/api/rider/wallet', require('./routes/riderWalletRoutes'));

// Restaurant Admin routes
app.use('/api/admin/categories', require('./routes/restaurantCategoryRoutes'));
app.use('/api/admin/addons', require('./routes/restaurantAddonRoutes'));
app.use('/api/admin/staff', require('./routes/restaurantStaffRoutes'));

// Super Admin routes
app.use('/api/banners', require('./routes/bannerRoutes'));
app.use('/api/faqs', require('./routes/faqRoutes'));
app.use('/api/settings', require('./routes/appSettingRoutes'));
app.use('/api/audit-logs', require('./routes/auditLogRoutes'));

// Default route
app.get('/', (req, res) => {
  res.send('🚀 Welcome to NoteNest Multi-Restaurant API');
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: 'PostgreSQL'
  });
});

// 404 Handler
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});