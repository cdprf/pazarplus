"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("shipping_rates", "orderId", {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "orders",
        key: "id",
      },
      onDelete: "SET NULL",
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("shipping_rates", "orderId");
  },
};
