'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add a unique index to the vinCode column for faster lookups
    await queryInterface.addIndex('vehicles', ['vinCode'], {
      unique: true,
      name: 'vehicles_vinCode_unique_idx',
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove the index
    await queryInterface.removeIndex('vehicles', 'vehicles_vinCode_unique_idx');
  }
};