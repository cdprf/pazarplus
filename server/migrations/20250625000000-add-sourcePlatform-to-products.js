const { DataTypes } = require("sequelize");

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      console.log("Adding sourcePlatform column to products table...");

      await queryInterface.addColumn("products", "sourcePlatform", {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment:
          "Platform where this product originated from (hepsiburada, trendyol, n11, etc.)",
      });

      // Add index for better query performance
      await queryInterface.addIndex("products", ["sourcePlatform"], {
        name: "products_source_platform_idx",
      });

      console.log(
        "✅ Successfully added sourcePlatform column to products table"
      );
    } catch (error) {
      console.error("❌ Error adding sourcePlatform column:", error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      console.log("Removing sourcePlatform column from products table...");

      // Remove index first
      await queryInterface.removeIndex(
        "products",
        "products_source_platform_idx"
      );

      // Remove column
      await queryInterface.removeColumn("products", "sourcePlatform");

      console.log(
        "✅ Successfully removed sourcePlatform column from products table"
      );
    } catch (error) {
      console.error("❌ Error removing sourcePlatform column:", error);
      throw error;
    }
  },
};
