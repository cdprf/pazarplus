/**
 * Platform Attribute Model
 * 
 * This model stores searchable attributes for platform entities.
 * It allows efficient querying across different platforms without complex JSON queries.
 * 
 * @date May 20, 2025
 */

module.exports = (sequelize, DataTypes) => {
  const PlatformAttribute = sequelize.define('PlatformAttribute', {
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
    attributeKey: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Attribute key/name'
    },
    stringValue: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'String value for string attributes'
    },
    numericValue: {
      type: DataTypes.DECIMAL(15, 6),
      allowNull: true,
      comment: 'Numeric value for number attributes'
    },
    booleanValue: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      comment: 'Boolean value for boolean attributes'
    },
    dateValue: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Date value for date/time attributes'
    },
    valueType: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Type of value (string, number, boolean, date)'
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

  // Polymorphic associations through a generic method
  PlatformAttribute.associateWith = function(modelName, models) {
    if (models[modelName]) {
      models[modelName].hasMany(PlatformAttribute, {
        foreignKey: 'entityId',
        constraints: false,
        scope: {
          entityType: modelName.toLowerCase()
        },
        as: 'platformAttributes'
      });
      
      PlatformAttribute.belongsTo(models[modelName], {
        foreignKey: 'entityId',
        constraints: false
      });
    }
  };

  return PlatformAttribute;
};