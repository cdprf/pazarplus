// filepath: /Users/Username/Desktop/Soft/pazar+/services/order-management/src/models/platform-schema.js
const { DataTypes } = require('sequelize');

/**
 * PlatformSchema model - Stores schema definitions and mappings for platform entities
 * 
 * This model defines the structure and validation rules for platform-specific data,
 * along with mappings between platform fields and our internal data model.
 * 
 * @param {Sequelize} sequelize - Sequelize instance
 * @returns {Model} PlatformSchema model
 */
module.exports = (sequelize) => {
  const PlatformSchema = sequelize.define('PlatformSchema', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    platformType: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Type of marketplace platform (trendyol, hepsiburada, etc.)'
    },
    entityType: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Type of entity (product, order, etc.)'
    },
    version: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '1.0.0',
      comment: 'Schema version'
    },
    schema: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: 'JSON schema definition for validation'
    },
    mappings: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Field mappings between platform and internal model'
    },
    transformations: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Transformation rules for data processing'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Whether this schema is currently active'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Description of this schema'
    }
  }, {
    tableName: 'platform_schemas',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['platformType', 'entityType', 'version']
      },
      {
        fields: ['isActive']
      }
    ]
  });

  return PlatformSchema;
};