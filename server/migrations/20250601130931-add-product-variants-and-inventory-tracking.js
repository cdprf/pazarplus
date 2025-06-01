"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Create ProductVariants table
    await queryInterface.createTable("ProductVariants", {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
      },
      productId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "Products",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      sku: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      barcode: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      attributes: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: "Variant attributes like size, color, material, etc.",
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        comment: "Variant-specific price override",
      },
      costPrice: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      stockQuantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      minStockLevel: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      weight: {
        type: Sequelize.DECIMAL(10, 3),
        allowNull: true,
      },
      dimensions: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      images: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: [],
      },
      status: {
        type: Sequelize.ENUM("active", "inactive", "discontinued"),
        allowNull: false,
        defaultValue: "active",
      },
      isDefault: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: "Whether this is the default variant for the product",
      },
      sortOrder: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
    });

    // Create InventoryMovements table for tracking stock changes
    await queryInterface.createTable("InventoryMovements", {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
      },
      productId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "Products",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      variantId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "ProductVariants",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      sku: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: "SKU at the time of movement",
      },
      movementType: {
        type: Sequelize.ENUM(
          "IN_STOCK", // Initial stock entry
          "PURCHASE", // Stock purchased/received
          "SALE", // Stock sold
          "ADJUSTMENT", // Manual adjustment
          "RETURN", // Product returned
          "DAMAGE", // Damaged/lost stock
          "TRANSFER", // Transferred between locations
          "SYNC_UPDATE", // Updated from platform sync
          "RESERVATION", // Stock reserved for order
          "RELEASE" // Reserved stock released
        ),
        allowNull: false,
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: "Positive for increases, negative for decreases",
      },
      previousQuantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      newQuantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      reason: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      referenceId: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Reference to order, purchase, etc.",
      },
      referenceType: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Type of reference (order, purchase, etc.)",
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "Users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      platformType: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Platform that triggered the movement",
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: "Additional movement metadata",
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
    });

    // Create StockReservations table for order management
    await queryInterface.createTable("StockReservations", {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
      },
      productId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "Products",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      variantId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "ProductVariants",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      sku: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      orderNumber: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      orderId: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      platformType: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM("active", "confirmed", "released", "expired"),
        allowNull: false,
        defaultValue: "active",
      },
      expiresAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: "When the reservation expires",
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "Users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      reason: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
    });

    // Add indexes for performance
    await queryInterface.addIndex("ProductVariants", ["productId"]);
    await queryInterface.addIndex("ProductVariants", ["sku"]);
    await queryInterface.addIndex("ProductVariants", ["barcode"]);
    await queryInterface.addIndex("ProductVariants", ["status"]);
    await queryInterface.addIndex("ProductVariants", ["isDefault"]);

    await queryInterface.addIndex("InventoryMovements", ["productId"]);
    await queryInterface.addIndex("InventoryMovements", ["variantId"]);
    await queryInterface.addIndex("InventoryMovements", ["sku"]);
    await queryInterface.addIndex("InventoryMovements", ["movementType"]);
    await queryInterface.addIndex("InventoryMovements", ["userId"]);
    await queryInterface.addIndex("InventoryMovements", ["createdAt"]);
    await queryInterface.addIndex("InventoryMovements", [
      "referenceId",
      "referenceType",
    ]);

    await queryInterface.addIndex("StockReservations", ["productId"]);
    await queryInterface.addIndex("StockReservations", ["variantId"]);
    await queryInterface.addIndex("StockReservations", ["sku"]);
    await queryInterface.addIndex("StockReservations", ["status"]);
    await queryInterface.addIndex("StockReservations", ["userId"]);
    await queryInterface.addIndex("StockReservations", ["orderNumber"]);
    await queryInterface.addIndex("StockReservations", ["expiresAt"]);

    // Add unique constraints
    await queryInterface.addConstraint("ProductVariants", {
      fields: ["productId", "sku"],
      type: "unique",
      name: "product_variants_product_sku_unique",
    });

    // Add check constraints
    await queryInterface.addConstraint("ProductVariants", {
      fields: ["stockQuantity"],
      type: "check",
      where: {
        stockQuantity: {
          [Sequelize.Op.gte]: 0,
        },
      },
      name: "product_variants_stock_quantity_positive",
    });

    await queryInterface.addConstraint("StockReservations", {
      fields: ["quantity"],
      type: "check",
      where: {
        quantity: {
          [Sequelize.Op.gt]: 0,
        },
      },
      name: "stock_reservations_quantity_positive",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("StockReservations");
    await queryInterface.dropTable("InventoryMovements");
    await queryInterface.dropTable("ProductVariants");
  },
};
