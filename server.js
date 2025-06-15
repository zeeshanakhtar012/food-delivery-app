require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');
const userRoutes = require('./routes/userRoutes');
const foodRoutes = require('./routes/foodRoutes');

// Explicitly import models
const Discount = require('./models/Discount');
const Order = require('./models/Order');
const Product = require('./models/Product');
const User = require('./models/User');
const Food = require('./models/Food');
const Comment = require('./models/Comment');
const Rating = require('./models/Rating');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(express.json());
app.use(morgan('dev'));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

// Routes
app.use('/api/users', userRoutes);
app.use('/api/foods', foodRoutes);

// Default route
app.get('/', (req, res) => {
  res.send('🚀 Welcome to NoteNest API');
});

// 404 Handler
app.use((req, res, next) => {
  res.status(404).json({ message: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});