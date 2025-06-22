const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Defines the User schema for the NOTENEST app, managing user data including authentication, addresses, and order-related features.

const addressSchema = new mongoose.Schema({
  street: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  postalCode: { type: String, required: true },
  country: { type: String, required: true },
  isDefault: { type: Boolean, default: false },
  coordinates: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }
  }
});

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address']
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
    match: [/^\+?[1-9]\d{1,14}$/, 'Please use a valid phone number']
  },
  dateOfBirth: {
    type: Date,
    default: null
  },
  addresses: [addressSchema],
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    }
  },
  bio: {
    type: String,
    default: '',
    maxlength: [200, 'Bio cannot exceed 200 characters']
  },
  profileImage: {
    type: String,
    default: "https://plus.unsplash.com/premium_photo-1740097670001-28363fa53ee3?q=80&w=2274&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
  },
  preferences: {
    dietary: [{ type: String, enum: ['vegetarian', 'vegan', 'gluten-free', 'non-vegetarian', 'other'] }],
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: true },
      push: { type: Boolean, default: true }
    }
  },
  orders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],
  cancelledOrders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],
  loyaltyPoints: {
    type: Number,
    default: 0
  },
  lastLogin: {
    type: Date,
    default: null
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  favorites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Food'
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for geolocation queries
userSchema.index({ location: '2dsphere' });
userSchema.index({ 'addresses.coordinates': '2dsphere' });

// Password hashing middleware
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Password comparison method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Virtual for total orders
userSchema.virtual('totalOrders').get(function() {
  return this.orders.length + this.cancelledOrders.length;
});

// Static method for order analytics
userSchema.statics.getOrderAnalytics = async function(userId, startDate, endDate) {
  try {
    const analytics = await this.model('Order').aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: '$totalAmount' },
          averageOrderValue: { $avg: '$totalAmount' },
          statusCounts: {
            $push: '$status'
          }
        }
      },
      {
        $project: {
          totalOrders: 1,
          totalSpent: 1,
          averageOrderValue: 1,
          statusCounts: {
            $arrayToObject: {
              $map: {
                input: { $setUnion: ['$statusCounts', []] },
                as: 'status',
                in: {
                  k: '$$status',
                  v: { $sum: { $cond: [{ $eq: ['$statusCounts', '$$status'] }, 1, 0] } }
                }
              }
            }
          }
        }
      }
    ]);

    return analytics.length > 0 ? analytics : [{
      totalOrders: 0,
      totalSpent: 0,
      averageOrderValue: 0,
      statusCounts: {}
    }];
  } catch (error) {
    throw new Error(`Failed to fetch order analytics: ${error.message}`);
  }
};

module.exports = mongoose.model('User', userSchema);