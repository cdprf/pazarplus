"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log("Adding lowercase enum values to N11 orders enum...");

      // Check what values currently exist
      const [results] = await queryInterface.sequelize.query(
        `
        SELECT unnest(enum_range(NULL::"enum_n11_orders_orderStatus")) as enum_value;
      `,
        { transaction }
      );

      console.log(
        "Current enum values:",
        results.map((r) => r.enum_value)
      );

      // Add lowercase values that don't exist yet
      const lowercaseValues = [
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
      ];
      const currentValues = results.map((r) => r.enum_value);

      for (const value of lowercaseValues) {
        if (!currentValues.includes(value)) {
          try {
            await queryInterface.sequelize.query(
              `
              ALTER TYPE "enum_n11_orders_orderStatus" ADD VALUE '${value}';
            `,
              { transaction }
            );
            console.log(`Added enum value: ${value}`);
          } catch (error) {
            console.log(
              `Value ${value} already exists or error: ${error.message}`
            );
          }
        }
      }

      await transaction.commit();
      console.log(
        "Successfully added lowercase enum values to N11 orders enum"
      );
    } catch (error) {
      await transaction.rollback();
      console.error("Error updating N11 orders enum:", error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    console.log(
      "Reverting N11 orders enum changes - no action needed as we only added values"
    );
    // PostgreSQL doesn't support removing enum values easily, so we leave them
    // This is safe as the old migration logic will still work
  },
};
