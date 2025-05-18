// This script fixes the unique constraint on the orders table
// It creates a composite unique constraint on externalOrderId and platformId

const { sequelize } = require('../config/database');
const logger = require('../utils/logger');

async function fixOrdersUniqueConstraint() {
  try {
    logger.info('Starting to fix unique constraints on orders table...');
    
    // 1. Check if the table exists
    const [tableCheck] = await sequelize.query(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='orders';
    `);
    
    if (tableCheck.length === 0) {
      logger.error('Orders table does not exist!');
      return { success: false, error: 'Orders table does not exist' };
    }
    
    // 2. Get table info to check the current constraints
    const [indexInfo] = await sequelize.query(`PRAGMA index_list(orders);`);
    logger.info('Current indexes on orders table:', indexInfo);
    
    // 3. Check if we already have the right constraint
    const hasCompositeConstraint = indexInfo.some(index => 
      index.name === 'orders_externalOrderId_platformId_unique' || 
      index.name === 'orders_external_order_id_platform_id'
    );
    
    if (hasCompositeConstraint) {
      logger.info('Composite unique constraint already exists, no need to fix.');
      return { 
        success: true, 
        message: 'Unique constraint already exists on (externalOrderId, platformId)'
      };
    }
    
    // 3. Drop any existing backup table
    logger.info('Dropping existing backup table if it exists...');
    await sequelize.query('DROP TABLE IF EXISTS orders_backup;');
    
    // 4. Create a backup of the orders table
    logger.info('Creating backup of orders table...');
    await sequelize.query('CREATE TABLE orders_backup AS SELECT * FROM orders;');
    
    // 5. Create a new table with the correct constraints, matching exact schema
    logger.info('Creating new orders table with correct constraints...');
    await sequelize.query(`
      CREATE TABLE orders_new (
        id UUID PRIMARY KEY,
        externalOrderId VARCHAR(255) NOT NULL,
        platformId UUID NOT NULL,
        userId UUID NOT NULL,
        customerName VARCHAR(255) NOT NULL,
        customerEmail VARCHAR(255),
        customerPhone VARCHAR(255),
        orderDate DATETIME NOT NULL,
        totalAmount DECIMAL(10, 2) NOT NULL,
        currency VARCHAR(255) NOT NULL DEFAULT 'USD',
        status TEXT NOT NULL DEFAULT 'new',
        notes TEXT,
        paymentMethod VARCHAR(255),
        paymentStatus TEXT NOT NULL DEFAULT 'pending',
        shippingMethod VARCHAR(255),
        rawData JSON,
        lastSyncedAt DATETIME,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        UNIQUE(externalOrderId, platformId)
      );
    `);
    
    // 6. Copy data to the new table
    logger.info('Copying data to the new table...');
    await sequelize.query(`
      INSERT INTO orders_new 
      SELECT * FROM orders;
    `);
    
    // 7. Drop the old table and rename the new one
    logger.info('Replacing old table with the new one...');
    await sequelize.query('DROP TABLE orders;');
    await sequelize.query('ALTER TABLE orders_new RENAME TO orders;');
    
    // 8. Re-create indexes
    logger.info('Re-creating indexes...');
    await sequelize.query('CREATE INDEX orders_user_id ON orders(userId);');
    await sequelize.query('CREATE INDEX orders_status ON orders(status);');
    await sequelize.query('CREATE INDEX orders_order_date ON orders(orderDate);');
    
    logger.info('Successfully fixed unique constraints on orders table!');
    logger.info('A backup of the original table was saved as orders_backup');
    
    return { success: true, message: 'Successfully fixed unique constraints on orders table' };
  } catch (error) {
    logger.error('Error fixing unique constraints:', error);
    return { success: false, error: error.message };
  }
}

// Export the function to be called from elsewhere
module.exports = fixOrdersUniqueConstraint;

// Run the function if this script is executed directly
if (require.main === module) {
  fixOrdersUniqueConstraint()
    .then(result => {
      console.log(result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(err => {
      console.error('Unhandled error:', err);
      process.exit(1);
    });
}