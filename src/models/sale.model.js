const mongoose = require('mongoose');

const SaleItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.Mixed
  },
  name: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true
  },
  total: {
    type: Number,
    required: true
  },
  category: {
    type: String,
    default: 'Uncategorized'
  }
});

const SaleSchema = new mongoose.Schema({
  saleNumber: {
    type: String,
    required: true,
    unique: true
  },
  items: [SaleItemSchema],
  totalAmount: {
    type: Number,
    required: true
  },
  tax: {
    type: Number,
    default: 0
  },
  discount: {
    type: Number,
    default: 0
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'Card', 'UPI', 'Other'],
    default: 'Cash'
  },
  processedBy: {
    type: String, // String for now as we don't have a formal User model yet, but we'll adapt
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  paymentStatus: {
    type: String,
    enum: ['Paid', 'Partial', 'Unpaid'],
    default: 'Paid'
  },
  amountPaid: {
    type: Number,
    default: 0
  },
  amountDue: {
    type: Number,
    default: 0
  },
  dueDate: {
    type: Date
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Sale', SaleSchema);
