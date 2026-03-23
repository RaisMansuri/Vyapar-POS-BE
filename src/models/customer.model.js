const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.config');

const Customer = sequelize.define('Customer', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  totalSpent: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  totalOrders: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  walletBalance: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  timestamps: true
});

module.exports = Customer;
