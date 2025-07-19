require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const userRoutes = require('./routes/userRoutes');
const foodRoutes = require('./routes/foodRoutes');
const adminRoutes = require('./routes/adminRoutes');
const supportRoutes = require('./routes/supportRoutes');

// Explicitly import models
const Discount = require('./models/Discount');
const Order = require('./models/Order');
const Product = require('./models/Product');
const User = require('./models/User');
const AppUser = require('./models/AppUser'); // Added AppUser
const Food = require('./models/Food');
const Comment = require('./models/Comment');
const Rating = require('./models/Rating');
const AppConfig = require('./models/AppConfig');
const Advertisement = require('./models/Advertisement');
const Notification = require('./models/Notification');
const AuditLog = require('./models/AuditLog');
const Cart = require('./models/Cart');
const Message = require('./models/Message');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true
  }
});

const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  credentials: true
}));
app.use(express.json());
app.use(morgan('dev'));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.error('❌ MongoDB connection error:', err.message, err.stack));

// Socket.IO authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error: Token missing'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Check AppUser for admin-related sockets, User for regular users
    let user = await AppUser.findById(decoded.userId).select('isAdmin isDeleted role');
    if (!user) {
      user = await User.findById(decoded.userId).select('isAdmin isDeleted');
    }
    if (!user || user.isDeleted) {
      return next(new Error('Authentication error: User not found or deactivated'));
    }

    socket.user = { userId: decoded.userId, isAdmin: user.isAdmin, role: user.role };
    next();
  } catch (error) {
    console.error('Socket.IO auth error:', error.message, error.stack);
    next(new Error('Authentication error: Invalid token'));
  }
});

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}, User: ${socket.user.userId}, Role: ${socket.user.role}`);

  // Join user-specific room
  socket.join(`user:${socket.user.userId}`);
  if (socket.user.isAdmin) {
    socket.join('admin');
  }

  // Handle support message from user or admin
  socket.on('supportMessage', async (data) => {
    try {
      const { content } = data;
      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        socket.emit('error', { message: 'Message content is required' });
        return;
      }

      // Sanitize content
      const sanitizedContent = content.trim().substring(0, 1000);

      // Save message to database
      const message = await Message.create({
        userId: socket.user.userId,
        senderType: socket.user.isAdmin ? 'admin' : 'user',
        content: sanitizedContent
      });

      // Emit to admin room and user
      const messageData = {
        _id: message._id,
        userId: message.userId,
        senderType: message.senderType,
        content: message.content,
        isRead: message.isRead,
        createdAt: message.createdAt
      };

      io.to('admin').emit('supportMessage', messageData);
      io.to(`user:${socket.user.userId}`).emit('supportMessage', messageData);

      // Log action
      await AuditLog.create({
        action: 'Send Support Message',
        entity: 'Message',
        entityId: message._id,
        details: `Sent message: ${sanitizedContent}`,
        performedBy: socket.user.userId
      });
    } catch (error) {
      console.error('Socket.IO support message error:', error.message, error.stack);
      socket.emit('error', { message: 'Failed to send message', error: error.message });
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

// Routes
app.use('/api/users', userRoutes);
app.use('/api/foods', foodRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/support', supportRoutes);

// Default route
app.get('/', (req, res) => {
  res.send('🚀 Welcome to NoteNest API');
});

// 404 Handler
app.use((req, res, next) => {
  res.status(404).json({ message: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err.message, err.stack);
  res.status(500).json({ message: 'Server error', error: err.message });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});