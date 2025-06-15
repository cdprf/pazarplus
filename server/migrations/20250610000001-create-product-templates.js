"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("ProductTemplates", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      platformType: {
        type: Sequelize.ENUM(
          "trendyol",
          "hepsiburada",
          "n11",
          "pazarama",
          "amazon",
          "global"
        ),
        allowNull: true,
      },
      categoryId: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      categoryName: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      fieldMappings: {
        type: Sequelize.JSON,
        defaultValue: {},
      },
      requiredFields: {
        type: Sequelize.JSON,
        defaultValue: [],
      },
      validationRules: {
        type: Sequelize.JSON,
        defaultValue: {},
      },
      conditionalFields: {
        type: Sequelize.JSON,
        defaultValue: {},
      },
      defaultValues: {
        type: Sequelize.JSON,
        defaultValue: {},
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      version: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
      },
      parentTemplateId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "ProductTemplates",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      usage_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      last_used: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "Users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Add indexes for better performance
    await queryInterface.addIndex("ProductTemplates", ["userId"]);
    await queryInterface.addIndex("ProductTemplates", ["platformType"]);
    await queryInterface.addIndex("ProductTemplates", ["categoryId"]);
    await queryInterface.addIndex("ProductTemplates", ["isActive"]);
    await queryInterface.addIndex("ProductTemplates", ["parentTemplateId"]);
    await queryInterface.addIndex("ProductTemplates", [
      "platformType",
      "categoryId",
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("ProductTemplates");
  },
};
