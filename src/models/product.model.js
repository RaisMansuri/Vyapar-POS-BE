const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  barcode: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  costPrice: {
    type: Number,
    required: true
  },
  stock: {
    type: Number,
    default: 0
  },
  minStockLevel: {
    type: Number,
    default: 5
  },
  description: {
    type: String
  },
  imageUrl: {
    type: String
  },
  category: {
    type: String,
    required: true
  },
  gstRate: {
    type: Number,
    default: 0
  },
  discount: {
    type: {
      type: String,
      enum: ['daily', 'seasonal', 'fixed', 'none'],
      default: 'none'
    },
    value: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Product', ProductSchema);
