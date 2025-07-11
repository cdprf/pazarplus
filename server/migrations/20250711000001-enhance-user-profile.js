const { DataTypes } = require("sequelize");

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Add phone column if it doesn't exist
      const usersTable = await queryInterface.describeTable("users");

      if (!usersTable.phone) {
        await queryInterface.addColumn("users", "phone", {
          type: DataTypes.STRING,
          allowNull: true,
          comment: "User phone number",
        });
        console.log("Added phone column to users table");
      }

      if (!usersTable.bio) {
        await queryInterface.addColumn("users", "bio", {
          type: DataTypes.TEXT,
          allowNull: true,
          comment: "User biography/description",
        });
        console.log("Added bio column to users table");
      }

      console.log("User profile enhancement migration completed successfully");
    } catch (error) {
      console.error("Migration failed:", error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // Remove the added columns
      await queryInterface.removeColumn("users", "phone");
      await queryInterface.removeColumn("users", "bio");
      console.log("Removed phone and bio columns from users table");
    } catch (error) {
      console.error("Migration rollback failed:", error);
      throw error;
    }
  },
};
