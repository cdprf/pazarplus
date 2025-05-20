// filepath: /Users/Username/Desktop/Soft/pazar+/services/order-management/src/models/platform-attribute.js
const { DataTypes } = require('sequelize');

/**
 * PlatformAttribute model - Stores searchable attributes for platform entities
 * 
 * This model allows for efficient querying of platform-specific data based on
 * specific attributes without having to search through JSON data.
 * 
 * @param {Sequelize} sequelize - Sequelize instance
 * @returns {Model} PlatformAttribute model
 */
module.exports = (sequelize) => {
  const PlatformAttribute = sequelize.define('PlatformAttribute', {
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
    attributeKey: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Key/name of the attribute'
    },
    // Store values in type-specific columns for efficient indexing and querying
    stringValue: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'String value of the attribute'
    },
    numericValue: {
      type: DataTypes.DECIMAL(15, 6),
      allowNull: true,
      comment: 'Numeric value of the attribute'
    },
    booleanValue: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      comment: 'Boolean value of the attribute'
    },
    dateValue: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Date value of the attribute'
    },
    valueType: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Type of the value (string, number, boolean, date)'
    }
  }, {
    tableName: 'platform_attributes',
    timestamps: true,
    indexes: [
      {
        fields: ['entityId', 'entityType']
      },
      {
        fields: ['platformType']
      },
      {
        fields: ['attributeKey']
      },
      {
        fields: ['stringValue']
      },
      {
        fields: ['numericValue']
      },
      {
        fields: ['booleanValue']
      },
      {
        fields: ['dateValue']
      }
    ]
  });

  PlatformAttribute.associate = function(models) {
    // Association with PlatformData model
    PlatformAttribute.belongsTo(models.PlatformData, {
      foreignKey: 'entityId',
      constraints: false,
      scope: {
        entityType: sequelize.where(sequelize.col('PlatformAttribute.entityType'), '=', sequelize.col('PlatformData.entityType')),
        platformType: sequelize.where(sequelize.col('PlatformAttribute.platformType'), '=', sequelize.col('PlatformData.platformType'))
      }
    });
  };

  return PlatformAttribute;
};