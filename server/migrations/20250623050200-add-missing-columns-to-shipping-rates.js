"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add enum type for the serviceType column
    await queryInterface.sequelize
      .query(
        `
      CREATE TYPE shipping_service_type AS ENUM (
        'STANDARD',
        'EXPRESS',
        'NEXT_DAY',
        'SAME_DAY',
        'ECONOMY'
      );
    `
      )
      .catch((error) => {
        // Ignore if enum already exists
        if (error.message.includes("already exists")) {
          console.log("shipping_service_type enum already exists");
        } else {
          throw error;
        }
      });

    // Add all missing columns in shipping_rates table

    // 1. Add serviceType column
    await queryInterface
      .addColumn("shipping_rates", "serviceType", {
        type: "shipping_service_type",
        allowNull: false,
        defaultValue: "STANDARD",
      })
      .catch((error) => {
        if (error.message.includes("already exists")) {
          console.log("serviceType column already exists");
        } else {
          throw error;
        }
      });

    // 2. Add fromCity column
    await queryInterface
      .addColumn("shipping_rates", "fromCity", {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: "Istanbul", // Providing a default value for existing rows
      })
      .catch((error) => {
        if (error.message.includes("already exists")) {
          console.log("fromCity column already exists");
        } else {
          throw error;
        }
      });

    // 3. Add fromPostalCode column
    await queryInterface
      .addColumn("shipping_rates", "fromPostalCode", {
        type: Sequelize.STRING,
        allowNull: true,
      })
      .catch((error) => {
        if (error.message.includes("already exists")) {
          console.log("fromPostalCode column already exists");
        } else {
          throw error;
        }
      });

    // 4. Add toCity column
    await queryInterface
      .addColumn("shipping_rates", "toCity", {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: "Ankara", // Providing a default value for existing rows
      })
      .catch((error) => {
        if (error.message.includes("already exists")) {
          console.log("toCity column already exists");
        } else {
          throw error;
        }
      });

    // 5. Add toPostalCode column
    await queryInterface
      .addColumn("shipping_rates", "toPostalCode", {
        type: Sequelize.STRING,
        allowNull: true,
      })
      .catch((error) => {
        if (error.message.includes("already exists")) {
          console.log("toPostalCode column already exists");
        } else {
          throw error;
        }
      });

    // 6. Add weight column
    await queryInterface
      .addColumn("shipping_rates", "weight", {
        type: Sequelize.DECIMAL(10, 3),
        allowNull: false,
        defaultValue: 1.0, // Providing a default value for existing rows
      })
      .catch((error) => {
        if (error.message.includes("already exists")) {
          console.log("weight column already exists");
        } else {
          throw error;
        }
      });

    // 7. Add dimensions column
    await queryInterface
      .addColumn("shipping_rates", "dimensions", {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: JSON.stringify({ length: 10, width: 10, height: 10 }),
      })
      .catch((error) => {
        if (error.message.includes("already exists")) {
          console.log("dimensions column already exists");
        } else {
          throw error;
        }
      });

    // 8. Add basePrice column
    await queryInterface
      .addColumn("shipping_rates", "basePrice", {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0, // Providing a default value for existing rows
      })
      .catch((error) => {
        if (error.message.includes("already exists")) {
          console.log("basePrice column already exists");
        } else {
          throw error;
        }
      });

    // 9. Add taxAmount column
    await queryInterface
      .addColumn("shipping_rates", "taxAmount", {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.0,
      })
      .catch((error) => {
        if (error.message.includes("already exists")) {
          console.log("taxAmount column already exists");
        } else {
          throw error;
        }
      });

    // 10. Add totalPrice column
    await queryInterface
      .addColumn("shipping_rates", "totalPrice", {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0, // Providing a default value for existing rows
      })
      .catch((error) => {
        if (error.message.includes("already exists")) {
          console.log("totalPrice column already exists");
        } else {
          throw error;
        }
      });

    // 11. Add currency column
    await queryInterface
      .addColumn("shipping_rates", "currency", {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: "TRY",
      })
      .catch((error) => {
        if (error.message.includes("already exists")) {
          console.log("currency column already exists");
        } else {
          throw error;
        }
      });

    // 12. Add deliveryTime column
    await queryInterface
      .addColumn("shipping_rates", "deliveryTime", {
        type: Sequelize.STRING,
        allowNull: true,
      })
      .catch((error) => {
        if (error.message.includes("already exists")) {
          console.log("deliveryTime column already exists");
        } else {
          throw error;
        }
      });

    // 13. Add deliveryDate column
    await queryInterface
      .addColumn("shipping_rates", "deliveryDate", {
        type: Sequelize.DATE,
        allowNull: true,
      })
      .catch((error) => {
        if (error.message.includes("already exists")) {
          console.log("deliveryDate column already exists");
        } else {
          throw error;
        }
      });

    // 14. Add cashOnDelivery column
    await queryInterface
      .addColumn("shipping_rates", "cashOnDelivery", {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      })
      .catch((error) => {
        if (error.message.includes("already exists")) {
          console.log("cashOnDelivery column already exists");
        } else {
          throw error;
        }
      });

    // 15. Add codFee column
    await queryInterface
      .addColumn("shipping_rates", "codFee", {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.0,
      })
      .catch((error) => {
        if (error.message.includes("already exists")) {
          console.log("codFee column already exists");
        } else {
          throw error;
        }
      });

    // 16. Add insurance column
    await queryInterface
      .addColumn("shipping_rates", "insurance", {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      })
      .catch((error) => {
        if (error.message.includes("already exists")) {
          console.log("insurance column already exists");
        } else {
          throw error;
        }
      });

    // 17. Add insuranceFee column
    await queryInterface
      .addColumn("shipping_rates", "insuranceFee", {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.0,
      })
      .catch((error) => {
        if (error.message.includes("already exists")) {
          console.log("insuranceFee column already exists");
        } else {
          throw error;
        }
      });

    // 18. Add additionalServices column
    await queryInterface
      .addColumn("shipping_rates", "additionalServices", {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: "{}",
      })
      .catch((error) => {
        if (error.message.includes("already exists")) {
          console.log("additionalServices column already exists");
        } else {
          throw error;
        }
      });

    // 19. Add rateValidUntil column
    await queryInterface
      .addColumn("shipping_rates", "rateValidUntil", {
        type: Sequelize.DATE,
        allowNull: true,
      })
      .catch((error) => {
        if (error.message.includes("already exists")) {
          console.log("rateValidUntil column already exists");
        } else {
          throw error;
        }
      });

    // 20. Add calculatedAt column
    await queryInterface
      .addColumn("shipping_rates", "calculatedAt", {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      })
      .catch((error) => {
        if (error.message.includes("already exists")) {
          console.log("calculatedAt column already exists");
        } else {
          throw error;
        }
      });

    // 21. Add isSelected column
    await queryInterface
      .addColumn("shipping_rates", "isSelected", {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      })
      .catch((error) => {
        if (error.message.includes("already exists")) {
          console.log("isSelected column already exists");
        } else {
          throw error;
        }
      });

    // 22. Add carrierResponse column
    await queryInterface
      .addColumn("shipping_rates", "carrierResponse", {
        type: Sequelize.JSON,
        allowNull: true,
      })
      .catch((error) => {
        if (error.message.includes("already exists")) {
          console.log("carrierResponse column already exists");
        } else {
          throw error;
        }
      });

    // 23. Add errorMessage column
    await queryInterface
      .addColumn("shipping_rates", "errorMessage", {
        type: Sequelize.TEXT,
        allowNull: true,
      })
      .catch((error) => {
        if (error.message.includes("already exists")) {
          console.log("errorMessage column already exists");
        } else {
          throw error;
        }
      });

    // Create the orderId index that was failing
    await queryInterface
      .addIndex("shipping_rates", ["orderId"], {
        name: "shipping_rates_order_id",
      })
      .catch((error) => {
        if (error.message.includes("already exists")) {
          console.log("Index shipping_rates_order_id already exists");
        } else {
          throw error;
        }
      });

    // Create other indexes defined in the model
    await queryInterface
      .addIndex("shipping_rates", ["carrierId"], {
        name: "shipping_rates_carrier_id",
      })
      .catch((error) => {
        if (error.message.includes("already exists")) {
          console.log("Index shipping_rates_carrier_id already exists");
        } else {
          throw error;
        }
      });

    await queryInterface
      .addIndex("shipping_rates", ["fromCity", "toCity"], {
        name: "shipping_rates_from_to_city",
      })
      .catch((error) => {
        if (error.message.includes("already exists")) {
          console.log("Index shipping_rates_from_to_city already exists");
        } else {
          throw error;
        }
      });

    await queryInterface
      .addIndex("shipping_rates", ["serviceType"], {
        name: "shipping_rates_service_type",
      })
      .catch((error) => {
        if (error.message.includes("already exists")) {
          console.log("Index shipping_rates_service_type already exists");
        } else {
          throw error;
        }
      });

    await queryInterface
      .addIndex("shipping_rates", ["isSelected"], {
        name: "shipping_rates_is_selected",
      })
      .catch((error) => {
        if (error.message.includes("already exists")) {
          console.log("Index shipping_rates_is_selected already exists");
        } else {
          throw error;
        }
      });

    await queryInterface
      .addIndex("shipping_rates", ["calculatedAt"], {
        name: "shipping_rates_calculated_at",
      })
      .catch((error) => {
        if (error.message.includes("already exists")) {
          console.log("Index shipping_rates_calculated_at already exists");
        } else {
          throw error;
        }
      });

    await queryInterface
      .addIndex("shipping_rates", ["rateValidUntil"], {
        name: "shipping_rates_valid_until",
      })
      .catch((error) => {
        if (error.message.includes("already exists")) {
          console.log("Index shipping_rates_valid_until already exists");
        } else {
          throw error;
        }
      });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove all indexes first
    await queryInterface
      .removeIndex("shipping_rates", "shipping_rates_order_id")
      .catch((e) => console.log("Failed to remove index:", e.message));
    await queryInterface
      .removeIndex("shipping_rates", "shipping_rates_carrier_id")
      .catch((e) => console.log("Failed to remove index:", e.message));
    await queryInterface
      .removeIndex("shipping_rates", "shipping_rates_from_to_city")
      .catch((e) => console.log("Failed to remove index:", e.message));
    await queryInterface
      .removeIndex("shipping_rates", "shipping_rates_service_type")
      .catch((e) => console.log("Failed to remove index:", e.message));
    await queryInterface
      .removeIndex("shipping_rates", "shipping_rates_is_selected")
      .catch((e) => console.log("Failed to remove index:", e.message));
    await queryInterface
      .removeIndex("shipping_rates", "shipping_rates_calculated_at")
      .catch((e) => console.log("Failed to remove index:", e.message));
    await queryInterface
      .removeIndex("shipping_rates", "shipping_rates_valid_until")
      .catch((e) => console.log("Failed to remove index:", e.message));

    // Remove all columns
    await queryInterface
      .removeColumn("shipping_rates", "serviceType")
      .catch((e) => console.log("Failed to remove column:", e.message));
    await queryInterface
      .removeColumn("shipping_rates", "fromCity")
      .catch((e) => console.log("Failed to remove column:", e.message));
    await queryInterface
      .removeColumn("shipping_rates", "fromPostalCode")
      .catch((e) => console.log("Failed to remove column:", e.message));
    await queryInterface
      .removeColumn("shipping_rates", "toCity")
      .catch((e) => console.log("Failed to remove column:", e.message));
    await queryInterface
      .removeColumn("shipping_rates", "toPostalCode")
      .catch((e) => console.log("Failed to remove column:", e.message));
    await queryInterface
      .removeColumn("shipping_rates", "weight")
      .catch((e) => console.log("Failed to remove column:", e.message));
    await queryInterface
      .removeColumn("shipping_rates", "dimensions")
      .catch((e) => console.log("Failed to remove column:", e.message));
    await queryInterface
      .removeColumn("shipping_rates", "basePrice")
      .catch((e) => console.log("Failed to remove column:", e.message));
    await queryInterface
      .removeColumn("shipping_rates", "taxAmount")
      .catch((e) => console.log("Failed to remove column:", e.message));
    await queryInterface
      .removeColumn("shipping_rates", "totalPrice")
      .catch((e) => console.log("Failed to remove column:", e.message));
    await queryInterface
      .removeColumn("shipping_rates", "currency")
      .catch((e) => console.log("Failed to remove column:", e.message));
    await queryInterface
      .removeColumn("shipping_rates", "deliveryTime")
      .catch((e) => console.log("Failed to remove column:", e.message));
    await queryInterface
      .removeColumn("shipping_rates", "deliveryDate")
      .catch((e) => console.log("Failed to remove column:", e.message));
    await queryInterface
      .removeColumn("shipping_rates", "cashOnDelivery")
      .catch((e) => console.log("Failed to remove column:", e.message));
    await queryInterface
      .removeColumn("shipping_rates", "codFee")
      .catch((e) => console.log("Failed to remove column:", e.message));
    await queryInterface
      .removeColumn("shipping_rates", "insurance")
      .catch((e) => console.log("Failed to remove column:", e.message));
    await queryInterface
      .removeColumn("shipping_rates", "insuranceFee")
      .catch((e) => console.log("Failed to remove column:", e.message));
    await queryInterface
      .removeColumn("shipping_rates", "additionalServices")
      .catch((e) => console.log("Failed to remove column:", e.message));
    await queryInterface
      .removeColumn("shipping_rates", "rateValidUntil")
      .catch((e) => console.log("Failed to remove column:", e.message));
    await queryInterface
      .removeColumn("shipping_rates", "calculatedAt")
      .catch((e) => console.log("Failed to remove column:", e.message));
    await queryInterface
      .removeColumn("shipping_rates", "isSelected")
      .catch((e) => console.log("Failed to remove column:", e.message));
    await queryInterface
      .removeColumn("shipping_rates", "carrierResponse")
      .catch((e) => console.log("Failed to remove column:", e.message));
    await queryInterface
      .removeColumn("shipping_rates", "errorMessage")
      .catch((e) => console.log("Failed to remove column:", e.message));

    // Drop enum type if it was created
    await queryInterface.sequelize
      .query("DROP TYPE IF EXISTS shipping_service_type;")
      .catch((e) => console.log("Failed to drop type:", e.message));
  },
};
