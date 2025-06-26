'use strict';

const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Helper function to check if column exists
    const columnExists = async (tableName, columnName) => {
      try {
        const tableDescription = await queryInterface.describeTable(tableName);
        return !!tableDescription[columnName];
      } catch (error) {
        return false;
      }
    };

    // Add sourcePlatform field if it doesn't exist
    if (!(await columnExists('products', 'sourcePlatform'))) {
      await queryInterface.addColumn('products', 'sourcePlatform', {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Original platform this product was imported from'
      });
    }

    // Check and update the enum for variantDetectionSource if needed
    try {
      const tableInfo = await queryInterface.describeTable('products');
      if (tableInfo.variantDetectionSource) {
        // The field exists, check if we need to update the enum
        console.log('variantDetectionSource field already exists');
      }
    } catch (error) {
      console.log('Error checking variantDetectionSource:', error.message);
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Remove the sourcePlatform column
    try {
      await queryInterface.removeColumn('products', 'sourcePlatform');
    } catch (error) {
      console.log('Error removing sourcePlatform column:', error.message);
    }
  }
};
