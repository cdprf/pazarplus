const { DataTypes, Model } = require("sequelize");
const sequelize = require("../config/database");

/**
 * Platform Variant Model
 * Represents platform-specific variants of a main product
 */
class PlatformVariant extends Model {}

PlatformVariant.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    mainProductId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "main_products",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },

    // Platform Information
    platform: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [
          [
            "trendyol",
            "hepsiburada",
            "n11",
            "amazon",
            "gittigidiyor",
            "custom",
          ],
        ],
      },
      comment: "Target platform for this variant",
    },
    platformSku: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 100],
      },
      comment: "Platform-specific SKU",
    },
    platformBarcode: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: [0, 100],
      },
      comment: "Platform-specific barcode",
    },
    variantSuffix: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: [0, 20],
      },
      comment: "Suffix added to base SKU (e.g., TR, UK, ORJ)",
    },

    // Pricing Configuration
    useMainPrice: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: "Whether to inherit price from main product",
    },
    platformPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      validate: {
        min: 0,
      },
      comment: "Platform-specific price override",
    },
    platformCostPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      validate: {
        min: 0,
      },
    },
    priceMarkup: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      comment: "Markup percentage for this platform",
    },

    // Platform-specific Information
    platformAttributes: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: "Platform-specific attributes and fields",
    },
    platformCategory: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Platform-specific category",
    },
    platformCategoryId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Platform category ID",
    },
    platformTitle: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: [0, 500],
      },
      comment: "Platform-specific product title",
    },
    platformDescription: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Platform-specific description",
    },

    // Media Management
    useMainMedia: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: "Whether to inherit media from main product",
    },
    platformMedia: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      comment: "Platform-specific media files",
    },
    mediaTransformations: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: "Platform-specific media transformations/optimizations",
    },

    // Publication Status
    isPublished: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: "Whether this variant is published to the platform",
    },
    publishedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "When this variant was first published",
    },
    lastSyncAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "Last successful sync with platform",
    },
    syncStatus: {
      type: DataTypes.ENUM(
        "pending",
        "syncing",
        "success",
        "error",
        "conflict"
      ),
      allowNull: false,
      defaultValue: "pending",
    },
    syncError: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Last sync error message",
    },

    // Platform External IDs
    externalId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Platform's internal product ID",
    },
    externalUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "URL to product on platform",
    },

    // Template Usage
    templateId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "platform_templates",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
      comment: "Template used for this variant",
    },
    templateFields: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: "Template field values",
    },

    // Variant Configuration
    isDefault: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: "Whether this is the default variant for the platform",
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "Display order among variants",
    },

    // Status
    status: {
      type: DataTypes.ENUM("active", "inactive", "draft", "error"),
      allowNull: false,
      defaultValue: "draft",
    },

    // Auto-Learning Data
    learnedFromProduct: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: "Original product this variant was learned from",
    },
    learningConfidence: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: true,
      validate: {
        min: 0,
        max: 1,
      },
      comment: "Confidence score for auto-learned data",
    },

    // Performance Metrics
    conversionRate: {
      type: DataTypes.DECIMAL(5, 4),
      allowNull: true,
      comment: "Platform-specific conversion rate",
    },
    avgRating: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: true,
      comment: "Average rating on platform",
    },
    totalSales: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "Total units sold on this platform",
    },
  },
  {
    sequelize,
    modelName: "PlatformVariant",
    tableName: "platform_variants",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["mainProductId", "platform"],
        name: "platform_variants_main_product_platform_unique",
      },
      {
        fields: ["platform"],
      },
      {
        fields: ["platformSku"],
      },
      {
        fields: ["isPublished"],
      },
      {
        fields: ["syncStatus"],
      },
      {
        fields: ["status"],
      },
      {
        fields: ["externalId"],
      },
      {
        fields: ["templateId"],
      },
    ],
    hooks: {
      beforeValidate: async (variant) => {
        // Ensure only one default variant per platform for each main product
        if (variant.isDefault && variant.changed("isDefault")) {
          await PlatformVariant.update(
            { isDefault: false },
            {
              where: {
                mainProductId: variant.mainProductId,
                platform: variant.platform,
                id: { [sequelize.Sequelize.Op.ne]: variant.id },
              },
            }
          );
        }

        // Auto-generate platform SKU if not provided
        if (!variant.platformSku && variant.mainProduct) {
          const suffix =
            variant.variantSuffix || variant.platform.toUpperCase();
          variant.platformSku = `${variant.mainProduct.baseSku}-${suffix}`;
        }
      },

      afterUpdate: async (variant) => {
        // Update main product sync status
        if (variant.changed("syncStatus") || variant.changed("isPublished")) {
          const { MainProduct } = require("./index");
          const mainProduct = await MainProduct.findByPk(variant.mainProductId);
          if (mainProduct) {
            await mainProduct.update({ lastSyncedAt: new Date() });
          }
        }
      },
    },
  }
);

// PlatformVariant associations
PlatformVariant.associate = function (models) {
  PlatformVariant.belongsTo(models.MainProduct, {
    foreignKey: "mainProductId",
    as: "mainProduct",
  });

  PlatformVariant.belongsTo(models.PlatformTemplate, {
    foreignKey: "templateId",
    as: "template",
  });

  PlatformVariant.hasMany(models.PlatformData, {
    foreignKey: "entityId",
    constraints: false,
    scope: {
      entityType: "platform_variant",
    },
    as: "platformData",
  });

  PlatformVariant.hasMany(models.InventoryMovement, {
    foreignKey: "platformVariantId",
    as: "inventoryMovements",
  });
};

module.exports = PlatformVariant;
