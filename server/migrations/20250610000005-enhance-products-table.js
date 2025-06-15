"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add new fields to Products table
    await queryInterface.addColumn("Products", "templateId", {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "ProductTemplates",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    await queryInterface.addColumn("Products", "categoryMappings", {
      type: Sequelize.JSON,
      defaultValue: {},
    });

    await queryInterface.addColumn("Products", "publishingSettings", {
      type: Sequelize.JSON,
      defaultValue: {},
    });

    await queryInterface.addColumn("Products", "variantDetectionRules", {
      type: Sequelize.JSON,
      defaultValue: {},
    });

    await queryInterface.addColumn("Products", "lastSyncAt", {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addColumn("Products", "syncStatus", {
      type: Sequelize.ENUM("pending", "syncing", "completed", "failed"),
      defaultValue: "pending",
    });

    // Add indexes for new fields
    await queryInterface.addIndex("Products", ["templateId"]);
    await queryInterface.addIndex("Products", ["syncStatus"]);
    await queryInterface.addIndex("Products", ["lastSyncAt"]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("Products", "templateId");
    await queryInterface.removeColumn("Products", "categoryMappings");
    await queryInterface.removeColumn("Products", "publishingSettings");
    await queryInterface.removeColumn("Products", "variantDetectionRules");
    await queryInterface.removeColumn("Products", "lastSyncAt");
    await queryInterface.removeColumn("Products", "syncStatus");
  },
};
