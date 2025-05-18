'use strict';

/** 
 * Initial migration to demonstrate database migration structure
 * This migration adds an 'archived' boolean field to Orders table
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      await queryInterface.addColumn('Orders', 'archived', {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      });
      console.log('Migration: Added archived column to Orders table');
      return Promise.resolve();
    } catch (error) {
      console.error('Migration Error:', error);
      return Promise.reject(error);
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      await queryInterface.removeColumn('Orders', 'archived');
      console.log('Rollback: Removed archived column from Orders table');
      return Promise.resolve();
    } catch (error) {
      console.error('Rollback Error:', error);
      return Promise.reject(error);
    }
  }
};