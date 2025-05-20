const logger = require('../../utils/logger');
const { sequelize } = require('../../config/database');

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      logger.info('Adding missing columns to Orders table');
      
      // Create backup
      await sequelize.query('CREATE TABLE orders_backup AS SELECT * FROM orders;');
      
      // Drop original
      await queryInterface.dropTable('orders');
      
      // Recreate with all columns
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
          allowNull: false,
          references: {
            model: 'PlatformConnections',
            key: 'id'
          }
        },
        userId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'Users',
            key: 'id'
          }
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
          allowNull: true,
          comment: 'Raw data from the external platform'
        },
        lastSyncedAt: {
          type: Sequelize.DATE,
          allowNull: true
        },
        deletedAt: {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'Used for soft deletes'
        },
        deletedReason: {
          type: Sequelize.STRING,
          allowNull: true,
          comment: 'Reason why this order was deleted'
        },
        cancelledAt: {
          type: Sequelize.DATE,
          allowNull: true
        },
        cancellationReason: {
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
          createdAt, updatedAt
        )
        SELECT
          id, externalOrderId, platformType, connectionId, userId,
          customerName, customerEmail, customerPhone, orderDate,
          totalAmount, currency, status, notes, paymentMethod,
          paymentStatus, shippingMethod, rawData, lastSyncedAt,
          createdAt, updatedAt
        FROM orders_backup
      `);

      // Drop backup
      await sequelize.query('DROP TABLE orders_backup;');

      // Add indexes
      await queryInterface.addIndex('orders', ['externalOrderId', 'connectionId'], { unique: true });
      await queryInterface.addIndex('orders', ['userId']);
      await queryInterface.addIndex('orders', ['platformType']);
      await queryInterface.addIndex('orders', ['status']);
      await queryInterface.addIndex('orders', ['orderDate']);
      await queryInterface.addIndex('orders', ['paymentStatus']);
      await queryInterface.addIndex('orders', ['deletedAt']);
      await queryInterface.addIndex('orders', ['lastSyncedAt']);
      await queryInterface.addIndex('orders', ['platformType', 'status']);
      await queryInterface.addIndex('orders', ['customerEmail']);
      await queryInterface.addIndex('orders', ['customerPhone']);

      logger.info('Successfully aligned Orders table with model definition');
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