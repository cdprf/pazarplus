"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    console.log(
      "🔄 Updating Trendyol Orders table to match API response structure..."
    );

    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Check if table exists
      const tableExists = await queryInterface.tableExists("trendyol_orders");
      if (!tableExists) {
        console.log(
          "❌ trendyol_orders table does not exist. Please run the main migration first."
        );
        throw new Error("trendyol_orders table not found");
      }

      // Add new fields based on Trendyol API response
      const newColumns = [
        // From API: cityName, districtName (for shipmentAddress)
        {
          name: "shipmentCityName",
          type: Sequelize.STRING,
          allowNull: true,
          comment: "Shipment city name from Trendyol API",
        },
        {
          name: "shipmentDistrictName",
          type: Sequelize.STRING,
          allowNull: true,
          comment: "Shipment district name from Trendyol API",
        },

        // From API: lines array - we'll store line items in separate table or JSON
        {
          name: "orderLines",
          type: Sequelize.JSON,
          allowNull: true,
          comment: "Order line items from Trendyol API",
        },

        // From API: packageHistories array
        {
          name: "packageHistories",
          type: Sequelize.JSON,
          allowNull: true,
          comment: "Package history from Trendyol API",
        },

        // From API: totalPrice, totalPaidPrice
        {
          name: "totalPrice",
          type: Sequelize.DECIMAL(12, 2),
          allowNull: true,
          comment: "Total price from Trendyol API",
        },
        {
          name: "totalPaidPrice",
          type: Sequelize.DECIMAL(12, 2),
          allowNull: true,
          comment: "Total paid price from Trendyol API",
        },

        // From API: tcIdentityNumber, e164GsmNumber
        {
          name: "tcIdentityNumber",
          type: Sequelize.STRING,
          allowNull: true,
          comment: "Turkish identity number from Trendyol API",
        },
        {
          name: "e164GsmNumber",
          type: Sequelize.STRING,
          allowNull: true,
          comment: "Phone number in E164 format from Trendyol API",
        },

        // From API: deliveryAddressType
        {
          name: "deliveryAddressType",
          type: Sequelize.STRING,
          allowNull: true,
          comment: "Delivery address type from Trendyol API",
        },

        // From API: agreedDeliveryDateExtension
        {
          name: "agreedDeliveryDateExtension",
          type: Sequelize.DATE,
          allowNull: true,
          comment: "Agreed delivery date extension from Trendyol API",
        },

        // From API: fastDeliveryType
        {
          name: "fastDeliveryType",
          type: Sequelize.STRING,
          allowNull: true,
          comment: "Fast delivery type from Trendyol API",
        },

        // From API: originShipmentDate
        {
          name: "originShipmentDate",
          type: Sequelize.DATE,
          allowNull: true,
          comment: "Origin shipment date from Trendyol API",
        },

        // From API: lastPackageLastModifiedDate
        {
          name: "lastPackageLastModifiedDate",
          type: Sequelize.DATE,
          allowNull: true,
          comment: "Last package modified date from Trendyol API",
        },

        // From API: lastPackageCreatedDate
        {
          name: "lastPackageCreatedDate",
          type: Sequelize.DATE,
          allowNull: true,
          comment: "Last package created date from Trendyol API",
        },

        // From API: micro (boolean)
        {
          name: "micro",
          type: Sequelize.BOOLEAN,
          allowNull: true,
          defaultValue: false,
          comment: "Micro order flag from Trendyol API",
        },

        // From API: orderType
        {
          name: "orderType",
          type: Sequelize.STRING,
          allowNull: true,
          comment: "Order type from Trendyol API",
        },
      ];

      // Add new columns one by one
      for (const column of newColumns) {
        try {
          const columnExists = await queryInterface
            .describeTable("trendyol_orders")
            .then((description) => description[column.name] !== undefined)
            .catch(() => false);

          if (!columnExists) {
            console.log(`➕ Adding column: ${column.name}`);
            await queryInterface.addColumn(
              "trendyol_orders",
              column.name,
              {
                type: column.type,
                allowNull: column.allowNull,
                defaultValue: column.defaultValue,
                comment: column.comment,
              },
              { transaction }
            );
          } else {
            console.log(`✅ Column ${column.name} already exists`);
          }
        } catch (error) {
          console.log(`⚠️  Error adding column ${column.name}:`, error.message);
        }
      }

      // Update existing columns to match API requirements
      console.log("🔄 Updating existing columns...");

      // Update trendyolOrderId to be required and ensure it's properly indexed
      try {
        await queryInterface.changeColumn(
          "trendyol_orders",
          "trendyolOrderId",
          {
            type: Sequelize.STRING,
            allowNull: false,
            comment: "Trendyol order ID - required field from API",
          },
          { transaction }
        );
        console.log("✅ Updated trendyolOrderId column");
      } catch (error) {
        console.log("⚠️  Error updating trendyolOrderId:", error.message);
      }

      // Update orderStatus to include all possible values from API
      try {
        await queryInterface.changeColumn(
          "trendyol_orders",
          "orderStatus",
          {
            type: Sequelize.ENUM(
              "Created",
              "Picking",
              "Picked",
              "Cancelled",
              "Shipped",
              "Delivered",
              "UnDelivered",
              "Returned",
              "Repack",
              "Awaiting",
              "Processing",
              "ReadyToShip",
              "Invoiced"
            ),
            allowNull: false,
            defaultValue: "Created",
            comment: "Order status from Trendyol API",
          },
          { transaction }
        );
        console.log("✅ Updated orderStatus column");
      } catch (error) {
        console.log("⚠️  Error updating orderStatus enum:", error.message);
      }

      // Add indexes for new searchable fields
      const newIndexes = [
        { fields: ["shipmentCityName"] },
        { fields: ["shipmentDistrictName"] },
        { fields: ["tcIdentityNumber"] },
        { fields: ["orderType"] },
        { fields: ["originShipmentDate"] },
        { fields: ["lastPackageCreatedDate"] },
      ];

      for (const index of newIndexes) {
        try {
          await queryInterface.addIndex("trendyol_orders", index.fields, {
            transaction,
          });
          console.log(`✅ Added index for: ${index.fields.join(", ")}`);
        } catch (error) {
          console.log(
            `⚠️  Index may already exist for ${index.fields.join(", ")}: ${
              error.message
            }`
          );
        }
      }

      await transaction.commit();
      console.log("✅ Trendyol Orders table update completed successfully!");
    } catch (error) {
      await transaction.rollback();
      console.error("❌ Error updating Trendyol Orders table:", error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    console.log("🔄 Reverting Trendyol Orders table changes...");

    const transaction = await queryInterface.sequelize.transaction();

    try {
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
        try {
          await queryInterface.removeColumn("trendyol_orders", columnName, {
            transaction,
          });
          console.log(`✅ Removed column: ${columnName}`);
        } catch (error) {
          console.log(
            `⚠️  Error removing column ${columnName}:`,
            error.message
          );
        }
      }

      // Revert orderStatus enum to original values
      try {
        await queryInterface.changeColumn(
          "trendyol_orders",
          "orderStatus",
          {
            type: Sequelize.ENUM(
              "Created",
              "Picking",
              "Picked",
              "Cancelled",
              "Shipped",
              "Delivered",
              "UnDelivered",
              "Returned",
              "Repack"
            ),
            allowNull: false,
            defaultValue: "Created",
          },
          { transaction }
        );
        console.log("✅ Reverted orderStatus enum");
      } catch (error) {
        console.log("⚠️  Error reverting orderStatus enum:", error.message);
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
          },
          { transaction }
        );
        console.log("✅ Reverted trendyolOrderId column");
      } catch (error) {
        console.log("⚠️  Error reverting trendyolOrderId:", error.message);
      }

      await transaction.commit();
      console.log("✅ Trendyol Orders table reversion completed!");
    } catch (error) {
      await transaction.rollback();
      console.error("❌ Error reverting Trendyol Orders table:", error);
      throw error;
    }
  },
};
