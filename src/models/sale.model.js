const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.config');

const Sale = sequelize.define('Sale', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    defaultValue: '00000000-0000-0000-0000-000000000000'
  },
  saleNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  items: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: []
  },
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  tax: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  discount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  paymentMethod: {
    type: DataTypes.ENUM('Cash', 'Card', 'UPI', 'Other'),
    defaultValue: 'Cash'
  },
  processedBy: {
    type: DataTypes.STRING,
    allowNull: false
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  paymentStatus: {
    type: DataTypes.ENUM('Paid', 'Partial', 'Unpaid'),
    defaultValue: 'Paid'
  },
  amountPaid: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  amountDue: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  dueDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  address: {
    type: DataTypes.JSONB,
    allowNull: true
  }
}, {
  timestamps: true
});

module.exports = Sale;
