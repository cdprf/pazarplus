const logger = require('../../utils/logger');

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      logger.info('Creating platform_settings_templates table');
      
      // Create table if it doesn't exist
      await queryInterface.createTable('platform_settings_templates', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
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
        },
        deletedAt: {
          type: Sequelize.DATE,
          allowNull: true
        }
      });

      // Try to add indexes, ignoring errors if they already exist
      try {
        await queryInterface.addIndex('platform_settings_templates', ['platformType']);
      } catch (err) {
        logger.info('Index platform_settings_templates_platform_type already exists, skipping...');
      }

      try {
        await queryInterface.addIndex('platform_settings_templates', ['isActive']);
      } catch (err) {
        logger.info('Index platform_settings_templates_is_active already exists, skipping...');
      }

      try {
        await queryInterface.addIndex('platform_settings_templates', ['version']);
      } catch (err) {
        logger.info('Index platform_settings_templates_version already exists, skipping...');
      }

      try {
        await queryInterface.addIndex('platform_settings_templates', ['deletedAt']);
      } catch (err) {
        logger.info('Index platform_settings_templates_deleted_at already exists, skipping...');
      }

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
    } catch (error) {
      logger.error(`Rollback failed: ${error.message}`, { error });
      return Promise.reject(error);
    }
  }
};