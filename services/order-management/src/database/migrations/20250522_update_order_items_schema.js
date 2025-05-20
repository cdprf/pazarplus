const logger = require('../../utils/logger');
const { sequelize } = require('../../config/database');

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      logger.info('Starting safe schema update for order_items table');
      
      // Create backup
      await sequelize.query('CREATE TABLE order_items_backup AS SELECT * FROM order_items;');
      
      // Get current columns
      const tableInfo = await sequelize.query('PRAGMA table_info(order_items);', {
        type: Sequelize.QueryTypes.SELECT
      });
      const existingColumns = tableInfo.map(col => col.name);
      
      // Drop original table
      await queryInterface.dropTable('order_items');
      
      // Create new table with all columns
      await queryInterface.createTable('order_items', {
        id: {
          type: Sequelize.UUID,
          primaryKey: true
        },
        orderId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'orders',
            key: 'id'
          }
        },
        productId: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'products',
            key: 'id'
          },
          comment: 'Reference to product in our system if available'
        },
        externalProductId: {
          type: Sequelize.STRING,
          allowNull: false,
          comment: 'Product ID from the external platform'
        },
        sku: {
          type: Sequelize.STRING,
          allowNull: true
        },
        name: {
          type: Sequelize.STRING,
          allowNull: false
        },
        variantName: {
          type: Sequelize.STRING,
          allowNull: true
        },
        quantity: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 1
        },
        unitPrice: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false
        },
        totalPrice: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false
        },
        discount: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0.00
        },
        weight: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: true
        },
        weightUnit: {
          type: Sequelize.STRING,
          allowNull: true,
          defaultValue: 'kg'
        },
        imageUrl: {
          type: Sequelize.STRING,
          allowNull: true
        },
        taxAmount: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: true
        },
        taxRate: {
          type: Sequelize.DECIMAL(5, 2),
          allowNull: true
        },
        options: {
          type: Sequelize.JSON,
          allowNull: true,
          comment: 'Product options/attributes'
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
        INSERT INTO order_items (${selectColumns})
        SELECT ${selectColumns}
        FROM order_items_backup
      `);

      // Drop backup
      await sequelize.query('DROP TABLE order_items_backup;');

      // Add indexes
      await queryInterface.addIndex('order_items', ['orderId']);
      await queryInterface.addIndex('order_items', ['productId']);
      await queryInterface.addIndex('order_items', ['externalProductId']);
      await queryInterface.addIndex('order_items', ['sku']);

      logger.info('Successfully updated order_items table schema');
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