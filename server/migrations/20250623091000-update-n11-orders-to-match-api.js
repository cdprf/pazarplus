"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    console.log(
      "Starting migration: Update N11 orders table to match API response structure"
    );

    // Add missing columns that exist in the API response
    const columnsToAdd = [
      {
        name: "customerId",
        definition: {
          type: Sequelize.BIGINT,
          allowNull: true,
          comment: "N11 customer ID from API response",
        },
      },
      {
        name: "customerEmail",
        definition: {
          type: Sequelize.STRING,
          allowNull: true,
          comment: "Customer email from N11 API",
        },
      },
      {
        name: "customerFullName",
        definition: {
          type: Sequelize.STRING,
          allowNull: true,
          comment: "Customer full name from N11 API",
        },
      },
      {
        name: "tcIdentityNumber",
        definition: {
          type: Sequelize.STRING,
          allowNull: true,
          comment: "Turkish Identity Number from N11 API",
        },
      },
      {
        name: "taxId",
        definition: {
          type: Sequelize.STRING,
          allowNull: true,
          comment: "Tax ID from N11 API",
        },
      },
      {
        name: "taxOffice",
        definition: {
          type: Sequelize.STRING,
          allowNull: true,
          comment: "Tax office from N11 API",
        },
      },
      {
        name: "cargoSenderNumber",
        definition: {
          type: Sequelize.STRING,
          allowNull: true,
          comment: "Cargo sender number from N11 API",
        },
      },
      {
        name: "cargoTrackingNumber",
        definition: {
          type: Sequelize.STRING,
          allowNull: true,
          comment: "Cargo tracking number from N11 API",
        },
      },
      {
        name: "cargoTrackingLink",
        definition: {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: "Cargo tracking link from N11 API",
        },
      },
      {
        name: "shipmentCompanyId",
        definition: {
          type: Sequelize.INTEGER,
          allowNull: true,
          comment: "Shipment company ID from N11 API",
        },
      },
      {
        name: "cargoProviderName",
        definition: {
          type: Sequelize.STRING,
          allowNull: true,
          comment: "Cargo provider name from N11 API",
        },
      },
      {
        name: "shipmentMethod",
        definition: {
          type: Sequelize.INTEGER,
          allowNull: true,
          comment: "Shipment method from N11 API",
        },
      },
      {
        name: "installmentChargeWithVATprice",
        definition: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: true,
          defaultValue: 0.0,
          comment: "Installment charge with VAT from N11 API",
        },
      },
      {
        name: "lastModifiedDate",
        definition: {
          type: Sequelize.BIGINT,
          allowNull: true,
          comment: "Last modified timestamp from N11 API",
        },
      },
      {
        name: "agreedDeliveryDate",
        definition: {
          type: Sequelize.BIGINT,
          allowNull: true,
          comment: "Agreed delivery timestamp from N11 API",
        },
      },
      {
        name: "totalAmount",
        definition: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: true,
          comment: "Total amount from N11 API",
        },
      },
      {
        name: "totalDiscountAmount",
        definition: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: true,
          comment: "Total discount amount from N11 API",
        },
      },
      {
        name: "packageHistories",
        definition: {
          type: Sequelize.JSON,
          allowNull: true,
          comment: "Package status history from N11 API",
        },
      },
      {
        name: "shipmentPackageStatus",
        definition: {
          type: Sequelize.STRING,
          allowNull: true,
          comment: "Current shipment package status from N11 API",
        },
      },
      {
        name: "lines",
        definition: {
          type: Sequelize.JSON,
          allowNull: true,
          comment: "Order line items from N11 API",
        },
      },
    ];

    // Add each column with error handling
    for (const column of columnsToAdd) {
      try {
        await queryInterface.addColumn(
          "n11_orders",
          column.name,
          column.definition
        );
        console.log(`Added column ${column.name} to n11_orders`);
      } catch (error) {
        console.log(
          `Column ${column.name} already exists or error:`,
          error.message
        );
      }
    }

    // Update enum values for orderStatus to match N11 API statuses
    try {
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

      console.log("Updated orderStatus enum values to match N11 API");
    } catch (error) {
      console.log("Error updating orderStatus enum:", error.message);
    }

    // Add indexes for performance
    const indexesToAdd = [
      { fields: ["customerId"] },
      { fields: ["customerEmail"] },
      { fields: ["cargoTrackingNumber"] },
      { fields: ["shipmentPackageStatus"] },
      { fields: ["lastModifiedDate"] },
      { fields: ["agreedDeliveryDate"] },
    ];

    for (const index of indexesToAdd) {
      try {
        await queryInterface.addIndex("n11_orders", index);
        console.log(`Added index on ${index.fields.join(", ")}`);
      } catch (error) {
        console.log(
          `Index on ${index.fields.join(", ")} already exists or error:`,
          error.message
        );
      }
    }

    console.log(
      "Migration completed: N11 orders table updated to match API structure"
    );
  },

  async down(queryInterface, Sequelize) {
    console.log(
      "Reverting migration: Update N11 orders table to match API response structure"
    );

    // Remove added columns
    const columnsToRemove = [
      "customerId",
      "customerEmail",
      "customerFullName",
      "tcIdentityNumber",
      "taxId",
      "taxOffice",
      "cargoSenderNumber",
      "cargoTrackingNumber",
      "cargoTrackingLink",
      "shipmentCompanyId",
      "cargoProviderName",
      "shipmentMethod",
      "installmentChargeWithVATprice",
      "lastModifiedDate",
      "agreedDeliveryDate",
      "totalAmount",
      "totalDiscountAmount",
      "packageHistories",
      "shipmentPackageStatus",
      "lines",
    ];

    for (const columnName of columnsToRemove) {
      try {
        await queryInterface.removeColumn("n11_orders", columnName);
        console.log(`Removed column ${columnName} from n11_orders`);
      } catch (error) {
        console.log(`Error removing column ${columnName}:`, error.message);
      }
    }

    // Revert enum values
    try {
      await queryInterface.sequelize.query(`
        ALTER TYPE "enum_n11_orders_orderStatus" RENAME TO "enum_n11_orders_orderStatus_new";
      `);

      await queryInterface.sequelize.query(`
        CREATE TYPE "enum_n11_orders_orderStatus" AS ENUM(
          'Yeni', 'Onaylandi', 'Hazirlaniyor', 'Kargoya_Verildi', 
          'Teslim_Edildi', 'Iptal_Edildi', 'Iade_Edildi'
        );
      `);

      await queryInterface.sequelize.query(`
        ALTER TABLE "n11_orders" 
        ALTER COLUMN "orderStatus" TYPE "enum_n11_orders_orderStatus" 
        USING 'Yeni'::"enum_n11_orders_orderStatus";
      `);

      await queryInterface.sequelize.query(`
        DROP TYPE "enum_n11_orders_orderStatus_new";
      `);

      console.log("Reverted orderStatus enum values");
    } catch (error) {
      console.log("Error reverting orderStatus enum:", error.message);
    }

    console.log("Migration reverted successfully");
  },
};
