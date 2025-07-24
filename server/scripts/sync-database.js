const { sequelize } = require('../models');
const logger = require("../utils/logger");

const syncDatabase = async () => {
  try {
    logger.info('🔄 Syncing database...');

    // Use force: false and alter: false to avoid dropping existing tables
    // This will only create missing tables
    await sequelize.sync({ force: false });

    logger.info('✅ Database sync completed successfully!');
    logger.info('📊 All missing tables have been created');
  } catch (error) {
    logger.error('❌ Error syncing database:', error);
    throw error;
  }
};

module.exports = { syncDatabase };

// Run sync if this file is executed directly
if (require.main === module) {
  syncDatabase()
    .then(() => {
      logger.info('✅ Database sync complete, exiting...');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('❌ Database sync failed:', error);
      process.exit(1);
    });
}
