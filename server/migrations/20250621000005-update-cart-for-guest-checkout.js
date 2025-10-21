'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // Step 1: Rename the existing table
      await queryInterface.renameTable('carts', '_carts_old', { transaction });

      // Step 2: Create the new table with the correct schema
      await queryInterface.createTable('carts', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
        },
        userId: {
          type: Sequelize.UUID,
          allowNull: true, // Allow null for guest carts
          unique: true,
          references: {
            model: 'users',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        sessionId: {
          type: Sequelize.STRING,
          allowNull: true,
          unique: true,
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
      }, { transaction });

      // Step 3: Copy data from the old table to the new table
      await queryInterface.sequelize.query(
        'INSERT INTO carts (id, userId, createdAt, updatedAt) SELECT id, userId, createdAt, updatedAt FROM _carts_old;',
        { transaction }
      );

      // Step 4: Drop the old table
      await queryInterface.dropTable('_carts_old', { transaction });

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // Revert the changes in a similar manner
      await queryInterface.renameTable('carts', '_carts_new', { transaction });

      await queryInterface.createTable('carts', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
        },
        userId: {
          type: Sequelize.UUID,
          allowNull: false, // Revert to not allowing null
          unique: true,
          references: {
            model: 'users',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
      }, { transaction });

      await queryInterface.sequelize.query(
        'INSERT INTO carts (id, userId, createdAt, updatedAt) SELECT id, userId, createdAt, updatedAt FROM _carts_new WHERE userId IS NOT NULL;',
        { transaction }
      );

      await queryInterface.dropTable('_carts_new', { transaction });

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
};