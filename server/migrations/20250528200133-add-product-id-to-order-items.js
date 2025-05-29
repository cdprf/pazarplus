"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("order_items", "productId", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "products",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    // Add index for better performance
    await queryInterface.addIndex("order_items", ["productId"]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex("order_items", ["productId"]);
    await queryInterface.removeColumn("order_items", "productId");
  },
};
