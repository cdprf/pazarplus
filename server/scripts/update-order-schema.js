const { sequelize, Order } = require('../models');
const logger = require("../utils/logger");

async function updateOrderSchema() {
  try {
    logger.info('🔄 Updating Order table schema...');
    
    // Add missing columns to the orders table
    const queryInterface = sequelize.getQueryInterface();
    
    const tableInfo = await queryInterface.describeTable('orders');
    logger.info('Current table columns:', Object.keys(tableInfo));
    
    // Check and add missing columns
    const columnsToAdd = [
      { name: 'externalOrderId', type: 'VARCHAR(255)' },
      { name: 'orderNumber', type: 'VARCHAR(255)' },
      { name: 'platformType', type: 'VARCHAR(255)' },
      { name: 'platform', type: 'VARCHAR(255)' },
      { name: 'customerName', type: 'VARCHAR(255)' },
      { name: 'customerEmail', type: 'VARCHAR(255)' },
      { name: 'customerPhone', type: 'VARCHAR(255)' },
      { name: 'shippingAddress', type: 'TEXT' },
      { name: 'eInvoiceStatus', type: 'VARCHAR(255)' },
      { name: 'eInvoiceDate', type: 'DATETIME' },
      { name: 'notes', type: 'TEXT' },
      { name: 'rawData', type: 'TEXT' }
    ];
    
    for (const column of columnsToAdd) {
      if (!tableInfo[column.name]) {
        logger.info(`Adding column: ${column.name}`);
        await queryInterface.addColumn('orders', column.name, {
          type: column.type,
          allowNull: true
        });
      } else {
        logger.info(`Column ${column.name} already exists`);
      }
    }
    
    logger.info('✅ Order table schema updated successfully!');
    
  } catch (error) {
    logger.error('❌ Error updating schema:', error);
    throw error;
  }
}

// Run the migration
updateOrderSchema()
  .then(() => {
    logger.info('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Migration failed:', error);
    process.exit(1);
  });