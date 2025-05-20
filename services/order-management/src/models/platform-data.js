// filepath: /Users/Username/Desktop/Soft/pazar+/services/order-management/src/models/platform-data.js
const { DataTypes } = require('sequelize');

/**
 * PlatformData model - Stores platform-specific data for entities across multiple marketplaces
 * 
 * This model replaces platform-specific tables (TrendyolProduct, HepsiburadaProduct, etc.)
 * with a generic approach that can store data for any marketplace.
 * 
 * @param {Sequelize} sequelize - Sequelize instance
 * @returns {Model} PlatformData model
 */
module.exports = (sequelize) => {
  const PlatformData = sequelize.define('PlatformData', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    entityId: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'ID of the related entity (Product, Order, etc.)'
    },
    entityType: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Type of entity (product, order, etc.)'
    },
    platformType: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Type of marketplace platform (trendyol, hepsiburada, etc.)'
    },
    platformEntityId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'ID of the entity in the platform'
    },
    data: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: 'Raw platform data in JSON format'
    },
    // Indexed common fields for faster queries
    status: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Current status in the platform'
    },
    approvalStatus: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Approval status for the entity'
    },
    platformPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Price in the platform (for products)'
    },
    platformQuantity: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Quantity in the platform (for products)'
    },
    hasError: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether there is an error with this entity in the platform'
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Error message if there is an error'
    },
    lastSyncedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Last time this data was synced with the platform'
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

  PlatformData.associate = function(models) {
    // Association with Product model (for product data)
    PlatformData.belongsTo(models.Product, {
      foreignKey: 'entityId',
      constraints: false,
      as: 'Product',
      scope: {
        entityType: 'product'
      }
    });

    // Association with Order model (for order data)
    PlatformData.belongsTo(models.Order, {
      foreignKey: 'entityId',
      constraints: false,
      as: 'Order',
      scope: {
        entityType: 'order'
      }
    });
  };

  return PlatformData;
};