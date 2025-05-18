// This file configures the database connection for the Order Management Service.
// It uses Sequelize ORM to connect to the database and supports SQLite as the default dialect.
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PlatformConnection = sequelize.define('PlatformConnection', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  platformType: {
    type: DataTypes.STRING,
    allowNull: false
  },
  platformName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  credentials: {
    type: DataTypes.JSON,
    allowNull: false
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'pending'
  },
  settings: {
    type: DataTypes.JSON,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  lastSyncAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  syncStatus: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  timestamps: true
});

// Add association method
PlatformConnection.associate = function(models) {
  PlatformConnection.belongsTo(models.User, { foreignKey: 'userId' });
  PlatformConnection.hasMany(models.Order, { foreignKey: 'connectionId' });
};

module.exports = PlatformConnection;