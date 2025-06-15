const mongoose = require('mongoose');

const appConfigSchema = new mongoose.Schema({
  primaryColor: {
    type: String,
    default: '#FF5733', // Default orange
    match: [/^#[0-9A-F]{6}$/, 'Must be a valid hex color code']
  },
  secondaryColor: {
    type: String,
    default: '#FFC107', // Default yellow
    match: [/^#[0-9A-F]{6}$/, 'Must be a valid hex color code']
  },
  logoUrl: {
    type: String,
    default: 'https://example.com/default-logo.png'
  },
  splashScreenUrl: {
    type: String,
    default: 'https://example.com/default-splash.png'
  },
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