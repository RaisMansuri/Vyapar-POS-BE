const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.config');

const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  action: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'e.g. DELETE_PRODUCT, CHANGE_PRICE, VOID_SALE'
  },
  entityType: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'e.g. Product, Sale, User'
  },
  entityId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  oldValue: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  newValue: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  ipAddress: {
    type: DataTypes.STRING,
    allowNull: true
  },
  userAgent: {
    type: DataTypes.STRING,
    allowNull: true
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  timestamps: true
});

module.exports = AuditLog;
