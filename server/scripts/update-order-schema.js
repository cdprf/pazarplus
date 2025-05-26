const { sequelize, Order } = require('../models');

async function updateOrderSchema() {
  try {
    console.log('🔄 Updating Order table schema...');
    
    // Add missing columns to the orders table
    const queryInterface = sequelize.getQueryInterface();
    
    const tableInfo = await queryInterface.describeTable('orders');
    console.log('Current table columns:', Object.keys(tableInfo));
    
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
        console.log(`Adding column: ${column.name}`);
        await queryInterface.addColumn('orders', column.name, {
          type: column.type,
          allowNull: true
        });
      } else {
        console.log(`Column ${column.name} already exists`);
      }
    }
    
    console.log('✅ Order table schema updated successfully!');
    
  } catch (error) {
    console.error('❌ Error updating schema:', error);
    throw error;
  }
}

// Run the migration
updateOrderSchema()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });