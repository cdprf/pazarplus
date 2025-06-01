"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("products", "barcode", {
      type: Sequelize.STRING(100),
      allowNull: true,
      comment: "Product barcode for identification",
    });

    // Add index for better performance on barcode lookups
    await queryInterface.addIndex("products", ["barcode"], {
      name: "idx_products_barcode",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex("products", "idx_products_barcode");
    await queryInterface.removeColumn("products", "barcode");
  },
};
