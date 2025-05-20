// Migration to add platformType column to PlatformConnections
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if the column exists first
    const table = await queryInterface.describeTable('PlatformConnections');
    if (!table.platformType) {
      await queryInterface.addColumn('PlatformConnections', 'platformType', {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'unknown' // Set a default to avoid issues with existing rows
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Check if the column exists before trying to remove it
    const table = await queryInterface.describeTable('PlatformConnections');
    if (table.platformType) {
      await queryInterface.removeColumn('PlatformConnections', 'platformType');
    }
  }
};
