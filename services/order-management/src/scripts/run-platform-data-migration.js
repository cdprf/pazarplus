// filepath: /Users/Username/Desktop/Soft/pazar+/services/order-management/src/scripts/run-platform-data-migration.js
/**
 * Script to run the migration from platform-specific tables to the generic platform data model.
 * 
 * Usage: node src/scripts/run-platform-data-migration.js
 * 
 * @date May 20, 2025
 */

const { sequelize } = require('../config/database');
const logger = require('../utils/logger');
const migration = require('../database/migrations/20250520_migrate_to_generic_platform_models');

async function runMigration() {
  logger.info('Starting platform data migration');
  
  try {
    // Run the migration
    const result = await migration.up();
    
    if (result.success) {
      logger.info(`Migration successful: ${result.message}`);
      console.log('\n✅ Migration completed successfully!');
      console.log('All platform-specific data has been migrated to the new generic model.\n');
    } else {
      logger.error(`Migration failed: ${result.message}`);
      console.error('\n❌ Migration failed!');
      console.error(`Error: ${result.message}\n`);
      console.error('Please check the logs for more details.\n');
      process.exit(1);
    }
  } catch (error) {
    logger.error(`Migration error: ${error.message}`, { error });
    console.error('\n❌ Migration failed with an unexpected error!');
    console.error(`Error: ${error.message}\n`);
    console.error('Please check the logs for more details.\n');
    process.exit(1);
  } finally {
    // Close the database connection
    await sequelize.close();
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  console.log('\n🚀 Starting migration to generic platform data model...');
  console.log('This will migrate all data from platform-specific tables to the new generic model.\n');
  
  runMigration().then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error(`Unexpected error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = runMigration;