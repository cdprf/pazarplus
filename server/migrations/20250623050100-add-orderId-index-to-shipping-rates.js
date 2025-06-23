"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create the index that was failing
    await queryInterface
      .addIndex("shipping_rates", ["orderId"], {
        name: "shipping_rates_order_id",
      })
      .catch((error) => {
        if (error.message.includes("already exists")) {
          console.log("Index shipping_rates_order_id already exists");
        } else {
          throw error;
        }
      });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface
      .removeIndex("shipping_rates", "shipping_rates_order_id")
      .catch((e) => console.log("Failed to remove index:", e.message));
  },
};
