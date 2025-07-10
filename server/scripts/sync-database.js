const { sequelize } = require('../models');

const syncDatabase = async () => {
  try {
    console.log('🔄 Syncing database...');

    // Use force: false and alter: false to avoid dropping existing tables
    // This will only create missing tables
    await sequelize.sync({ force: false });

    console.log('✅ Database sync completed successfully!');
    console.log('📊 All missing tables have been created');
  } catch (error) {
    console.error('❌ Error syncing database:', error);
    throw error;
  }
};

module.exports = { syncDatabase };

// Run sync if this file is executed directly
if (require.main === module) {
  syncDatabase()
    .then(() => {
      console.log('✅ Database sync complete, exiting...');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Database sync failed:', error);
      process.exit(1);
    });
}
