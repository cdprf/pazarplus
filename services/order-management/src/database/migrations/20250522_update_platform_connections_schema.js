const logger = require('../../utils/logger');
const { sequelize } = require('../../config/database');

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      logger.info('Starting safe schema update for platform_connections table');
      
      // Drop backup table if it exists
      await sequelize.query('DROP TABLE IF EXISTS platform_connections_backup;');
      
      // Create backup
      await sequelize.query('CREATE TABLE platform_connections_backup AS SELECT * FROM PlatformConnections;');
      
      // Drop original table
      await queryInterface.dropTable('PlatformConnections');
      
      // Create new table with all columns
      await queryInterface.createTable('PlatformConnections', {
        id: {
          type: Sequelize.UUID,
          primaryKey: true
        },
        userId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'Users',
            key: 'id'
          }
        },
        platformType: {
          type: Sequelize.STRING,
          allowNull: false
        },
        platformName: {
          type: Sequelize.STRING,
          allowNull: false
        },
        name: {
          type: Sequelize.STRING,
          allowNull: false
        },
        credentials: {
          type: Sequelize.JSON,
          allowNull: false
        },
        status: {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: 'pending'
        },
        settings: {
          type: Sequelize.JSON,
          allowNull: true
        },
        isActive: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
        lastSyncAt: {
          type: Sequelize.DATE,
          allowNull: true
        },
        syncStatus: {
          type: Sequelize.STRING,
          allowNull: true
        },
        errorMessage: {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: 'Last error message if connection has issues'
        },
        templateId: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'platform_settings_templates',
            key: 'id'
          },
          comment: 'Reference to the PlatformSettingsTemplate used for this connection'
        },
        webhookUrl: {
          type: Sequelize.STRING,
          allowNull: true,
          comment: 'Webhook URL registered with the platform'
        },
        webhookSecret: {
          type: Sequelize.STRING,
          allowNull: true,
          comment: 'Secret for webhook verification'
        },
        refreshToken: {
          type: Sequelize.STRING,
          allowNull: true,
          comment: 'OAuth refresh token if applicable'
        },
        tokenExpiresAt: {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'Expiration date of the access token'
        },
        syncSettings: {
          type: Sequelize.JSON,
          allowNull: true,
          comment: 'Settings for automatic synchronization'
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

      // Copy data back
      await sequelize.query(`
        INSERT INTO PlatformConnections (
          id, userId, platformType, platformName, name, credentials,
          status, settings, isActive, lastSyncAt, syncStatus,
          errorMessage, templateId, createdAt, updatedAt
        )
        SELECT
          id, userId, platformType, platformName, name, credentials,
          status, settings, isActive, lastSyncAt, syncStatus,
          errorMessage, templateId, createdAt, updatedAt
        FROM platform_connections_backup
      `);

      // Drop backup
      await sequelize.query('DROP TABLE platform_connections_backup;');

      // Add indexes
      await queryInterface.addIndex('PlatformConnections', ['userId']);
      await queryInterface.addIndex('PlatformConnections', ['platformType']);
      await queryInterface.addIndex('PlatformConnections', ['status']);
      await queryInterface.addIndex('PlatformConnections', ['isActive']);
      await queryInterface.addIndex('PlatformConnections', ['lastSyncAt']);
      await queryInterface.addIndex('PlatformConnections', ['templateId']);

      logger.info('Successfully updated platform_connections table schema');
      return Promise.resolve();
    } catch (error) {
      logger.error(`Migration failed: ${error.message}`, { error });
      return Promise.reject(error);
    }
  },

  async down(queryInterface, Sequelize) {
    logger.warn('Down migration not supported for this schema update');
    return Promise.resolve();
  }
};