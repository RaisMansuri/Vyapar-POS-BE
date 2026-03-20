const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    enum: ['Sale', 'Expense', 'Refund', 'Wallet Top-up'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'Card', 'UPI', 'Wallet', 'Mixed'],
    required: true
  },
  status: {
    type: String,
    enum: ['Completed', 'Pending', 'Failed', 'Cancelled'],
    default: 'Completed'
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'referenceModel'
  },
  referenceModel: {
    type: String,
    required: true,
    enum: ['Sale', 'Expense']
  },
  customerId: {
    type: String, // String ID used in this project
    default: null
  },
  customerName: {
    type: String,
    default: null
  },
  processedBy: {
    type: String,
    default: 'System'
  },
  description: {
    type: String
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for faster lookups
TransactionSchema.index({ timestamp: -1 });
TransactionSchema.index({ type: 1 });
TransactionSchema.index({ transactionId: 1 });

module.exports = mongoose.model('Transaction', TransactionSchema);
