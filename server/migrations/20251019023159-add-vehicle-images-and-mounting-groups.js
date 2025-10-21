'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('vehicles', 'description', {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    await queryInterface.addColumn('vehicles', 'images', {
      type: Sequelize.JSON,
      allowNull: true,
      comment: '{"small": "url", "large": "url", "gallery": ["url1", "url2"]}',
    });

    await queryInterface.createTable('mounting_groups', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      images: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: '{"small": "url", "large": "url", "gallery": ["url1", "url2"]}',
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    await queryInterface.addColumn('products', 'mountingGroupId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'mounting_groups',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('vehicles', 'description');
    await queryInterface.removeColumn('vehicles', 'images');
    await queryInterface.removeColumn('products', 'mountingGroupId');
    await queryInterface.dropTable('mounting_groups');
  }
};