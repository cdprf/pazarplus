"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log(
      "Starting migration: Add missing columns to main_products table"
    );

    // Add missing columns that were referenced in the error logs
    await queryInterface.addColumn("main_products", "stockQuantity", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });

    await queryInterface.addColumn("main_products", "minStockLevel", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });

    await queryInterface.addColumn("main_products", "reservedStock", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });

    await queryInterface.addColumn("main_products", "baseCostPrice", {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
    });

    await queryInterface.addColumn("main_products", "media", {
      type: Sequelize.JSON,
      allowNull: true,
      defaultValue: "[]",
    });

    await queryInterface.addColumn("main_products", "publishedPlatforms", {
      type: Sequelize.JSON,
      allowNull: true,
      defaultValue: "[]",
    });

    await queryInterface.addColumn("main_products", "platformTemplates", {
      type: Sequelize.JSON,
      allowNull: true,
      defaultValue: "{}",
    });

    await queryInterface.addColumn("main_products", "learnedFields", {
      type: Sequelize.JSON,
      allowNull: true,
      defaultValue: "{}",
    });

    await queryInterface.addColumn("main_products", "categoryMappings", {
      type: Sequelize.JSON,
      allowNull: true,
      defaultValue: "{}",
    });

    await queryInterface.addColumn("main_products", "attributes", {
      type: Sequelize.JSON,
      allowNull: true,
      defaultValue: "{}",
    });

    await queryInterface.addColumn("main_products", "tags", {
      type: Sequelize.JSON,
      allowNull: true,
      defaultValue: "[]",
    });

    await queryInterface.addColumn("main_products", "hasVariants", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    await queryInterface.addColumn("main_products", "stockCodePattern", {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn("main_products", "patternConfidence", {
      type: Sequelize.DECIMAL(3, 2),
      allowNull: true,
      defaultValue: 0.0,
    });

    await queryInterface.addColumn("main_products", "lastStockUpdate", {
      type: Sequelize.DATE,
      allowNull: true,
    });

    console.log(
      "Finished migration: Added missing columns to main_products table"
    );
  },

  async down(queryInterface, Sequelize) {
    console.log(
      "Starting rollback: Remove added columns from main_products table"
    );

    const columnsToRemove = [
      "stockQuantity",
      "minStockLevel",
      "reservedStock",
      "baseCostPrice",
      "media",
      "publishedPlatforms",
      "platformTemplates",
      "learnedFields",
      "categoryMappings",
      "attributes",
      "tags",
      "hasVariants",
      "stockCodePattern",
      "patternConfidence",
      "lastStockUpdate",
    ];

    for (const column of columnsToRemove) {
      await queryInterface.removeColumn("main_products", column);
    }

    console.log(
      "Finished rollback: Removed added columns from main_products table"
    );
  },
};
