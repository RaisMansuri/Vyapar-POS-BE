const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.config');

const Ticket = sequelize.define('Ticket', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  ticketId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  subject: {
    type: DataTypes.STRING,
    allowNull: false
  },
  customerName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  customerEmail: {
    type: DataTypes.STRING,
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('Open', 'In Progress', 'Resolved', 'Closed'),
    defaultValue: 'Open'
  },
  priority: {
    type: DataTypes.ENUM('Low', 'Medium', 'High', 'Urgent'),
    defaultValue: 'Medium'
  },
  comments: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: []
  }
}, {
  timestamps: true
});

module.exports = Ticket;
