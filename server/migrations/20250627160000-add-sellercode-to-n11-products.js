"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    console.log("Adding missing sellerCode column to n11_products table");

    try {
      // Check if column exists first
      const [existingColumn] = await queryInterface.sequelize.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'n11_products' 
        AND column_name = 'sellerCode'
      `);

      if (existingColumn.length === 0) {
        await queryInterface.addColumn("n11_products", "sellerCode", {
          type: Sequelize.STRING,
          allowNull: true,
          comment: "Seller code for N11 product",
        });
        console.log("✅ Successfully added sellerCode column to n11_products");
      } else {
        console.log("✅ sellerCode column already exists in n11_products");
      }
    } catch (error) {
      console.error("❌ Error adding sellerCode column:", error.message);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    console.log("Removing sellerCode column from n11_products table");

    try {
      await queryInterface.removeColumn("n11_products", "sellerCode");
      console.log(
        "✅ Successfully removed sellerCode column from n11_products"
      );
    } catch (error) {
      console.error("❌ Error removing sellerCode column:", error.message);
      throw error;
    }
  },
};
