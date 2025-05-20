/**
 * Platform Schema Model
 * 
 * This model stores schema definitions for platform entities.
 * It defines the expected fields, validation rules, and mappings
 * between platform fields and our internal model fields.
 * 
 * @date May 20, 2025
 */

module.exports = (sequelize, DataTypes) => {
  const PlatformSchema = sequelize.define('PlatformSchema', {
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
      comment: 'JSON Schema for validation'
    },
    mappings: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Field mappings between platform and internal fields'
    },
    transformations: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Data transformation rules'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
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