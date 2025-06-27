const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema({
  restaurantId: {
    type: String,
    required: [true, 'Restaurant ID is required'],
    unique: true
  },
  name: {
    type: String,
    required: [true, 'Restaurant name is required'],
    trim: true
  },
  city: {
    type: String,
    ref: 'City',
    required: [true, 'City is required']
  },
  address: {
    street: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, required: true }
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Admin is required']
  },
  logoUrl: {
    type: String,
    default: 'https://images.unsplash.com/photo-1504674900247-0877df9cc926?q=80&w=2070&auto=format&fit=crop'
  },
  banners: [{ type: String }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

restaurantSchema.index({ restaurantId: 1, city: 1 });

module.exports = mongoose.model('Restaurant', restaurantSchema);