const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.config');

const Expense = sequelize.define('Expense', {
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
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false
  },
  date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  paidBy: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'Admin'
  }
}, {
  timestamps: true
});

module.exports = Expense;
