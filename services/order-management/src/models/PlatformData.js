// filepath: /Users/Username/Desktop/Soft/pazar+/services/order-management/src/models/PlatformData.js
// This file defines a generic model for storing platform-specific data
module.exports = (sequelize, DataTypes) => {
  const PlatformData = sequelize.define('PlatformData', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    entityId: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'Foreign key to the entity (Product, Order, etc.)'
    },
    entityType: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Type of entity (product, order, etc.)'
    },
    platformType: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Type of platform (e.g., trendyol, hepsiburada)'
    },
    platformEntityId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'ID of the entity in the platform'
    },
    data: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: 'Platform-specific data as JSON'
    },
    // Indexed common fields that many platforms use
    // These allow efficient querying while keeping flexibility
    status: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Status in the platform'
    },
    approvalStatus: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Approval status in the platform'
    },
    platformPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Price in the platform'
    },
    platformQuantity: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Quantity in the platform'
    },
    hasError: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Error flag'
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Error message'
    },
    lastSyncedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Last sync timestamp'
    }
  }, {
    tableName: 'platform_data',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['entityId', 'entityType', 'platformType']
      },
      {
        fields: ['platformType', 'entityType']
      },
      {
        fields: ['platformEntityId']
      },
      {
        fields: ['status']
      },
      {
        fields: ['approvalStatus']
      },
      {
        fields: ['hasError']
      },
      {
        fields: ['lastSyncedAt']
      }
    ]
  });

  // Polymorphic associations through a generic method
  PlatformData.associateWith = function(modelName, models) {
    if (models[modelName]) {
      models[modelName].hasMany(PlatformData, {
        foreignKey: 'entityId',
        constraints: false,
        scope: {
          entityType: modelName.toLowerCase()
        },
        as: 'platformData'
      });
      
      PlatformData.belongsTo(models[modelName], {
        foreignKey: 'entityId',
        constraints: false
      });
    }
  };

  return PlatformData;
};