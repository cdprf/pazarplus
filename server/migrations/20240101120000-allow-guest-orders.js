'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Modify the userId column to allow null values for guest checkouts
    await queryInterface.changeColumn('orders', 'userId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL', // Set to null if user is deleted
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Revert the change. Note: This will fail if there are orders with null userId.
    // Manual data migration would be needed to assign users to guest orders before reverting.
    await queryInterface.changeColumn('orders', 'userId', {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE', // Revert back to CASCADE
    });
  },
};