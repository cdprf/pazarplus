/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log(
      "Starting migration: Add errorMessage and retryCount columns to orders table"
    );

    // Add errorMessage column if it doesn't exist
    await queryInterface
      .addColumn("orders", "errorMessage", {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: "Error message for failed orders or operations",
      })
      .catch((error) => {
        if (error.message.includes("already exists")) {
          console.log("errorMessage column already exists");
        } else {
          throw error;
        }
      });

    // Add retryCount column if it doesn't exist
    await queryInterface
      .addColumn("orders", "retryCount", {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
        comment: "Number of retry attempts for failed operations",
      })
      .catch((error) => {
        if (error.message.includes("already exists")) {
          console.log("retryCount column already exists");
        } else {
          throw error;
        }
      });

    // Create the indexes AFTER the columns exist
    await queryInterface
      .addIndex("orders", ["errorMessage"], {
        name: "orders_error_message_idx",
      })
      .catch((error) => {
        if (error.message.includes("already exists")) {
          console.log("Index orders_error_message_idx already exists");
        } else {
          throw error;
        }
      });

    await queryInterface
      .addIndex("orders", ["retryCount"], {
        name: "orders_retry_count_idx",
      })
      .catch((error) => {
        if (error.message.includes("already exists")) {
          console.log("Index orders_retry_count_idx already exists");
        } else {
          throw error;
        }
      });

    console.log(
      "Finished migration: Added errorMessage and retryCount columns to orders table"
    );
  },

  down: async (queryInterface, Sequelize) => {
    console.log(
      "Starting rollback: Remove errorMessage and retryCount columns from orders table"
    );

    // Remove indexes first
    await queryInterface
      .removeIndex("orders", "orders_error_message_idx")
      .catch((e) => {
        console.log(
          "Error removing index orders_error_message_idx:",
          e.message
        );
      });
    await queryInterface
      .removeIndex("orders", "orders_retry_count_idx")
      .catch((e) => {
        console.log("Error removing index orders_retry_count_idx:", e.message);
      });

    // Then remove columns
    await queryInterface.removeColumn("orders", "errorMessage").catch((e) => {
      console.log("Error removing column errorMessage:", e.message);
    });
    await queryInterface.removeColumn("orders", "retryCount").catch((e) => {
      console.log("Error removing column retryCount:", e.message);
    });

    console.log(
      "Finished rollback: Removed errorMessage and retryCount columns from orders table"
    );
  },
};
