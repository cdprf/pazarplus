"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    console.log("Adding 'Failed' status to N11 orders enum");

    try {
      // Add 'Failed' to the existing enum
      await queryInterface.sequelize.query(`
        ALTER TYPE "enum_n11_orders_orderStatus" ADD VALUE 'Failed';
      `);

      console.log("Successfully added 'Failed' status to N11 orders enum");
    } catch (error) {
      console.log("Error adding 'Failed' status to enum:", error.message);
      // If the value already exists, this will fail - that's expected
      if (error.message.includes("already exists")) {
        console.log("'Failed' status already exists in enum");
      } else {
        throw error;
      }
    }
  },

  async down(queryInterface, Sequelize) {
    console.log("Removing 'Failed' status from N11 orders enum");

    try {
      // PostgreSQL doesn't support removing enum values directly
      // We need to recreate the enum without 'Failed'
      await queryInterface.sequelize.query(`
        ALTER TYPE "enum_n11_orders_orderStatus" RENAME TO "enum_n11_orders_orderStatus_old";
      `);

      await queryInterface.sequelize.query(`
        CREATE TYPE "enum_n11_orders_orderStatus" AS ENUM(
          'Created', 'Picking', 'Shipped', 'Delivered', 'Cancelled', 'Returned', 'Processing'
        );
      `);

      await queryInterface.sequelize.query(`
        ALTER TABLE "n11_orders" 
        ALTER COLUMN "orderStatus" TYPE "enum_n11_orders_orderStatus" 
        USING "orderStatus"::text::"enum_n11_orders_orderStatus";
      `);

      await queryInterface.sequelize.query(`
        DROP TYPE "enum_n11_orders_orderStatus_old";
      `);

      console.log("Successfully removed 'Failed' status from N11 orders enum");
    } catch (error) {
      console.log("Error removing 'Failed' status from enum:", error.message);
      throw error;
    }
  },
};
