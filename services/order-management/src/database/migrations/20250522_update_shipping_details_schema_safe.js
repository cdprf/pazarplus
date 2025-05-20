const logger = require('../../utils/logger');
const { sequelize } = require('../../config/database');

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      logger.info('Starting safe schema update for shipping_details table');
      
      // Create backup
      await sequelize.query('CREATE TABLE shipping_details_backup AS SELECT * FROM shipping_details;');
      
      // Get current columns
      const tableInfo = await sequelize.query('PRAGMA table_info(shipping_details);', {
        type: Sequelize.QueryTypes.SELECT
      });
      const existingColumns = tableInfo.map(col => col.name);
      
      // Drop original table
      await queryInterface.dropTable('shipping_details');
      
      // Create new table with all columns
      await queryInterface.createTable('shipping_details', {
        id: {
          type: Sequelize.UUID,
          primaryKey: true
        },
        orderId: {
          type: Sequelize.UUID,
          allowNull: false,
          unique: true,
          references: {
            model: 'orders',
            key: 'id'
          }
        },
        recipientName: {
          type: Sequelize.STRING,
          allowNull: false
        },
        address1: {
          type: Sequelize.STRING,
          allowNull: false
        },
        address2: {
          type: Sequelize.STRING,
          allowNull: true
        },
        city: {
          type: Sequelize.STRING,
          allowNull: false
        },
        state: {
          type: Sequelize.STRING,
          allowNull: true
        },
        postalCode: {
          type: Sequelize.STRING,
          allowNull: false
        },
        country: {
          type: Sequelize.STRING,
          allowNull: false
        },
        phone: {
          type: Sequelize.STRING,
          allowNull: true
        },
        email: {
          type: Sequelize.STRING,
          allowNull: true
        },
        shippingMethod: {
          type: Sequelize.STRING,
          allowNull: true
        },
        trackingNumber: {
          type: Sequelize.STRING,
          allowNull: true
        },
        trackingUrl: {
          type: Sequelize.STRING,
          allowNull: true
        },
        carrierName: {
          type: Sequelize.STRING,
          allowNull: true
        },
        shippingCost: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: true
        },
        taxAmount: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: true
        },
        estimatedDeliveryDate: {
          type: Sequelize.DATE,
          allowNull: true
        },
        shippedAt: {
          type: Sequelize.DATE,
          allowNull: true
        },
        deliveredAt: {
          type: Sequelize.DATE,
          allowNull: true
        },
        status: {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: 'pending'
        },
        notes: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        specialInstructions: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        labelUrl: {
          type: Sequelize.STRING,
          allowNull: true
        },
        packageWeight: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: true
        },
        packageDimensions: {
          type: Sequelize.JSON,
          allowNull: true,
          comment: 'Length, width, height in cm'
        },
        metadata: {
          type: Sequelize.JSON,
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

      // Build INSERT query dynamically based on existing columns
      const selectColumns = existingColumns.join(', ');
      
      // Copy data back
      await sequelize.query(`
        INSERT INTO shipping_details (${selectColumns})
        SELECT ${selectColumns}
        FROM shipping_details_backup
      `);

      // Drop backup
      await sequelize.query('DROP TABLE shipping_details_backup;');

      // Add indexes
      await queryInterface.addIndex('shipping_details', ['orderId']);
      await queryInterface.addIndex('shipping_details', ['trackingNumber']);
      await queryInterface.addIndex('shipping_details', ['status']);
      await queryInterface.addIndex('shipping_details', ['shippedAt']);
      await queryInterface.addIndex('shipping_details', ['deliveredAt']);
      await queryInterface.addIndex('shipping_details', ['estimatedDeliveryDate']);

      logger.info('Successfully updated shipping_details table schema');
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