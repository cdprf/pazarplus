// filepath: /Users/Username/Desktop/Soft/pazar+/services/order-management/src/models/PlatformWebhookEvent.js
// This file defines the PlatformWebhookEvent model for tracking incoming webhook events
module.exports = (sequelize, DataTypes) => {
  const PlatformWebhookEvent = sequelize.define('PlatformWebhookEvent', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    platformType: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Type of platform (e.g., trendyol, hepsiburada)'
    },
    connectionId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'Reference to the platform connection (may be null for unverified webhooks)'
    },
    eventType: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Type of event (e.g., order.created, product.updated)'
    },
    eventId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Event ID from the platform'
    },
    resourceType: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Type of resource (e.g., order, product)'
    },
    resourceId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'ID of the affected resource'
    },
    receivedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    processedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'processed', 'failed', 'ignored'),
      allowNull: false,
      defaultValue: 'pending'
    },
    retryCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    requestIp: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'IP address that sent the webhook'
    },
    requestHeaders: {
      type: DataTypes.JSON,
      allowNull: true
    },
    requestBody: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: 'Full webhook payload'
    },
    responseData: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Data returned in response to webhook'
    }
  }, {
    tableName: 'platform_webhook_events',
    timestamps: true,
    indexes: [
      {
        fields: ['platformType']
      },
      {
        fields: ['connectionId']
      },
      {
        fields: ['eventType']
      },
      {
        fields: ['eventId']
      },
      {
        fields: ['resourceType', 'resourceId']
      },
      {
        fields: ['receivedAt']
      },
      {
        fields: ['status']
      },
      {
        fields: ['processedAt']
      }
    ]
  });

  PlatformWebhookEvent.associate = (models) => {
    PlatformWebhookEvent.belongsTo(models.PlatformConnection, { foreignKey: 'connectionId' });
  };

  return PlatformWebhookEvent;
};