const logger = require('../../utils/logger');
const { sequelize } = require('../../config/database');

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      logger.info('Starting safe schema update for products table');
      
      // Drop backup table if it exists
      await sequelize.query('DROP TABLE IF EXISTS products_backup;');
      
      // Create backup
      await sequelize.query('CREATE TABLE products_backup AS SELECT * FROM products;');
      
      // Drop original table
      await queryInterface.dropTable('products');
      
      // Create new table with all columns
      await queryInterface.createTable('products', {
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
        sku: {
          type: Sequelize.STRING,
          allowNull: false
        },
        name: {
          type: Sequelize.STRING,
          allowNull: false
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        price: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false
        },
        cost: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: true
        },
        currency: {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: 'USD'
        },
        weight: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: true
        },
        weightUnit: {
          type: Sequelize.STRING(10),
          allowNull: true,
          defaultValue: 'kg'
        },
        dimensions: {
          type: Sequelize.JSON,
          allowNull: true,
          comment: 'Length, width, height'
        },
        dimensionsUnit: {
          type: Sequelize.STRING(10),
          allowNull: true,
          defaultValue: 'cm'
        },
        inventoryQuantity: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        lowStockThreshold: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        isActive: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
        mainImageUrl: {
          type: Sequelize.STRING,
          allowNull: true
        },
        additionalImages: {
          type: Sequelize.JSON,
          allowNull: true,
          comment: 'Array of image URLs'
        },
        hasVariants: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false
        },
        barcode: {
          type: Sequelize.STRING,
          allowNull: true
        },
        barcodeType: {
          type: Sequelize.STRING,
          allowNull: true
        },
        categoryId: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'Categories',
            key: 'id'
          }
        },
        tags: {
          type: Sequelize.JSON,
          allowNull: true,
          comment: 'Array of tags'
        },
        attributes: {
          type: Sequelize.JSON,
          allowNull: true,
          comment: 'Custom product attributes'
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

      // Copy data back
      await sequelize.query(`
        INSERT INTO products (
          id, userId, sku, name, description, price, cost,
          currency, weight, weightUnit, dimensions, dimensionsUnit,
          inventoryQuantity, lowStockThreshold, isActive,
          mainImageUrl, additionalImages, hasVariants, barcode,
          barcodeType, categoryId, tags, attributes, metadata,
          createdAt, updatedAt
        )
        SELECT 
          id, userId, sku, name, description, price, cost,
          currency, weight, weightUnit, dimensions, dimensionsUnit,
          inventoryQuantity, lowStockThreshold, isActive,
          mainImageUrl, additionalImages, hasVariants, barcode,
          barcodeType, categoryId, tags, attributes, metadata,
          createdAt, updatedAt
        FROM products_backup
      `);

      // Drop backup
      await sequelize.query('DROP TABLE products_backup;');

      // Add indexes
      await queryInterface.addIndex('products', ['userId', 'sku'], { unique: true });
      await queryInterface.addIndex('products', ['userId']);
      await queryInterface.addIndex('products', ['name']);
      await queryInterface.addIndex('products', ['categoryId']);
      await queryInterface.addIndex('products', ['barcode']);
      await queryInterface.addIndex('products', ['isActive']);

      logger.info('Successfully updated products table schema');
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