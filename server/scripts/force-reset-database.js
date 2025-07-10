const sequelize = require('../config/database');
const logger = require('../utils/logger');

async function forceResetDatabase() {
  try {
    logger.info('🔄 Force syncing database (dropping all tables)...');

    // Force sync will drop all tables and recreate them
    await sequelize.sync({ force: true });

    logger.info('✅ Database force reset completed successfully!');
    logger.info('All tables have been dropped and recreated.');
  } catch (error) {
    logger.error('❌ Error during force reset:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

forceResetDatabase();
