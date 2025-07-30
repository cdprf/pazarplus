/**
 * Migration: Add creationSource column to main_products table
 * This fixes the database error: column MainProduct.creationSource does not exist
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Check if the column already exists
      const tableDescription = await queryInterface.describeTable(
        "main_products"
      );

      if (!tableDescription.creationSource) {
        console.log("Adding creationSource column to main_products table...");

        await queryInterface.addColumn("main_products", "creationSource", {
          type: Sequelize.ENUM(
            "user",
            "platform_sync",
            "excel_import",
            "api_import"
          ),
          allowNull: true,
          defaultValue: "user",
          comment: "Track how this main product was created",
        });

        console.log(
          "Successfully added creationSource column to main_products table"
        );
      } else {
        console.log(
          "creationSource column already exists in main_products table"
        );
      }
    } catch (error) {
      console.error(
        "Error adding creationSource column to main_products:",
        error
      );
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      console.log("Removing creationSource column from main_products table...");

      await queryInterface.removeColumn("main_products", "creationSource");

      console.log(
        "Successfully removed creationSource column from main_products table"
      );
    } catch (error) {
      console.error(
        "Error removing creationSource column from main_products:",
        error
      );
      throw error;
    }
  },
};
