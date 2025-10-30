const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: [true, 'Action is required'],
    trim: true
  },
  entity: {
    type: String,
    required: [true, 'Entity is required'],
    enum: ['User', 'Food', 'Order', 'AppConfig', 'Advertisement', 'Notification', 'Discount', 'Restaurant', 'Cart'] // Added 'Cart'
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  details: {
    type: String,
    maxlength: [1000, 'Details cannot exceed 1000 characters']
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('AuditLog', auditLogSchema);