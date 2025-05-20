// filepath: /Users/Username/Desktop/Soft/pazar+/services/order-management/src/models/PlatformSettingsTemplate.js
// This file defines the PlatformSettingsTemplate model for storing marketplace configuration templates
module.exports = (sequelize, DataTypes) => {
  const PlatformSettingsTemplate = sequelize.define('PlatformSettingsTemplate', {
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
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Template name'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    apiEndpoints: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: 'API endpoints configuration'
    },
    authType: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Authentication type (e.g., basic, oauth, api_key)'
    },
    credentialSchema: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: 'JSON schema for credential fields'
    },
    defaultSettings: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Default settings for this platform'
    },
    webhookConfiguration: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Webhook configuration details'
    },
    orderMappings: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Mappings for order status and fields'
    },
    productMappings: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Mappings for product attributes'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    version: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '1.0.0'
    },
    requiredScopes: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Required API permission scopes'
    },
    sandboxConfiguration: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Sandbox/test environment configuration'
    }
  }, {
    tableName: 'platform_settings_templates',
    timestamps: true,
    indexes: [
      {
        fields: ['platformType']
      },
      {
        fields: ['name']
      },
      {
        fields: ['isActive']
      },
      {
        fields: ['version']
      }
    ]
  });

  return PlatformSettingsTemplate;
};