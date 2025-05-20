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
    type: DataTypes.ENUM('pending', 'active', 'error', 'suspended', 'disconnected'),
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
  },
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Last error message if connection has issues'
  },
  templateId: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Reference to the PlatformSettingsTemplate used for this connection'
  },
  webhookUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Webhook URL registered with the platform'
  },
  webhookSecret: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Secret for webhook verification'
  },
  refreshToken: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'OAuth refresh token if applicable'
  },
  tokenExpiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Expiration date of the access token'
  },
  syncSettings: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Settings for automatic synchronization'
  }
}, {
  timestamps: true,
  indexes: [
    {
      fields: ['userId']
    },
    {
      fields: ['platformType']
    },
    {
      fields: ['status']
    },
    {
      fields: ['isActive']
    },
    {
      fields: ['lastSyncAt']
    },
    {
      fields: ['templateId']
    }
  ]
});

// Add association method
PlatformConnection.associate = function(models) {
  PlatformConnection.belongsTo(models.User, { foreignKey: 'userId' });
  PlatformConnection.hasMany(models.Order, { foreignKey: 'connectionId' });
  
  // Add associations to new models
  if (models.PlatformSyncLog) {
    PlatformConnection.hasMany(models.PlatformSyncLog, { foreignKey: 'connectionId' });
  }
  
  if (models.PlatformWebhookEvent) {
    PlatformConnection.hasMany(models.PlatformWebhookEvent, { foreignKey: 'connectionId' });
  }
  
  if (models.FinancialTransaction) {
    PlatformConnection.hasMany(models.FinancialTransaction, { foreignKey: 'platformConnectionId' });
  }
  
  if (models.PlatformSettingsTemplate) {
    PlatformConnection.belongsTo(models.PlatformSettingsTemplate, { foreignKey: 'templateId' });
  }
};

module.exports = PlatformConnection;