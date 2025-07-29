/**
 * Migration: Add creationSource column to Products table
 * This fixes the database error: column items->product.creationSource does not exist
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Check if the column already exists
      const tableDescription = await queryInterface.describeTable("products");

      if (!tableDescription.creationSource) {
        console.log("Adding creationSource column to products table...");

        await queryInterface.addColumn("products", "creationSource", {
          type: Sequelize.ENUM(
            "user",
            "platform_sync",
            "excel_import",
            "api_import"
          ),
          allowNull: false,
          defaultValue: "user",
          comment: "How this product was created",
        });

        console.log(
          "Successfully added creationSource column to products table"
        );
      } else {
        console.log("creationSource column already exists in products table");
      }
    } catch (error) {
      console.error("Error adding creationSource column:", error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      console.log("Removing creationSource column from products table...");

      await queryInterface.removeColumn("products", "creationSource");

      console.log(
        "Successfully removed creationSource column from products table"
      );
    } catch (error) {
      console.error("Error removing creationSource column:", error);
      throw error;
    }
  },
};
