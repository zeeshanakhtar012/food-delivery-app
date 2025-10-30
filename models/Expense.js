const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  type: { type: String, enum: ['ingredient', 'utility', 'staff', 'other'], required: true }, // e.g., what they "buy"
  description: { type: String, required: true },
  amount: { type: Number, required: true, min: 0 },
  date: { type: Date, default: Date.now },
  category: { type: String }, // e.g., "Vegetables" for ingredients
  isRecurring: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AppUser' }
}, { timestamps: true });

module.exports = mongoose.model('Expense', expenseSchema);