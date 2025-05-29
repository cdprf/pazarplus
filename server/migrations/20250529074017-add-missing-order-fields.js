"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add missing columns to orders table
    try {
      // Add invoiceStatus column
      await queryInterface.addColumn("orders", "invoiceStatus", {
        type: Sequelize.ENUM("pending", "issued", "cancelled"),
        allowNull: true,
        defaultValue: "pending",
      });
    } catch (error) {
      console.log("invoiceStatus column might already exist:", error.message);
    }

    try {
      // Add invoiceNumber column
      await queryInterface.addColumn("orders", "invoiceNumber", {
        type: Sequelize.STRING,
        allowNull: true,
      });
    } catch (error) {
      console.log("invoiceNumber column might already exist:", error.message);
    }

    try {
      // Add invoiceDate column
      await queryInterface.addColumn("orders", "invoiceDate", {
        type: Sequelize.DATE,
        allowNull: true,
      });
    } catch (error) {
      console.log("invoiceDate column might already exist:", error.message);
    }

    try {
      // Add lastSyncedAt column
      await queryInterface.addColumn("orders", "lastSyncedAt", {
        type: Sequelize.DATE,
        allowNull: true,
        comment: "Last time this order was synced from platform",
      });
    } catch (error) {
      console.log("lastSyncedAt column might already exist:", error.message);
    }

    try {
      // Change rawData to JSON type if it's currently TEXT
      await queryInterface.changeColumn("orders", "rawData", {
        type: Sequelize.JSON,
        allowNull: true,
        comment: "Raw order data from platform API",
      });
    } catch (error) {
      console.log(
        "rawData column change error (expected if already JSON):",
        error.message
      );
    }

    try {
      // Update orderStatus to use ENUM if it's currently STRING
      await queryInterface.changeColumn("orders", "orderStatus", {
        type: Sequelize.ENUM(
          "new",
          "pending",
          "processing",
          "shipped",
          "delivered",
          "cancelled",
          "returned",
          "failed",
          "unknown"
        ),
        allowNull: false,
        defaultValue: "new",
      });
    } catch (error) {
      console.log(
        "orderStatus column change error (expected if already ENUM):",
        error.message
      );
    }

    try {
      // Make externalOrderId and orderNumber NOT NULL
      await queryInterface.changeColumn("orders", "externalOrderId", {
        type: Sequelize.STRING,
        allowNull: false,
        comment:
          "Order ID from the external platform (e.g., Trendyol order number)",
      });
    } catch (error) {
      console.log("externalOrderId column change error:", error.message);
    }

    try {
      await queryInterface.changeColumn("orders", "orderNumber", {
        type: Sequelize.STRING,
        allowNull: false,
        comment: "Order number for display purposes",
      });
    } catch (error) {
      console.log("orderNumber column change error:", error.message);
    }

    try {
      // Make connectionId NOT NULL
      await queryInterface.changeColumn("orders", "connectionId", {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "platform_connections",
          key: "id",
        },
      });
    } catch (error) {
      console.log("connectionId column change error:", error.message);
    }

    try {
      // Remove old unique index if it exists
      await queryInterface.removeIndex(
        "orders",
        "orders_platform_order_id_platform_id"
      );
    } catch (error) {
      console.log(
        "Old index removal error (expected if index does not exist):",
        error.message
      );
    }

    try {
      // Add new unique index for externalOrderId + connectionId
      await queryInterface.addIndex("orders", {
        fields: ["externalOrderId", "connectionId"],
        unique: true,
        name: "unique_external_order_per_connection",
      });
    } catch (error) {
      console.log(
        "Index creation error (expected if already exists):",
        error.message
      );
    }
  },

  async down(queryInterface, Sequelize) {
    // Remove the columns we added
    try {
      await queryInterface.removeColumn("orders", "invoiceStatus");
    } catch (error) {
      console.log("Error removing invoiceStatus:", error.message);
    }

    try {
      await queryInterface.removeColumn("orders", "invoiceNumber");
    } catch (error) {
      console.log("Error removing invoiceNumber:", error.message);
    }

    try {
      await queryInterface.removeColumn("orders", "invoiceDate");
    } catch (error) {
      console.log("Error removing invoiceDate:", error.message);
    }

    try {
      await queryInterface.removeColumn("orders", "lastSyncedAt");
    } catch (error) {
      console.log("Error removing lastSyncedAt:", error.message);
    }

    try {
      // Remove the unique index
      await queryInterface.removeIndex(
        "orders",
        "unique_external_order_per_connection"
      );
    } catch (error) {
      console.log("Error removing index:", error.message);
    }
  },
};
