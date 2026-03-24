const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.config');

const Cart = sequelize.define('Cart', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true
  },
  items: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: []
  }
}, {
  timestamps: true
});

module.exports = Cart;
