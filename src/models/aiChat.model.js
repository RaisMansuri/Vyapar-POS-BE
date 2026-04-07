const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db.config');

const AiChat = sequelize.define('AiChat', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  role: {
    type: DataTypes.ENUM('user', 'assistant', 'system'),
    allowNull: false
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Stores context details like orderId, products, or intent'
  }
}, {
  timestamps: true,
  indexes: [
    {
      fields: ['userId']
    }
  ]
});

module.exports = AiChat;
