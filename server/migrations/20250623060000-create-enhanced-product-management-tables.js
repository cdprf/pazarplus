module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log(
      "Starting migration: Create enhanced product management tables"
    );

    // Create main_products table
    await queryInterface.createTable("main_products", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      baseSku: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      category: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      brand: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      productType: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      basePrice: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      currency: {
        type: Sequelize.STRING(3),
        allowNull: false,
        defaultValue: "TRY",
      },
      dimensions: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      weight: {
        type: Sequelize.DECIMAL(8, 3),
        allowNull: true,
      },
      sharedStock: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: JSON.stringify({
          totalStock: 0,
          reservedStock: 0,
          availableStock: 0,
          lowStockThreshold: 10,
          trackStock: true,
        }),
      },
      status: {
        type: Sequelize.ENUM("active", "inactive", "draft", "archived"),
        allowNull: false,
        defaultValue: "draft",
      },
      patternData: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      mediaAssets: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: JSON.stringify({
          images: [],
          videos: [],
          documents: [],
        }),
      },
      platformLearning: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      seoData: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      analytics: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: JSON.stringify({
          totalVariants: 0,
          publishedPlatforms: [],
          lastSyncAt: null,
          performance: {},
        }),
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: "{}",
      },
      lastSyncedAt: {
        type: Sequelize.DATE,
        allowNull: true,
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

    // Create platform_variants table
    await queryInterface.createTable("platform_variants", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      mainProductId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "main_products",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      platform: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      platformSku: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      platformBarcode: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      platformTitle: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      platformDescription: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      platformCategory: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      platformPrice: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      platformCurrency: {
        type: Sequelize.STRING(3),
        allowNull: true,
        defaultValue: "TRY",
      },
      platformSpecificData: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: "{}",
      },
      publishingData: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: JSON.stringify({
          isPublished: false,
          publishedAt: null,
          lastPublishAttempt: null,
          publishingErrors: [],
          platformProductId: null,
        }),
      },
      variantMediaAssets: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: JSON.stringify({
          images: [],
          videos: [],
          documents: [],
        }),
      },
      status: {
        type: Sequelize.ENUM(
          "draft",
          "ready",
          "published",
          "error",
          "archived"
        ),
        allowNull: false,
        defaultValue: "draft",
      },
      syncData: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: "{}",
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

    // Create indexes for main_products
    await queryInterface.addIndex("main_products", ["userId"], {
      name: "main_products_user_id_idx",
    });
    await queryInterface.addIndex("main_products", ["baseSku"], {
      name: "main_products_base_sku_idx",
      unique: true,
    });
    await queryInterface.addIndex("main_products", ["status"], {
      name: "main_products_status_idx",
    });
    await queryInterface.addIndex("main_products", ["category"], {
      name: "main_products_category_idx",
    });
    await queryInterface.addIndex("main_products", ["brand"], {
      name: "main_products_brand_idx",
    });
    await queryInterface.addIndex("main_products", ["createdAt"], {
      name: "main_products_created_at_idx",
    });

    // Create indexes for platform_variants
    await queryInterface.addIndex("platform_variants", ["mainProductId"], {
      name: "platform_variants_main_product_id_idx",
    });
    await queryInterface.addIndex("platform_variants", ["platform"], {
      name: "platform_variants_platform_idx",
    });
    await queryInterface.addIndex("platform_variants", ["platformSku"], {
      name: "platform_variants_platform_sku_idx",
    });
    await queryInterface.addIndex(
      "platform_variants",
      ["platform", "platformSku"],
      {
        name: "platform_variants_platform_sku_unique_idx",
        unique: true,
      }
    );
    await queryInterface.addIndex("platform_variants", ["status"], {
      name: "platform_variants_status_idx",
    });
    await queryInterface.addIndex("platform_variants", ["createdAt"], {
      name: "platform_variants_created_at_idx",
    });

    console.log(
      "Finished migration: Created enhanced product management tables"
    );
  },

  down: async (queryInterface, Sequelize) => {
    console.log("Starting rollback: Drop enhanced product management tables");

    // Drop tables in reverse order due to foreign key constraints
    await queryInterface.dropTable("platform_variants");
    await queryInterface.dropTable("main_products");

    console.log(
      "Finished rollback: Dropped enhanced product management tables"
    );
  },
};
