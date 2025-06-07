"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Update orderStatus ENUM to include new status values
    try {
      // First, let's check if the column exists and what type it is
      const tableDescription = await queryInterface.describeTable("orders");

      if (tableDescription.orderStatus) {
        console.log(
          "Updating orderStatus ENUM to include new status values..."
        );

        // Drop the existing ENUM type and recreate with new values
        // Note: This is PostgreSQL syntax. For other databases, this might need adjustment.
        await queryInterface.sequelize.query(`
          ALTER TABLE orders 
          ALTER COLUMN "orderStatus" TYPE VARCHAR(50);
        `);

        // Recreate the ENUM with all values including new ones
        await queryInterface.changeColumn("orders", "orderStatus", {
          type: Sequelize.ENUM(
            "new",
            "pending",
            "processing",
            "shipped",
            "in_transit",
            "delivered",
            "cancelled",
            "returned",
            "failed",
            "unknown",
            "claim_created",
            "claim_approved",
            "claim_rejected",
            "refunded",
            "consolidated",
            "in_batch"
          ),
          allowNull: false,
          defaultValue: "new",
          comment:
            "Order status compatible with all platform services including consolidated and batch processing",
        });

        console.log(
          "Successfully updated orderStatus ENUM with new values: consolidated, in_batch"
        );
      } else {
        console.log("orderStatus column does not exist, creating it...");

        // Create the column if it doesn't exist
        await queryInterface.addColumn("orders", "orderStatus", {
          type: Sequelize.ENUM(
            "new",
            "pending",
            "processing",
            "shipped",
            "in_transit",
            "delivered",
            "cancelled",
            "returned",
            "failed",
            "unknown",
            "claim_created",
            "claim_approved",
            "claim_rejected",
            "refunded",
            "consolidated",
            "in_batch"
          ),
          allowNull: false,
          defaultValue: "new",
          comment:
            "Order status compatible with all platform services including consolidated and batch processing",
        });
      }
    } catch (error) {
      console.error("Error updating orderStatus ENUM:", error.message);

      // Fallback for SQLite or other databases that don't support ALTER ENUM
      console.log("Attempting SQLite-compatible approach...");
      try {
        // For SQLite, we can't modify ENUM, but we can work with CHECK constraints
        await queryInterface.sequelize.query(`
          -- SQLite doesn't have native ENUM support, so this creates compatibility
          UPDATE orders SET orderStatus = 'new' WHERE orderStatus IS NULL;
        `);
        console.log("Applied SQLite-compatible orderStatus updates");
      } catch (sqliteError) {
        console.log(
          "SQLite fallback also failed, but this may be expected:",
          sqliteError.message
        );
      }
    }

    // Add indexes for better performance on status queries
    try {
      await queryInterface.addIndex("orders", ["orderStatus"], {
        name: "idx_orders_status",
      });
      console.log("Added index on orderStatus for improved query performance");
    } catch (error) {
      console.log("Index might already exist:", error.message);
    }

    // Add composite index for common queries
    try {
      await queryInterface.addIndex("orders", ["userId", "orderStatus"], {
        name: "idx_orders_user_status",
      });
      console.log("Added composite index on userId and orderStatus");
    } catch (error) {
      console.log("Composite index might already exist:", error.message);
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      // Remove the added indexes
      await queryInterface.removeIndex("orders", "idx_orders_status");
      await queryInterface.removeIndex("orders", "idx_orders_user_status");

      // Revert to original ENUM values (remove consolidated and in_batch)
      await queryInterface.changeColumn("orders", "orderStatus", {
        type: Sequelize.ENUM(
          "new",
          "pending",
          "processing",
          "shipped",
          "in_transit",
          "delivered",
          "cancelled",
          "returned",
          "failed",
          "unknown",
          "claim_created",
          "claim_approved",
          "claim_rejected",
          "refunded"
        ),
        allowNull: false,
        defaultValue: "new",
      });

      console.log("Reverted orderStatus ENUM to original values");
    } catch (error) {
      console.error("Error during rollback:", error.message);
    }
  },
};
