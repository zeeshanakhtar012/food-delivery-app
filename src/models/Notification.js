const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Notification title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    maxlength: [500, 'Message cannot exceed 500 characters']
  },
  targetUsers: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'User',
    default: []
  },
  restaurantId: {
    type: String,
    ref: 'Restaurant',
    required: [true, 'Restaurant ID is required']
  },
  city: {
    type: String,
    ref: 'City',
    required: [true, 'City is required']
  },
  foodId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Food',
    default: null
  },
  sentAt: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

notificationSchema.index({ restaurantId: 1, city: 1 });

module.exports = mongoose.model('Notification', notificationSchema);