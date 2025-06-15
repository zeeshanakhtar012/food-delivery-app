const mongoose = require('mongoose');

const discountSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  type: { type: String, enum: ['percentage', 'fixed'], default: 'fixed' },
  value: { type: Number, required: true, min: 0 },
  validFrom: Date,
  validUntil: Date,
  maxUses: Number,
  usedCount: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Discount', discountSchema);