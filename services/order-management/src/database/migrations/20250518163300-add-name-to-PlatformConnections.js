// Migration to add name column to PlatformConnections
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('PlatformConnections', 'name', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'Default Name' // Consider a more appropriate default or handle in application logic
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('PlatformConnections', 'name');
  }
};
