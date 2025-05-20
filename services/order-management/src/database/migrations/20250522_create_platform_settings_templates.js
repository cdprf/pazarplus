const logger = require('../../utils/logger');
const { sequelize } = require('../../config/database');

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      logger.info('Creating platform_settings_templates table');
      
      await queryInterface.createTable('platform_settings_templates', {
        id: {
          type: Sequelize.UUID,
          primaryKey: true
        },
        platformType: {
          type: Sequelize.STRING,
          allowNull: false,
          comment: 'Type of platform (e.g., trendyol, hepsiburada)'
        },
        name: {
          type: Sequelize.STRING,
          allowNull: false,
          comment: 'Template name'
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        apiEndpoints: {
          type: Sequelize.JSON,
          allowNull: false,
          comment: 'API endpoints configuration'
        },
        authType: {
          type: Sequelize.STRING,
          allowNull: false,
          comment: 'Authentication type (e.g., basic, oauth, api_key)'
        },
        credentialSchema: {
          type: Sequelize.JSON,
          allowNull: false,
          comment: 'JSON schema for credential fields'
        },
        defaultSettings: {
          type: Sequelize.JSON,
          allowNull: true,
          comment: 'Default settings for this platform'
        },
        webhookConfiguration: {
          type: Sequelize.JSON,
          allowNull: true,
          comment: 'Webhook configuration details'
        },
        orderMappings: {
          type: Sequelize.JSON,
          allowNull: true,
          comment: 'Mappings for order status and fields'
        },
        productMappings: {
          type: Sequelize.JSON,
          allowNull: true,
          comment: 'Mappings for product attributes'
        },
        isActive: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
        version: {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: '1.0.0'
        },
        requiredScopes: {
          type: Sequelize.JSON,
          allowNull: true,
          comment: 'Required API permission scopes'
        },
        sandboxConfiguration: {
          type: Sequelize.JSON,
          allowNull: true,
          comment: 'Sandbox/test environment configuration'
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false
        }
      });

      // Add indexes
      await queryInterface.addIndex('platform_settings_templates', ['platformType']);
      await queryInterface.addIndex('platform_settings_templates', ['name']);
      await queryInterface.addIndex('platform_settings_templates', ['isActive']);
      await queryInterface.addIndex('platform_settings_templates', ['version']);

      logger.info('Successfully created platform_settings_templates table');
      return Promise.resolve();
    } catch (error) {
      logger.error(`Migration failed: ${error.message}`, { error });
      return Promise.reject(error);
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      await queryInterface.dropTable('platform_settings_templates');
      return Promise.resolve();
    } catch (error) {
      logger.error(`Migration rollback failed: ${error.message}`, { error });
      return Promise.reject(error);
    }
  }
};