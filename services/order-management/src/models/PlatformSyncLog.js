// filepath: /Users/Username/Desktop/Soft/pazar+/services/order-management/src/models/PlatformSyncLog.js
// This file defines the PlatformSyncLog model for tracking platform synchronization operations
module.exports = (sequelize, DataTypes) => {
  const PlatformSyncLog = sequelize.define('PlatformSyncLog', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    connectionId: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'Reference to the platform connection'
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'User who initiated the sync (null for automated sync)'
    },
    platformType: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Type of platform (e.g., trendyol, hepsiburada)'
    },
    syncType: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Type of sync (orders, products, inventory, prices)'
    },
    startTime: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    endTime: {
      type: DataTypes.DATE,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('running', 'completed', 'failed', 'partial_success'),
      allowNull: false,
      defaultValue: 'running'
    },
    totalItems: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Number of items processed'
    },
    successItems: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      comment: 'Number of items successfully processed'
    },
    failedItems: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      comment: 'Number of items that failed to process'
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    errorDetails: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Detailed error information'
    },
    syncParams: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Parameters used for this sync operation'
    },
    resultSummary: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Summary of sync results'
    }
  }, {
    tableName: 'platform_sync_logs',
    timestamps: true,
    indexes: [
      {
        fields: ['connectionId']
      },
      {
        fields: ['userId']
      },
      {
        fields: ['platformType']
      },
      {
        fields: ['syncType']
      },
      {
        fields: ['status']
      },
      {
        fields: ['startTime']
      },
      {
        fields: ['endTime']
      }
    ]
  });

  PlatformSyncLog.associate = (models) => {
    PlatformSyncLog.belongsTo(models.PlatformConnection, { foreignKey: 'connectionId' });
    PlatformSyncLog.belongsTo(models.User, { foreignKey: 'userId' });
  };

  return PlatformSyncLog;
};