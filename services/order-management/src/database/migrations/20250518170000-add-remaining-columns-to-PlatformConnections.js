'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // userId column already exists, removed from this migration
    // platformName column already exists, removed from this migration
    // credentials column already exists, removed from this migration
    await queryInterface.addColumn('PlatformConnections', 'settings', {
      type: Sequelize.TEXT,
      allowNull: true
    });
    await queryInterface.addColumn('PlatformConnections', 'isActive', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    });
    await queryInterface.addColumn('PlatformConnections', 'lastSyncAt', {
      type: Sequelize.DATE,
      allowNull: true
    });
    await queryInterface.addColumn('PlatformConnections', 'syncStatus', {
      type: Sequelize.STRING,
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('PlatformConnections', 'syncStatus');
    await queryInterface.removeColumn('PlatformConnections', 'lastSyncAt');
    await queryInterface.removeColumn('PlatformConnections', 'isActive');
    await queryInterface.removeColumn('PlatformConnections', 'settings');
    // credentials column was not added by this migration in the up, so not removing here
    // platformName column was not added by this migration in the up, so not removing here
    // userId column was not added by this migration in the up, so not removing here
  }
};
