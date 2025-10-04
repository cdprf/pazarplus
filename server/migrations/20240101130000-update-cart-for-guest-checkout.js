'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add sessionId column to allow guest carts
    await queryInterface.addColumn('carts', 'sessionId', {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true,
      comment: 'Session ID for guest carts',
    });

    // Modify userId column to allow null for guest carts
    await queryInterface.changeColumn('carts', 'userId', {
      type: Sequelize.UUID,
      allowNull: true, // This is the key change for guest carts
      unique: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Revert userId column to not allow null.
    // Note: This will fail if there are guest carts with null userId.
    // Manual data migration would be needed first.
    await queryInterface.changeColumn('carts', 'userId', {
      type: Sequelize.UUID,
      allowNull: false,
      unique: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });

    // Remove sessionId column
    await queryInterface.removeColumn('carts', 'sessionId');
  }
};