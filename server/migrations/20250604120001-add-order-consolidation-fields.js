"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // Add isConsolidated column for order consolidation tracking
      await queryInterface.addColumn("orders", "isConsolidated", {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: "Indicates if this order is part of a consolidated shipment",
      });

      console.log("Added isConsolidated column to orders table");

      // Add consolidatedGroupId to track which orders are consolidated together
      await queryInterface.addColumn("orders", "consolidatedGroupId", {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: "Groups orders that are consolidated together",
      });

      console.log("Added consolidatedGroupId column to orders table");

      // Add batch processing fields
      await queryInterface.addColumn("orders", "batchId", {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: "Groups orders that are processed in the same batch",
      });

      console.log("Added batchId column to orders table");

      // Add index for consolidation queries
      await queryInterface.addIndex("orders", ["isConsolidated"], {
        name: "idx_orders_consolidated",
      });

      // Add index for batch queries
      await queryInterface.addIndex("orders", ["batchId"], {
        name: "idx_orders_batch",
        where: {
          batchId: { [Sequelize.Op.ne]: null },
        },
      });

      console.log("Added indexes for consolidation and batch processing");
    } catch (error) {
      console.error("Error adding consolidation fields:", error.message);

      // Individual column addition with error handling
      try {
        await queryInterface.addColumn("orders", "isConsolidated", {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        });
      } catch (e) {
        console.log("isConsolidated column might already exist");
      }

      try {
        await queryInterface.addColumn("orders", "consolidatedGroupId", {
          type: Sequelize.STRING(50),
          allowNull: true,
        });
      } catch (e) {
        console.log("consolidatedGroupId column might already exist");
      }

      try {
        await queryInterface.addColumn("orders", "batchId", {
          type: Sequelize.STRING(50),
          allowNull: true,
        });
      } catch (e) {
        console.log("batchId column might already exist");
      }
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      // Remove indexes
      await queryInterface.removeIndex("orders", "idx_orders_consolidated");
      await queryInterface.removeIndex("orders", "idx_orders_batch");

      // Remove columns
      await queryInterface.removeColumn("orders", "isConsolidated");
      await queryInterface.removeColumn("orders", "consolidatedGroupId");
      await queryInterface.removeColumn("orders", "batchId");

      console.log("Removed consolidation and batch processing fields");
    } catch (error) {
      console.error("Error during rollback:", error.message);
    }
  },
};
