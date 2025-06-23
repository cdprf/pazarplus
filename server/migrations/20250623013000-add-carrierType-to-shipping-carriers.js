module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log(
      "Starting migration: Add carrierType to shipping_carriers table"
    );

    // Add carrierType column if it doesn't exist
    await queryInterface
      .addColumn("shipping_carriers", "carrierType", {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Type of carrier (domestic, international, etc)",
      })
      .catch((error) => {
        if (error.message.includes("already exists")) {
          console.log("carrierType column already exists");
        } else {
          throw error;
        }
      });

    // Create an index for carrierType
    await queryInterface
      .addIndex("shipping_carriers", ["carrierType"], {
        name: "shipping_carriers_carrier_type_idx",
      })
      .catch((error) => {
        if (error.message.includes("already exists")) {
          console.log(
            "Index shipping_carriers_carrier_type_idx already exists"
          );
        } else {
          throw error;
        }
      });

    console.log(
      "Finished migration: Added carrierType to shipping_carriers table"
    );
  },

  down: async (queryInterface, Sequelize) => {
    console.log(
      "Starting rollback: Remove carrierType from shipping_carriers table"
    );

    // Remove index first
    await queryInterface
      .removeIndex("shipping_carriers", "shipping_carriers_carrier_type_idx")
      .catch((e) => {
        console.log(
          "Error removing index shipping_carriers_carrier_type_idx:",
          e.message
        );
      });

    // Then remove column
    await queryInterface
      .removeColumn("shipping_carriers", "carrierType")
      .catch((e) => {
        console.log("Error removing column carrierType:", e.message);
      });

    console.log(
      "Finished rollback: Removed carrierType from shipping_carriers table"
    );
  },
};
