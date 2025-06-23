"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if the table exists
    const tableExists = await queryInterface
      .describeTable("trendyol_products")
      .catch(() => false);

    if (!tableExists) {
      // Create the table if it doesn't exist
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
        },
        externalProductId: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        barcode: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        title: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        brand: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        brandId: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        categoryName: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        categoryId: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        quantity: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        stockCode: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        dimensionalWeight: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: true,
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        currencyType: {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: "TRY",
        },
        listPrice: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
        },
        salePrice: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: true,
        },
        vatRate: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        images: {
          type: Sequelize.TEXT,
          allowNull: true,
          defaultValue: "[]",
        },
        attributes: {
          type: Sequelize.TEXT,
          allowNull: true,
          defaultValue: "[]",
        },
        approved: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        rejected: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        blockedByPartner: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        hasActiveCampaign: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        archived: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        blacklisted: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        locked: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        onSale: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        hasHtmlContent: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        productUrl: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        productCode: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        productContentId: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        productMainId: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        pimCategoryId: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        supplierId: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        platformListingId: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        status: {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: "pending",
        },
        lastSyncedAt: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        syncErrors: {
          type: Sequelize.JSON,
          allowNull: true,
        },
        createDateTime: {
          type: Sequelize.BIGINT,
          allowNull: true,
        },
        lastUpdateDate: {
          type: Sequelize.BIGINT,
          allowNull: true,
        },
        rejectReasonDetails: {
          type: Sequelize.TEXT,
          allowNull: true,
          defaultValue: "[]",
        },
        stockUnitType: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        rawData: {
          type: Sequelize.JSON,
          allowNull: true,
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
        },
      });
    } else {
      // Add missing columns if table exists
      const columnExists = async (columnName) => {
        try {
          const description = await queryInterface.describeTable(
            "trendyol_products"
          );
          return description[columnName] !== undefined;
        } catch (error) {
          return false;
        }
      };

      // Check and add externalProductId column if missing
      if (!(await columnExists("externalProductId"))) {
        await queryInterface.addColumn(
          "trendyol_products",
          "externalProductId",
          {
            type: Sequelize.STRING,
            allowNull: true,
            comment: "External product identifier (productCode from API)",
          }
        );
      }

      // Check and add stockCode column if missing
      if (!(await columnExists("stockCode"))) {
        await queryInterface.addColumn("trendyol_products", "stockCode", {
          type: Sequelize.STRING,
          allowNull: true,
          comment: "Stock code (merchant SKU)",
        });
      }

      // Check and add other missing columns from the API response
      if (!(await columnExists("productCode"))) {
        await queryInterface.addColumn("trendyol_products", "productCode", {
          type: Sequelize.STRING,
          allowNull: true,
          comment: "Trendyol product code",
        });
      }

      if (!(await columnExists("productContentId"))) {
        await queryInterface.addColumn(
          "trendyol_products",
          "productContentId",
          {
            type: Sequelize.STRING,
            allowNull: true,
            comment: "Trendyol product content ID",
          }
        );
      }

      if (!(await columnExists("productMainId"))) {
        await queryInterface.addColumn("trendyol_products", "productMainId", {
          type: Sequelize.STRING,
          allowNull: true,
          comment: "Trendyol product main ID",
        });
      }

      if (!(await columnExists("pimCategoryId"))) {
        await queryInterface.addColumn("trendyol_products", "pimCategoryId", {
          type: Sequelize.STRING,
          allowNull: true,
          comment: "Trendyol PIM category ID",
        });
      }

      if (!(await columnExists("supplierId"))) {
        await queryInterface.addColumn("trendyol_products", "supplierId", {
          type: Sequelize.STRING,
          allowNull: true,
          comment: "Trendyol supplier ID",
        });
      }

      if (!(await columnExists("platformListingId"))) {
        await queryInterface.addColumn(
          "trendyol_products",
          "platformListingId",
          {
            type: Sequelize.STRING,
            allowNull: true,
            comment: "Trendyol platform listing ID",
          }
        );
      }

      if (!(await columnExists("createDateTime"))) {
        await queryInterface.addColumn("trendyol_products", "createDateTime", {
          type: Sequelize.BIGINT,
          allowNull: true,
          comment: "Product creation datetime (ms)",
        });
      }

      if (!(await columnExists("lastUpdateDate"))) {
        await queryInterface.addColumn("trendyol_products", "lastUpdateDate", {
          type: Sequelize.BIGINT,
          allowNull: true,
          comment: "Product last update datetime (ms)",
        });
      }

      if (!(await columnExists("rejectReasonDetails"))) {
        await queryInterface.addColumn(
          "trendyol_products",
          "rejectReasonDetails",
          {
            type: Sequelize.TEXT,
            allowNull: true,
            defaultValue: "[]",
            comment: "Product reject reason details",
          }
        );
      }

      if (!(await columnExists("stockUnitType"))) {
        await queryInterface.addColumn("trendyol_products", "stockUnitType", {
          type: Sequelize.STRING,
          allowNull: true,
          comment: "Stock unit type",
        });
      }

      if (!(await columnExists("productUrl"))) {
        await queryInterface.addColumn("trendyol_products", "productUrl", {
          type: Sequelize.STRING,
          allowNull: true,
          comment: "Trendyol product URL",
        });
      }

      if (!(await columnExists("rawData"))) {
        await queryInterface.addColumn("trendyol_products", "rawData", {
          type: Sequelize.JSON,
          allowNull: true,
          comment: "Raw product data from Trendyol API",
        });
      }
    }

    // Create indexes if they don't exist (PostgreSQL compatible)
    try {
      await queryInterface.addIndex("trendyol_products", ["productId"], {
        name: "trendyol_products_product_id_idx",
      });
    } catch (error) {
      // Index might already exist
      console.log("Index trendyol_products_product_id_idx might already exist");
    }

    try {
      await queryInterface.addIndex(
        "trendyol_products",
        ["trendyolProductId"],
        {
          unique: true,
          name: "trendyol_products_trendyol_product_id_unique",
        }
      );
    } catch (error) {
      // Index might already exist
      console.log(
        "Index trendyol_products_trendyol_product_id_unique might already exist"
      );
    }

    try {
      await queryInterface.addIndex("trendyol_products", ["status"], {
        name: "trendyol_products_status_idx",
      });
    } catch (error) {
      // Index might already exist
      console.log("Index trendyol_products_status_idx might already exist");
    }

    try {
      await queryInterface.addIndex("trendyol_products", ["lastSyncedAt"], {
        name: "trendyol_products_last_synced_at_idx",
      });
    } catch (error) {
      // Index might already exist
      console.log(
        "Index trendyol_products_last_synced_at_idx might already exist"
      );
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Remove the columns added in this migration
    const columnExists = async (columnName) => {
      try {
        const description = await queryInterface.describeTable(
          "trendyol_products"
        );
        return description[columnName] !== undefined;
      } catch (error) {
        return false;
      }
    };

    const columnsToRemove = [
      "externalProductId",
      "stockCode",
      "productCode",
      "productContentId",
      "productMainId",
      "pimCategoryId",
      "supplierId",
      "platformListingId",
      "createDateTime",
      "lastUpdateDate",
      "rejectReasonDetails",
      "stockUnitType",
      "productUrl",
    ];

    for (const column of columnsToRemove) {
      if (await columnExists(column)) {
        await queryInterface.removeColumn("trendyol_products", column);
      }
    }
  },
};
