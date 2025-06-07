"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create TrendyolProduct table
    await queryInterface.createTable("trendyol_products", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      productId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "products",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      trendyolProductId: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
        index: true,
        comment: "Trendyol product ID",
      },
      trendyolSku: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Trendyol-specific SKU",
      },
      barcode: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Product barcode for Trendyol",
      },
      categoryId: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Trendyol category ID",
      },
      brandId: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Trendyol brand ID",
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: "Product title on Trendyol",
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: "Product description on Trendyol",
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        comment: "Product price on Trendyol",
      },
      salePrice: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        comment: "Sale price on Trendyol",
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: "Available quantity on Trendyol",
      },
      images: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: [],
        comment: "Product images for Trendyol",
      },
      attributes: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: {},
        comment: "Trendyol-specific product attributes",
      },
      approved: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: "Product approval status on Trendyol",
      },
      rejected: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: "Product rejection status on Trendyol",
      },
      blockedByPartner: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: "Blocked by partner status",
      },
      hasActiveCampaign: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: "Has active campaign on Trendyol",
      },
      platformFee: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        comment: "Platform commission fee percentage",
      },
      status: {
        type: Sequelize.ENUM(
          "active",
          "inactive",
          "syncing",
          "error",
          "pending"
        ),
        allowNull: false,
        defaultValue: "pending",
        comment: "Product status on Trendyol",
      },
      lastSyncedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: "Last synchronization timestamp",
      },
      syncErrors: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: "Synchronization error details",
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Create HepsiburadaProduct table
    await queryInterface.createTable("hepsiburada_products", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      productId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "products",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      hepsiburadaProductId: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
        index: true,
        comment: "Hepsiburada product ID",
      },
      hepsiburadaSku: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Hepsiburada-specific SKU",
      },
      barcode: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Product barcode for Hepsiburada",
      },
      categoryId: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Hepsiburada category ID",
      },
      brandId: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Hepsiburada brand ID",
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: "Product title on Hepsiburada",
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: "Product description on Hepsiburada",
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        comment: "Product price on Hepsiburada",
      },
      salePrice: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        comment: "Sale price on Hepsiburada",
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: "Available quantity on Hepsiburada",
      },
      images: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: [],
        comment: "Product images for Hepsiburada",
      },
      attributes: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: {},
        comment: "Hepsiburada-specific product attributes",
      },
      approved: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: "Product approval status on Hepsiburada",
      },
      rejected: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: "Product rejection status on Hepsiburada",
      },
      deliveryOption: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Delivery option on Hepsiburada",
      },
      platformFee: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        comment: "Platform commission fee percentage",
      },
      status: {
        type: Sequelize.ENUM(
          "active",
          "inactive",
          "syncing",
          "error",
          "pending"
        ),
        allowNull: false,
        defaultValue: "pending",
        comment: "Product status on Hepsiburada",
      },
      lastSyncedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: "Last synchronization timestamp",
      },
      syncErrors: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: "Synchronization error details",
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Create N11Product table
    await queryInterface.createTable("n11_products", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      productId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "products",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      n11ProductId: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
        index: true,
        comment: "N11 product ID",
      },
      n11Sku: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "N11-specific SKU",
      },
      barcode: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Product barcode for N11",
      },
      categoryId: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "N11 category ID",
      },
      brandId: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "N11 brand ID",
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: "Product title on N11",
      },
      subtitle: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Product subtitle on N11",
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: "Product description on N11",
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        comment: "Product price on N11",
      },
      salePrice: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        comment: "Sale price on N11",
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: "Available quantity on N11",
      },
      images: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: [],
        comment: "Product images for N11",
      },
      attributes: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: {},
        comment: "N11-specific product attributes",
      },
      approved: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: "Product approval status on N11",
      },
      rejected: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: "Product rejection status on N11",
      },
      preparingDay: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: "Preparing days for N11",
      },
      deliveryType: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Delivery type on N11",
      },
      platformFee: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        comment: "Platform commission fee percentage",
      },
      status: {
        type: Sequelize.ENUM(
          "active",
          "inactive",
          "syncing",
          "error",
          "pending"
        ),
        allowNull: false,
        defaultValue: "pending",
        comment: "Product status on N11",
      },
      lastSyncedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: "Last synchronization timestamp",
      },
      syncErrors: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: "Synchronization error details",
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Add indexes for better performance
    await queryInterface.addIndex("trendyol_products", ["productId"], {
      name: "trendyol_products_product_id_idx",
    });
    await queryInterface.addIndex("trendyol_products", ["status"], {
      name: "trendyol_products_status_idx",
    });
    await queryInterface.addIndex("trendyol_products", ["lastSyncedAt"], {
      name: "trendyol_products_last_synced_at_idx",
    });

    await queryInterface.addIndex("hepsiburada_products", ["productId"], {
      name: "hepsiburada_products_product_id_idx",
    });
    await queryInterface.addIndex("hepsiburada_products", ["status"], {
      name: "hepsiburada_products_status_idx",
    });
    await queryInterface.addIndex("hepsiburada_products", ["lastSyncedAt"], {
      name: "hepsiburada_products_last_synced_at_idx",
    });

    await queryInterface.addIndex("n11_products", ["productId"], {
      name: "n11_products_product_id_idx",
    });
    await queryInterface.addIndex("n11_products", ["status"], {
      name: "n11_products_status_idx",
    });
    await queryInterface.addIndex("n11_products", ["lastSyncedAt"], {
      name: "n11_products_last_synced_at_idx",
    });
  },

  async down(queryInterface, Sequelize) {
    // Drop the tables in reverse order
    await queryInterface.dropTable("n11_products");
    await queryInterface.dropTable("hepsiburada_products");
    await queryInterface.dropTable("trendyol_products");
  },
};
