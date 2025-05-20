const logger = require('../../utils/logger');
const { sequelize } = require('../../config/database');

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      logger.info('Adding missing columns to tables');
      
      // Handle PlatformConnections table
      // Create backup
      await sequelize.query('CREATE TABLE platform_connections_backup AS SELECT * FROM PlatformConnections;');
      // Drop original
      await queryInterface.dropTable('PlatformConnections');
      // Recreate with errorMessage
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
          defaultValue: 'pending'
        },
        settings: {
          type: Sequelize.JSON
        },
        isActive: {
          type: Sequelize.BOOLEAN,
          defaultValue: true
        },
        lastSyncAt: {
          type: Sequelize.DATE
        },
        syncStatus: {
          type: Sequelize.STRING
        },
        errorMessage: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        templateId: {
          type: Sequelize.UUID,
          allowNull: true
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
          templateId, createdAt, updatedAt
        )
        SELECT
          id, userId, platformType, platformName, name, credentials,
          status, settings, isActive, lastSyncAt, syncStatus,
          templateId, createdAt, updatedAt
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

      // Handle Orders table - Add deletedReason
      // Create backup
      await sequelize.query('CREATE TABLE orders_backup AS SELECT * FROM orders;');
      // Drop original
      await queryInterface.dropTable('orders');
      // Recreate with deletedReason
      await queryInterface.createTable('orders', {
        id: {
          type: Sequelize.UUID,
          primaryKey: true
        },
        externalOrderId: {
          type: Sequelize.STRING,
          allowNull: false
        },
        platformType: {
          type: Sequelize.STRING,
          allowNull: false
        },
        connectionId: {
          type: Sequelize.UUID,
          allowNull: false
        },
        userId: {
          type: Sequelize.UUID,
          allowNull: false
        },
        customerName: {
          type: Sequelize.STRING,
          allowNull: false
        },
        customerEmail: {
          type: Sequelize.STRING,
          allowNull: true
        },
        customerPhone: {
          type: Sequelize.STRING,
          allowNull: true
        },
        orderDate: {
          type: Sequelize.DATE,
          allowNull: false
        },
        totalAmount: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false
        },
        currency: {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: 'USD'
        },
        status: {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: 'new'
        },
        notes: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        paymentMethod: {
          type: Sequelize.STRING,
          allowNull: true
        },
        paymentStatus: {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: 'pending'
        },
        shippingMethod: {
          type: Sequelize.STRING,
          allowNull: true
        },
        rawData: {
          type: Sequelize.JSON,
          allowNull: true
        },
        lastSyncedAt: {
          type: Sequelize.DATE,
          allowNull: true
        },
        deletedAt: {
          type: Sequelize.DATE,
          allowNull: true
        },
        deletedReason: {
          type: Sequelize.STRING,
          allowNull: true
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
        INSERT INTO orders (
          id, externalOrderId, platformType, connectionId, userId,
          customerName, customerEmail, customerPhone, orderDate,
          totalAmount, currency, status, notes, paymentMethod,
          paymentStatus, shippingMethod, rawData, lastSyncedAt,
          deletedAt, createdAt, updatedAt
        )
        SELECT
          id, externalOrderId, platformType, connectionId, userId,
          customerName, customerEmail, customerPhone, orderDate,
          totalAmount, currency, status, notes, paymentMethod,
          paymentStatus, shippingMethod, rawData, lastSyncedAt,
          deletedAt, createdAt, updatedAt
        FROM orders_backup
      `);

      // Drop backup
      await sequelize.query('DROP TABLE orders_backup;');

      // Add indexes
      await queryInterface.addIndex('orders', ['userId']);
      await queryInterface.addIndex('orders', ['platformType']);
      await queryInterface.addIndex('orders', ['status']);
      await queryInterface.addIndex('orders', ['orderDate']);
      await queryInterface.addIndex('orders', ['paymentStatus']);
      await queryInterface.addIndex('orders', ['deletedAt']);
      await queryInterface.addIndex('orders', ['lastSyncedAt']);

      // Add unique constraint
      await queryInterface.addConstraint('orders', {
        fields: ['externalOrderId', 'connectionId'],
        type: 'unique'
      });

      logger.info('Successfully added missing columns');
      return Promise.resolve();
    } catch (error) {
      logger.error(`Migration failed: ${error.message}`, { error });
      return Promise.reject(error);
    }
  },

  async down(queryInterface, Sequelize) {
    // This is a destructive change, down migration not supported
    logger.warn('Down migration not supported for this migration');
    return Promise.resolve();
  }
};