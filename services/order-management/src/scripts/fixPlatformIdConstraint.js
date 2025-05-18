// This script fixes the unique constraint on platformId in the orders table
// It replaces the single-column unique constraint with a composite constraint on externalOrderId and platformId

const { sequelize } = require('../config/database');
const logger = require('../utils/logger');

async function fixPlatformIdConstraint() {
  try {
    logger.info('Starting to fix platformId constraint in orders table...');
    
    // Check if the orders table exists
    const [tables] = await sequelize.query(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='orders';
    `);
    
    if (tables.length === 0) {
      logger.error('Orders table does not exist!');
      return { success: false, error: 'Orders table does not exist' };
    }
    
    // Clean up any existing temporary tables
    logger.info('Cleaning up any existing temporary tables...');
    await sequelize.query('DROP TABLE IF EXISTS orders_backup;');
    await sequelize.query('DROP TABLE IF EXISTS orders_new;');
    
    // Back up the table first
    logger.info('Creating backup of orders table...');
    await sequelize.query('CREATE TABLE orders_backup AS SELECT * FROM orders;');
    
    // Get the current schema definition
    const [tableInfo] = await sequelize.query(`
      SELECT sql FROM sqlite_master WHERE type='table' AND name='orders';
    `);
    
    if (tableInfo.length === 0) {
      logger.error('Could not retrieve orders table schema');
      return { success: false, error: 'Could not retrieve table schema' };
    }
    
    // Check all constraints and indexes
    const [indexes] = await sequelize.query('PRAGMA index_list(orders);');
    logger.info('Current indexes on orders table:', indexes);
    
    // Check if the unique constraint on platformId exists
    let hasPlatformIdUniqueConstraint = false;
    for (const index of indexes) {
      if (index.unique === 1) {
        const [indexInfo] = await sequelize.query(`PRAGMA index_info('${index.name}');`);
        
        if (indexInfo.length === 1 && indexInfo[0].name === 'platformId') {
          hasPlatformIdUniqueConstraint = true;
          logger.info(`Found single-column unique constraint on platformId: ${index.name}`);
        }
      }
    }
    
    if (!hasPlatformIdUniqueConstraint) {
      logger.info('No single-column unique constraint on platformId found, checking composite constraint...');
      
      // Check if we already have a composite constraint
      let hasCompositeConstraint = false;
      for (const index of indexes) {
        if (index.unique === 1) {
          const [indexInfo] = await sequelize.query(`PRAGMA index_info('${index.name}');`);
          
          if (indexInfo.length === 2) {
            const fields = indexInfo.map(info => info.name);
            if (fields.includes('externalOrderId') && fields.includes('platformId')) {
              hasCompositeConstraint = true;
              logger.info(`Composite unique constraint already exists: ${index.name}`);
            }
          }
        }
      }
      
      if (hasCompositeConstraint) {
        logger.info('The required composite constraint already exists, no need for any changes.');
        return { 
          success: true, 
          message: 'The required composite constraint on (externalOrderId, platformId) already exists.' 
        };
      }
    }
    
    // Create a new table without the unique constraint on platformId
    logger.info('Creating new table structure without platformId unique constraint...');
    await sequelize.query(`
      CREATE TABLE orders_new (
        id TEXT PRIMARY KEY,
        externalOrderId TEXT NOT NULL,
        platformId TEXT NOT NULL,
        userId TEXT NOT NULL,
        customerName TEXT NOT NULL,
        customerEmail TEXT,
        customerPhone TEXT,
        orderDate DATETIME NOT NULL,
        totalAmount DECIMAL(10, 2) NOT NULL,
        currency TEXT NOT NULL DEFAULT 'USD',
        status TEXT NOT NULL DEFAULT 'new',
        notes TEXT,
        paymentMethod TEXT,
        paymentStatus TEXT NOT NULL DEFAULT 'pending',
        shippingMethod TEXT,
        shippingDetailId TEXT,
        rawData JSON,
        lastSyncedAt DATETIME,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        connectionId TEXT,
        archived BOOLEAN DEFAULT 0,
        UNIQUE(externalOrderId, platformId)
      );
    `);
    
    // Copy data
    logger.info('Copying data to new table...');
    await sequelize.query(`
      INSERT INTO orders_new 
      SELECT * FROM orders;
    `);
    
    // Drop the old table and rename the new one
    logger.info('Replacing old table with new one...');
    await sequelize.query('DROP TABLE orders;');
    await sequelize.query('ALTER TABLE orders_new RENAME TO orders;');
    
    // Re-create necessary indexes
    logger.info('Re-creating indexes...');
    await sequelize.query('CREATE INDEX orders_user_id ON orders(userId);');
    await sequelize.query('CREATE INDEX orders_status ON orders(status);');
    await sequelize.query('CREATE INDEX orders_order_date ON orders(orderDate);');
    
    // Verify the fix
    const [newIndexes] = await sequelize.query('PRAGMA index_list(orders);');
    logger.info('New indexes on orders table:', newIndexes);
    
    logger.info('Successfully fixed platformId constraint in orders table!');
    return { 
      success: true, 
      message: 'Successfully fixed platformId constraint in orders table!'
    };
  } catch (error) {
    logger.error(`Error fixing platformId constraint: ${error.message}`, { error });
    return { success: false, error: error.message };
  }
}

// Export the function
module.exports = fixPlatformIdConstraint;

// Run the function if this script is executed directly
if (require.main === module) {
  fixPlatformIdConstraint()
    .then(result => {
      console.log(result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(err => {
      console.error('Unhandled error:', err);
      process.exit(1);
    });
}