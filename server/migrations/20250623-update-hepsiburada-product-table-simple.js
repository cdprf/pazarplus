"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    console.log(
      "🔄 Updating HepsiBurada Products table to match API response structure..."
    );

    try {
      // Check if table exists
      const tableExists = await queryInterface.tableExists(
        "hepsiburada_products"
      );
      if (!tableExists) {
        console.log(
          "❌ hepsiburada_products table does not exist. Please run the main migration first."
        );
        throw new Error("hepsiburada_products table not found");
      }

      // Helper function to check if column exists
      const columnExists = async (columnName) => {
        try {
          const description = await queryInterface.describeTable(
            "hepsiburada_products"
          );
          return description[columnName] !== undefined;
        } catch (error) {
          return false;
        }
      };

      // Add new fields based on HepsiBurada API response
      const newColumns = [
        {
          name: "hbSku",
          type: Sequelize.STRING,
          comment: "HepsiBurada SKU from API",
        },
        {
          name: "variantGroupId",
          type: Sequelize.STRING,
          comment: "Variant group ID from HepsiBurada API",
        },
        {
          name: "productName",
          type: Sequelize.STRING,
          comment: "Product name from HepsiBurada API",
        },
        {
          name: "categoryName",
          type: Sequelize.STRING,
          comment: "Category name from HepsiBurada API",
        },
        {
          name: "tax",
          type: Sequelize.STRING,
          comment: "Tax rate from HepsiBurada API",
        },
        {
          name: "baseAttributes",
          type: Sequelize.JSON,
          comment: "Base attributes from HepsiBurada API",
        },
        {
          name: "variantTypeAttributes",
          type: Sequelize.JSON,
          comment: "Variant type attributes from HepsiBurada API",
        },
        {
          name: "productAttributes",
          type: Sequelize.JSON,
          comment: "Product attributes from HepsiBurada API",
        },
        {
          name: "validationResults",
          type: Sequelize.JSON,
          comment: "Validation results from HepsiBurada API",
        },
        {
          name: "rejectReasons",
          type: Sequelize.JSON,
          comment: "Reject reasons from HepsiBurada API",
        },
        {
          name: "qualityScore",
          type: Sequelize.DECIMAL(10, 6),
          comment: "Quality score from HepsiBurada API",
        },
        {
          name: "qualityStatus",
          type: Sequelize.STRING,
          comment: "Quality status from HepsiBurada API",
        },
        {
          name: "ccValidationResults",
          type: Sequelize.JSON,
          comment: "CC validation results from HepsiBurada API",
        },
        {
          name: "platformStatus",
          type: Sequelize.STRING,
          comment:
            "Platform status (MATCHED, PENDING, etc.) from HepsiBurada API",
        },
        {
          name: "stock",
          type: Sequelize.INTEGER,
          comment: "Stock quantity from HepsiBurada API",
        },
        {
          name: "weight",
          type: Sequelize.DECIMAL(10, 3),
          comment: "Product weight (kg) from HepsiBurada API",
        },
        {
          name: "guaranteeMonths",
          type: Sequelize.INTEGER,
          comment: "Guarantee period in months from HepsiBurada API",
        },
        {
          name: "rawData",
          type: Sequelize.JSON,
          comment: "Raw product data from HepsiBurada API",
        },
      ];

      // Add new columns one by one
      for (const column of newColumns) {
        try {
          if (!(await columnExists(column.name))) {
            console.log(`➕ Adding column: ${column.name}`);
            await queryInterface.addColumn(
              "hepsiburada_products",
              column.name,
              {
                type: column.type,
                allowNull: true,
                comment: column.comment,
              }
            );
          } else {
            console.log(`✅ Column ${column.name} already exists`);
          }
        } catch (error) {
          console.log(`⚠️  Error adding column ${column.name}:`, error.message);
        }
      }

      console.log(
        "✅ HepsiBurada Products table update completed successfully!"
      );
    } catch (error) {
      console.error("❌ Error updating HepsiBurada Products table:", error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    console.log("🔄 Reverting HepsiBurada Products table changes...");

    try {
      // Remove added columns
      const columnsToRemove = [
        "hbSku",
        "variantGroupId",
        "productName",
        "categoryName",
        "tax",
        "baseAttributes",
        "variantTypeAttributes",
        "productAttributes",
        "validationResults",
        "rejectReasons",
        "qualityScore",
        "qualityStatus",
        "ccValidationResults",
        "platformStatus",
        "stock",
        "weight",
        "guaranteeMonths",
        "rawData",
      ];

      for (const columnName of columnsToRemove) {
        try {
          await queryInterface.removeColumn("hepsiburada_products", columnName);
          console.log(`✅ Removed column: ${columnName}`);
        } catch (error) {
          console.log(
            `⚠️  Error removing column ${columnName}:`,
            error.message
          );
        }
      }

      console.log("✅ HepsiBurada Products table reversion completed!");
    } catch (error) {
      console.error("❌ Error reverting HepsiBurada Products table:", error);
      throw error;
    }
  },
};
