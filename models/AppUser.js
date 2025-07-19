const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  street: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  postalCode: { type: String, required: true },
  country: { type: String, required: true }
});

const appUserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    match: [/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format']
  },
  role: {
    type: String,
    enum: ['user', 'super_admin', 'restaurant_admin'],
    default: 'user'
  },
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: function() { return this.role === 'restaurant_admin'; }
  },
  addresses: [addressSchema],
  orders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],
  cancelledOrders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],
  favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Food' }],
  loyaltyPoints: {
    type: Number,
    default: 0,
    min: [0, 'Loyalty points cannot be negative']
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date
  },
  lastLogin: {
    type: Date
  },
  profileImage: {
    type: String,
    default: 'https://example.com/default-profile.png'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

module.exports = mongoose.model('AppUser', appUserSchema);