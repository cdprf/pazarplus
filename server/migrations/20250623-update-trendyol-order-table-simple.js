"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    console.log(
      "🔄 Updating Trendyol Orders table to match API response structure..."
    );

    try {
      // Check if table exists
      const tableExists = await queryInterface.tableExists("trendyol_orders");
      if (!tableExists) {
        console.log(
          "❌ trendyol_orders table does not exist. Please run the main migration first."
        );
        throw new Error("trendyol_orders table not found");
      }

      // Helper function to check if column exists
      const columnExists = async (columnName) => {
        try {
          const description = await queryInterface.describeTable(
            "trendyol_orders"
          );
          return description[columnName] !== undefined;
        } catch (error) {
          return false;
        }
      };

      console.log("➕ Adding new columns...");

      // Add new columns one by one without transaction to avoid locks
      const newColumns = [
        {
          name: "shipmentCityName",
          type: Sequelize.STRING,
          comment: "Shipment city name from Trendyol API",
        },
        {
          name: "shipmentDistrictName",
          type: Sequelize.STRING,
          comment: "Shipment district name from Trendyol API",
        },
        {
          name: "orderLines",
          type: Sequelize.JSON,
          comment: "Order line items from Trendyol API",
        },
        {
          name: "packageHistories",
          type: Sequelize.JSON,
          comment: "Package history from Trendyol API",
        },
        {
          name: "totalPrice",
          type: Sequelize.DECIMAL(12, 2),
          comment: "Total price from Trendyol API",
        },
        {
          name: "totalPaidPrice",
          type: Sequelize.DECIMAL(12, 2),
          comment: "Total paid price from Trendyol API",
        },
        {
          name: "tcIdentityNumber",
          type: Sequelize.STRING,
          comment: "Turkish identity number from Trendyol API",
        },
        {
          name: "e164GsmNumber",
          type: Sequelize.STRING,
          comment: "Phone number in E164 format from Trendyol API",
        },
        {
          name: "deliveryAddressType",
          type: Sequelize.STRING,
          comment: "Delivery address type from Trendyol API",
        },
        {
          name: "agreedDeliveryDateExtension",
          type: Sequelize.DATE,
          comment: "Agreed delivery date extension from Trendyol API",
        },
        {
          name: "fastDeliveryType",
          type: Sequelize.STRING,
          comment: "Fast delivery type from Trendyol API",
        },
        {
          name: "originShipmentDate",
          type: Sequelize.DATE,
          comment: "Origin shipment date from Trendyol API",
        },
        {
          name: "lastPackageLastModifiedDate",
          type: Sequelize.DATE,
          comment: "Last package modified date from Trendyol API",
        },
        {
          name: "lastPackageCreatedDate",
          type: Sequelize.DATE,
          comment: "Last package created date from Trendyol API",
        },
        {
          name: "micro",
          type: Sequelize.BOOLEAN,
          defaultValue: false,
          comment: "Micro order flag from Trendyol API",
        },
        {
          name: "orderType",
          type: Sequelize.STRING,
          comment: "Order type from Trendyol API",
        },
      ];

      // Add columns sequentially
      for (const column of newColumns) {
        if (!(await columnExists(column.name))) {
          console.log(`  ➕ Adding column: ${column.name}`);
          await queryInterface.addColumn("trendyol_orders", column.name, {
            type: column.type,
            allowNull: true,
            defaultValue: column.defaultValue,
            comment: column.comment,
          });
        } else {
          console.log(`  ✅ Column ${column.name} already exists`);
        }
      }

      // Update orderStatus enum to include new values
      console.log("🔄 Updating orderStatus enum...");
      try {
        // Drop the existing enum constraint
        await queryInterface.sequelize.query(`
          ALTER TABLE trendyol_orders 
          ALTER COLUMN "orderStatus" DROP DEFAULT;
        `);

        await queryInterface.sequelize.query(`
          ALTER TABLE trendyol_orders 
          ALTER COLUMN "orderStatus" TYPE VARCHAR(50);
        `);

        // Set back the default
        await queryInterface.sequelize.query(`
          ALTER TABLE trendyol_orders 
          ALTER COLUMN "orderStatus" SET DEFAULT 'Created';
        `);

        console.log("✅ Updated orderStatus to support all API values");
      } catch (error) {
        console.log(
          "⚠️  OrderStatus enum update may have failed:",
          error.message
        );
      }

      // Update trendyolOrderId to be required
      console.log("🔄 Updating trendyolOrderId constraint...");
      try {
        await queryInterface.changeColumn(
          "trendyol_orders",
          "trendyolOrderId",
          {
            type: Sequelize.STRING,
            allowNull: false,
            comment: "Trendyol order ID - required field from API",
          }
        );
        console.log("✅ Updated trendyolOrderId to be required");
      } catch (error) {
        console.log(
          "⚠️  trendyolOrderId update may have failed:",
          error.message
        );
      }

      // Add indexes for performance
      console.log("🔄 Adding indexes...");
      const indexes = [
        { fields: ["shipmentCityName"], name: "idx_trendyol_orders_city" },
        {
          fields: ["shipmentDistrictName"],
          name: "idx_trendyol_orders_district",
        },
        { fields: ["tcIdentityNumber"], name: "idx_trendyol_orders_tc_id" },
        { fields: ["orderType"], name: "idx_trendyol_orders_type" },
        {
          fields: ["originShipmentDate"],
          name: "idx_trendyol_orders_origin_ship_date",
        },
        {
          fields: ["lastPackageCreatedDate"],
          name: "idx_trendyol_orders_last_pkg_created",
        },
      ];

      for (const index of indexes) {
        try {
          await queryInterface.addIndex("trendyol_orders", index.fields, {
            name: index.name,
          });
          console.log(`  ✅ Added index: ${index.name}`);
        } catch (error) {
          console.log(
            `  ⚠️  Index ${index.name} may already exist: ${error.message}`
          );
        }
      }

      console.log("✅ Trendyol Orders table update completed successfully!");
    } catch (error) {
      console.error("❌ Error updating Trendyol Orders table:", error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    console.log("🔄 Reverting Trendyol Orders table changes...");

    try {
      // Helper function to check if column exists
      const columnExists = async (columnName) => {
        try {
          const description = await queryInterface.describeTable(
            "trendyol_orders"
          );
          return description[columnName] !== undefined;
        } catch (error) {
          return false;
        }
      };

      // Remove added columns
      const columnsToRemove = [
        "shipmentCityName",
        "shipmentDistrictName",
        "orderLines",
        "packageHistories",
        "totalPrice",
        "totalPaidPrice",
        "tcIdentityNumber",
        "e164GsmNumber",
        "deliveryAddressType",
        "agreedDeliveryDateExtension",
        "fastDeliveryType",
        "originShipmentDate",
        "lastPackageLastModifiedDate",
        "lastPackageCreatedDate",
        "micro",
        "orderType",
      ];

      for (const columnName of columnsToRemove) {
        if (await columnExists(columnName)) {
          await queryInterface.removeColumn("trendyol_orders", columnName);
          console.log(`✅ Removed column: ${columnName}`);
        }
      }

      // Remove indexes
      const indexesToRemove = [
        "idx_trendyol_orders_city",
        "idx_trendyol_orders_district",
        "idx_trendyol_orders_tc_id",
        "idx_trendyol_orders_type",
        "idx_trendyol_orders_origin_ship_date",
        "idx_trendyol_orders_last_pkg_created",
      ];

      for (const indexName of indexesToRemove) {
        try {
          await queryInterface.removeIndex("trendyol_orders", indexName);
          console.log(`✅ Removed index: ${indexName}`);
        } catch (error) {
          console.log(`⚠️  Index ${indexName} may not exist: ${error.message}`);
        }
      }

      // Revert trendyolOrderId to allow null
      try {
        await queryInterface.changeColumn(
          "trendyol_orders",
          "trendyolOrderId",
          {
            type: Sequelize.STRING,
            allowNull: true,
            comment: "Trendyol order ID",
          }
        );
        console.log("✅ Reverted trendyolOrderId to allow null");
      } catch (error) {
        console.log(
          "⚠️  trendyolOrderId reversion may have failed:",
          error.message
        );
      }

      console.log("✅ Trendyol Orders table reversion completed!");
    } catch (error) {
      console.error("❌ Error reverting Trendyol Orders table:", error);
      throw error;
    }
  },
};
