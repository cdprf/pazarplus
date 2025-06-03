"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add settings column to users table
    await queryInterface.addColumn("users", "settings", {
      type: Sequelize.TEXT,
      allowNull: true,
      defaultValue: "{}",
      comment: "User settings stored as JSON string",
    });

    console.log("✅ Added settings column to users table");
  },

  async down(queryInterface, Sequelize) {
    // Remove settings column from users table
    await queryInterface.removeColumn("users", "settings");

    console.log("✅ Removed settings column from users table");
  },
};
