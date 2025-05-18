// Migration to add platformType column to PlatformConnections
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('PlatformConnections', 'platformType', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'unknown' // Set a default to avoid issues with existing rows
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('PlatformConnections', 'platformType');
  }
};
