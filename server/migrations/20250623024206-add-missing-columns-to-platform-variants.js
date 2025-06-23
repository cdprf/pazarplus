"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log(
      "Starting migration: Add missing columns to platform_variants table"
    );

    // Add templateId column
    await queryInterface.addColumn("platform_variants", "templateId", {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "platform_templates",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    // Add other missing columns that were referenced in the logs
    await queryInterface.addColumn("platform_variants", "variantSuffix", {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn("platform_variants", "useMainPrice", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });

    await queryInterface.addColumn("platform_variants", "platformCostPrice", {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
    });

    await queryInterface.addColumn("platform_variants", "priceMarkup", {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: true,
    });

    await queryInterface.addColumn("platform_variants", "platformAttributes", {
      type: Sequelize.JSON,
      allowNull: true,
      defaultValue: "{}",
    });

    await queryInterface.addColumn("platform_variants", "platformCategoryId", {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn("platform_variants", "useMainMedia", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });

    await queryInterface.addColumn("platform_variants", "platformMedia", {
      type: Sequelize.JSON,
      allowNull: true,
      defaultValue: "[]",
    });

    await queryInterface.addColumn(
      "platform_variants",
      "mediaTransformations",
      {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: "{}",
      }
    );

    await queryInterface.addColumn("platform_variants", "isPublished", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    await queryInterface.addColumn("platform_variants", "publishedAt", {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addColumn("platform_variants", "lastSyncAt", {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addColumn("platform_variants", "syncStatus", {
      type: Sequelize.ENUM("pending", "syncing", "success", "error"),
      allowNull: false,
      defaultValue: "pending",
    });

    await queryInterface.addColumn("platform_variants", "syncError", {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    await queryInterface.addColumn("platform_variants", "externalId", {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn("platform_variants", "externalUrl", {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn("platform_variants", "templateFields", {
      type: Sequelize.JSON,
      allowNull: true,
      defaultValue: "{}",
    });

    await queryInterface.addColumn("platform_variants", "isDefault", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    await queryInterface.addColumn("platform_variants", "sortOrder", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });

    await queryInterface.addColumn("platform_variants", "learnedFromProduct", {
      type: Sequelize.UUID,
      allowNull: true,
    });

    await queryInterface.addColumn("platform_variants", "learningConfidence", {
      type: Sequelize.DECIMAL(3, 2),
      allowNull: true,
      defaultValue: 0.0,
    });

    await queryInterface.addColumn("platform_variants", "conversionRate", {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: 0.0,
    });

    await queryInterface.addColumn("platform_variants", "avgRating", {
      type: Sequelize.DECIMAL(3, 2),
      allowNull: true,
    });

    await queryInterface.addColumn("platform_variants", "totalSales", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });

    await queryInterface.addColumn("platform_variants", "productId", {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "products",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    // Create index for templateId
    await queryInterface.addIndex("platform_variants", ["templateId"], {
      name: "platform_variants_template_id_idx",
    });

    console.log(
      "Finished migration: Added missing columns to platform_variants table"
    );
  },

  async down(queryInterface, Sequelize) {
    console.log(
      "Starting rollback: Remove added columns from platform_variants table"
    );

    const columnsToRemove = [
      "templateId",
      "variantSuffix",
      "useMainPrice",
      "platformCostPrice",
      "priceMarkup",
      "platformAttributes",
      "platformCategoryId",
      "useMainMedia",
      "platformMedia",
      "mediaTransformations",
      "isPublished",
      "publishedAt",
      "lastSyncAt",
      "syncStatus",
      "syncError",
      "externalId",
      "externalUrl",
      "templateFields",
      "isDefault",
      "sortOrder",
      "learnedFromProduct",
      "learningConfidence",
      "conversionRate",
      "avgRating",
      "totalSales",
      "productId",
    ];

    for (const column of columnsToRemove) {
      await queryInterface.removeColumn("platform_variants", column);
    }

    console.log(
      "Finished rollback: Removed added columns from platform_variants table"
    );
  },
};
