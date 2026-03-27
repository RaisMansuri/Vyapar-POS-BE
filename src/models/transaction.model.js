const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.config');

const Transaction = sequelize.define('Transaction', {
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
  transactionId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  type: {
    type: DataTypes.ENUM('Sale', 'Expense', 'Refund'),
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  paymentMethod: {
    type: DataTypes.ENUM('Cash', 'Card', 'UPI'),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('Completed', 'Pending', 'Failed', 'Cancelled'),
    defaultValue: 'Completed'
  },
  referenceId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  referenceModel: {
    type: DataTypes.STRING,
    allowNull: false
  },
  customerId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  customerName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  processedBy: {
    type: DataTypes.STRING,
    defaultValue: 'System'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  timestamps: true
});

module.exports = Transaction;
