// Migration to add status column to PlatformConnections
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('PlatformConnections', 'status', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'pending' // Or another sensible default
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('PlatformConnections', 'status');
  }
};
