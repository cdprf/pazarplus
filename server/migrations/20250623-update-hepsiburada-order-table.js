"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log("Starting HepsiBurada order table update migration...");

      // Add new fields to hepsiburada_orders table
      await queryInterface.addColumn(
        "hepsiburada_orders",
        "hepsiburadaOrderId",
        {
          type: Sequelize.STRING,
          allowNull: true,
          comment: "HepsiBurada internal order ID from API",
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "hepsiburada_orders",
        "status",
        {
          type: Sequelize.STRING,
          allowNull: true,
          comment: "Order status from HepsiBurada API (Open, Delivered, etc.)",
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "hepsiburada_orders",
        "dueDate",
        {
          type: Sequelize.DATE,
          allowNull: true,
          comment: "Due date from HepsiBurada API",
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "hepsiburada_orders",
        "barcode",
        {
          type: Sequelize.STRING,
          allowNull: true,
          comment: "Package barcode from HepsiBurada API",
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "hepsiburada_orders",
        "shippingAddressDetail",
        {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: "Detailed shipping address from HepsiBurada API",
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "hepsiburada_orders",
        "recipientName",
        {
          type: Sequelize.STRING,
          allowNull: true,
          comment: "Recipient name from HepsiBurada API",
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "hepsiburada_orders",
        "shippingCountryCode",
        {
          type: Sequelize.STRING,
          allowNull: true,
          comment: "Shipping country code from HepsiBurada API",
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "hepsiburada_orders",
        "shippingDistrict",
        {
          type: Sequelize.STRING,
          allowNull: true,
          comment: "Shipping district from HepsiBurada API",
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "hepsiburada_orders",
        "shippingTown",
        {
          type: Sequelize.STRING,
          allowNull: true,
          comment: "Shipping town from HepsiBurada API",
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "hepsiburada_orders",
        "shippingCity",
        {
          type: Sequelize.STRING,
          allowNull: true,
          comment: "Shipping city from HepsiBurada API",
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "hepsiburada_orders",
        "email",
        {
          type: Sequelize.STRING,
          allowNull: true,
          comment: "Customer email from HepsiBurada API",
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "hepsiburada_orders",
        "phoneNumber",
        {
          type: Sequelize.STRING,
          allowNull: true,
          comment: "Customer phone number from HepsiBurada API",
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "hepsiburada_orders",
        "companyName",
        {
          type: Sequelize.STRING,
          allowNull: true,
          comment: "Company name from HepsiBurada API",
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "hepsiburada_orders",
        "billingAddress",
        {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: "Billing address from HepsiBurada API",
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "hepsiburada_orders",
        "billingCity",
        {
          type: Sequelize.STRING,
          allowNull: true,
          comment: "Billing city from HepsiBurada API",
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "hepsiburada_orders",
        "billingTown",
        {
          type: Sequelize.STRING,
          allowNull: true,
          comment: "Billing town from HepsiBurada API",
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "hepsiburada_orders",
        "billingDistrict",
        {
          type: Sequelize.STRING,
          allowNull: true,
          comment: "Billing district from HepsiBurada API",
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "hepsiburada_orders",
        "billingPostalCode",
        {
          type: Sequelize.STRING,
          allowNull: true,
          comment: "Billing postal code from HepsiBurada API",
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "hepsiburada_orders",
        "billingCountryCode",
        {
          type: Sequelize.STRING,
          allowNull: true,
          comment: "Billing country code from HepsiBurada API",
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "hepsiburada_orders",
        "taxOffice",
        {
          type: Sequelize.STRING,
          allowNull: true,
          comment: "Tax office from HepsiBurada API",
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "hepsiburada_orders",
        "taxNumber",
        {
          type: Sequelize.STRING,
          allowNull: true,
          comment: "Tax number from HepsiBurada API",
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "hepsiburada_orders",
        "identityNo",
        {
          type: Sequelize.STRING,
          allowNull: true,
          comment: "Identity number from HepsiBurada API",
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "hepsiburada_orders",
        "shippingTotalPrice",
        {
          type: Sequelize.JSON,
          allowNull: true,
          comment: "Shipping total price object from HepsiBurada API",
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "hepsiburada_orders",
        "customsTotalPrice",
        {
          type: Sequelize.JSON,
          allowNull: true,
          comment: "Customs total price object from HepsiBurada API",
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "hepsiburada_orders",
        "totalPrice",
        {
          type: Sequelize.JSON,
          allowNull: true,
          comment:
            "Total price object with currency and amount from HepsiBurada API",
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "hepsiburada_orders",
        "items",
        {
          type: Sequelize.JSON,
          allowNull: true,
          comment: "Order items array from HepsiBurada API",
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "hepsiburada_orders",
        "isCargoChangable",
        {
          type: Sequelize.BOOLEAN,
          allowNull: true,
          comment: "Whether cargo is changeable from HepsiBurada API",
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "hepsiburada_orders",
        "customerName",
        {
          type: Sequelize.STRING,
          allowNull: true,
          comment: "Customer name from HepsiBurada API",
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "hepsiburada_orders",
        "estimatedArrivalDate",
        {
          type: Sequelize.DATE,
          allowNull: true,
          comment: "Estimated arrival date from HepsiBurada API",
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "hepsiburada_orders",
        "customer",
        {
          type: Sequelize.JSON,
          allowNull: true,
          comment:
            "Customer object with customerId and name from HepsiBurada API",
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "hepsiburada_orders",
        "invoice",
        {
          type: Sequelize.JSON,
          allowNull: true,
          comment:
            "Invoice object with tax details and address from HepsiBurada API",
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "hepsiburada_orders",
        "deliveryAddress",
        {
          type: Sequelize.JSON,
          allowNull: true,
          comment: "Delivery address object from HepsiBurada API",
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "hepsiburada_orders",
        "orderNote",
        {
          type: Sequelize.JSON,
          allowNull: true,
          comment: "Order note object from HepsiBurada API",
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "hepsiburada_orders",
        "rawData",
        {
          type: Sequelize.JSON,
          allowNull: true,
          comment: "Raw order data from HepsiBurada API",
        },
        { transaction }
      );

      // Add indexes for the new fields
      await queryInterface.addIndex(
        "hepsiburada_orders",
        ["hepsiburadaOrderId"],
        {
          name: "hepsiburada_orders_hepsiburada_order_id_idx",
          transaction,
        }
      );

      await queryInterface.addIndex("hepsiburada_orders", ["status"], {
        name: "hepsiburada_orders_status_idx",
        transaction,
      });

      await queryInterface.addIndex("hepsiburada_orders", ["customerName"], {
        name: "hepsiburada_orders_customer_name_idx",
        transaction,
      });

      await queryInterface.addIndex("hepsiburada_orders", ["recipientName"], {
        name: "hepsiburada_orders_recipient_name_idx",
        transaction,
      });

      await queryInterface.addIndex("hepsiburada_orders", ["barcode"], {
        name: "hepsiburada_orders_barcode_idx",
        transaction,
      });

      await queryInterface.addIndex("hepsiburada_orders", ["shippingCity"], {
        name: "hepsiburada_orders_shipping_city_idx",
        transaction,
      });

      await queryInterface.addIndex(
        "hepsiburada_orders",
        ["estimatedArrivalDate"],
        {
          name: "hepsiburada_orders_estimated_arrival_date_idx",
          transaction,
        }
      );

      await transaction.commit();
      console.log(
        "HepsiBurada order table update migration completed successfully."
      );
    } catch (error) {
      await transaction.rollback();
      console.error("HepsiBurada order table update migration failed:", error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log("Starting HepsiBurada order table rollback migration...");

      // Remove indexes first
      await queryInterface.removeIndex(
        "hepsiburada_orders",
        "hepsiburada_orders_hepsiburada_order_id_idx",
        { transaction }
      );
      await queryInterface.removeIndex(
        "hepsiburada_orders",
        "hepsiburada_orders_status_idx",
        { transaction }
      );
      await queryInterface.removeIndex(
        "hepsiburada_orders",
        "hepsiburada_orders_customer_name_idx",
        { transaction }
      );
      await queryInterface.removeIndex(
        "hepsiburada_orders",
        "hepsiburada_orders_recipient_name_idx",
        { transaction }
      );
      await queryInterface.removeIndex(
        "hepsiburada_orders",
        "hepsiburada_orders_barcode_idx",
        { transaction }
      );
      await queryInterface.removeIndex(
        "hepsiburada_orders",
        "hepsiburada_orders_shipping_city_idx",
        { transaction }
      );
      await queryInterface.removeIndex(
        "hepsiburada_orders",
        "hepsiburada_orders_estimated_arrival_date_idx",
        { transaction }
      );

      // Remove added columns
      const columnsToRemove = [
        "hepsiburadaOrderId",
        "status",
        "dueDate",
        "barcode",
        "shippingAddressDetail",
        "recipientName",
        "shippingCountryCode",
        "shippingDistrict",
        "shippingTown",
        "shippingCity",
        "email",
        "phoneNumber",
        "companyName",
        "billingAddress",
        "billingCity",
        "billingTown",
        "billingDistrict",
        "billingPostalCode",
        "billingCountryCode",
        "taxOffice",
        "taxNumber",
        "identityNo",
        "shippingTotalPrice",
        "customsTotalPrice",
        "totalPrice",
        "items",
        "isCargoChangable",
        "customerName",
        "estimatedArrivalDate",
        "customer",
        "invoice",
        "deliveryAddress",
        "orderNote",
        "rawData",
      ];

      for (const column of columnsToRemove) {
        await queryInterface.removeColumn("hepsiburada_orders", column, {
          transaction,
        });
      }

      await transaction.commit();
      console.log(
        "HepsiBurada order table rollback migration completed successfully."
      );
    } catch (error) {
      await transaction.rollback();
      console.error(
        "HepsiBurada order table rollback migration failed:",
        error
      );
      throw error;
    }
  },
};
