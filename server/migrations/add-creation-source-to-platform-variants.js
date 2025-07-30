/**
 * Migration: Add creationSource column to platform_variants table
 * This fixes the database error: column platformVariants.creationSource does not exist
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Check if the column already exists
      const tableDescription = await queryInterface.describeTable(
        "platform_variants"
      );

      if (!tableDescription.creationSource) {
        console.log(
          "Adding creationSource column to platform_variants table..."
        );

        await queryInterface.addColumn("platform_variants", "creationSource", {
          type: Sequelize.ENUM(
            "user",
            "platform_sync",
            "excel_import",
            "api_import"
          ),
          allowNull: true,
          defaultValue: "user",
          comment: "Track how this platform variant was created",
        });

        console.log(
          "Successfully added creationSource column to platform_variants table"
        );
      } else {
        console.log(
          "creationSource column already exists in platform_variants table"
        );
      }
    } catch (error) {
      console.error(
        "Error adding creationSource column to platform_variants:",
        error
      );
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      console.log(
        "Removing creationSource column from platform_variants table..."
      );

      await queryInterface.removeColumn("platform_variants", "creationSource");

      console.log(
        "Successfully removed creationSource column from platform_variants table"
      );
    } catch (error) {
      console.error(
        "Error removing creationSource column from platform_variants:",
        error
      );
      throw error;
    }
  },
};
