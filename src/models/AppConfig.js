const mongoose = require('mongoose');

const appConfigSchema = new mongoose.Schema({
  enableAds: {
    type: Boolean,
    default: true
  },
  enableNotifications: {
    type: Boolean,
    default: true
  },
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('AppConfig', appConfigSchema);