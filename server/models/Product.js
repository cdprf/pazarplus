const { DataTypes, Model } = require("sequelize");
const sequelize = require("../config/database");

class Product extends Model {}

Product.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 255],
      },
    },
    sku: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 100],
      },
    },
    barcode: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: "Product barcode for identification",
    },
    tecdocId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "TecDoc ID for the spare part",
    },
    oemCode: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "OEM code for the spare part",
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    category: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0,
      },
    },
    costPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      validate: {
        min: 0,
      },
    },
    stockQuantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    minStockLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    weight: {
      type: DataTypes.DECIMAL(8, 3),
      allowNull: true,
      validate: {
        min: 0,
      },
    },
    dimensions: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null,
    },
    images: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
    },
    status: {
      type: DataTypes.ENUM("active", "inactive", "draft"),
      allowNull: false,
      defaultValue: "active",
    },
    creationSource: {
      type: DataTypes.ENUM(
        "user",
        "platform_sync",
        "excel_import",
        "api_import"
      ),
      allowNull: false,
      defaultValue: "user",
      comment: "How this product was created",
    },

    // Product Sourcing
    sourcing: {
      type: DataTypes.ENUM("local", "outsource"),
      allowNull: true,
      comment: "Whether the product is sourced locally or outsourced",
    },
    platforms: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
    },
    attributes: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
    },
    tags: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    templateId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "product_templates",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
      comment: "Template used for this product",
    },
    lastSyncedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "Last time this product was synced from platforms",
    },
    hasVariants: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: "Whether this product has variants",
    },
    variantAttributes: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      comment: "Variant attribute definitions (color, size, etc.)",
    },
    sourcePlatform: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: "Original platform this product was imported from",
    },
    // Variant Detection Fields
    isVariant: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: "Whether this product is a variant of another product",
    },
    isMainProduct: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: "Whether this product is a main product with variants",
    },
    variantGroupId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: "ID linking variants to their group",
    },
    variantType: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: "Type of variant (color, size, style, etc.)",
    },
    variantValue: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: "Value of the variant (red, large, premium, etc.)",
    },
    parentProductId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "products",
        key: "id",
      },
      comment: "Parent product ID if this is a variant",
    },
    variantDetectionConfidence: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: true,
      comment: "Confidence score for variant detection (0.00-1.00)",
    },
    variantDetectionSource: {
      type: DataTypes.ENUM(
        "auto",
        "manual",
        "platform",
        "sku_analysis",
        "text_analysis"
      ),
      allowNull: true,
      comment: "Source of variant detection",
    },
    lastVariantDetectionAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "Last time variant detection was run on this product",
    },
  },
  {
    sequelize,
    modelName: "Product",
    tableName: "products",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["sku", "userId"],
      },
      {
        fields: ["userId"],
      },
      {
        fields: ["category"],
      },
      {
        fields: ["status"],
      },
      {
        fields: ["stockQuantity"],
      },
      {
        fields: ["barcode"],
      },
      {
        fields: ["isVariant"],
      },
      {
        fields: ["isMainProduct"],
      },
      {
        fields: ["variantGroupId"],
      },
      {
        fields: ["parentProductId"],
      },
    ],
    // hooks: {
    //   afterCreate: async (product) => {
    //     // If product doesn't have variants, create a default variant
    //     if (!product.hasVariants) {
    //       const { ProductVariant } = require("./index");
    //       await ProductVariant.create({
    //         productId: product.id,
    //         name: "Default",
    //         sku: product.sku,
    //         barcode: product.barcode,
    //         price: product.price,
    //         costPrice: product.costPrice,
    //         stockQuantity: product.stockQuantity,
    //         minStockLevel: product.minStockLevel,
    //         weight: product.weight,
    //         dimensions: product.dimensions,
    //         images: product.images,
    //         status: product.status,
    //         isDefault: true,
    //         sortOrder: 0,
    //       });
    //     }
    //   },
    // },
  }
);

// Product associations
Product.associate = function (models) {
  Product.belongsTo(models.User, {
    foreignKey: "userId",
    as: "user",
  });

  // Also define the reverse association
  models.User.hasMany(Product, {
    foreignKey: "userId",
    as: "products",
    onDelete: "CASCADE",
    hooks: true,
  });

  Product.hasMany(models.ProductVariant, {
    foreignKey: "productId",
    as: "variants",
    onDelete: "CASCADE",
    hooks: true,
  });

  Product.hasMany(models.InventoryMovement, {
    foreignKey: "productId",
    as: "inventoryMovements",
  });

  Product.hasMany(models.StockReservation, {
    foreignKey: "productId",
    as: "stockReservations",
  });

  Product.hasMany(models.PlatformData, {
    foreignKey: "entityId",
    constraints: false,
    scope: {
      entityType: "product",
    },
    as: "platformData",
  });

  // Define the reverse association
  models.PlatformData.belongsTo(Product, {
    foreignKey: "entityId",
    constraints: false,
    as: "product",
  });

  Product.hasMany(models.PlatformVariant, {
    foreignKey: "productId",
    as: "platformVariants",
    onDelete: "SET NULL",
  });

  // Customer Questions association
  Product.hasMany(models.CustomerQuestion, {
    foreignKey: "product_main_id",
    sourceKey: "sku", // Link from Product.sku to CustomerQuestion.product_main_id
    as: "customerQuestions",
    constraints: false,
  });

  // Associations for Spare Parts
  Product.belongsToMany(models.Vehicle, {
    through: "part_compatibilities",
    foreignKey: "productId",
    otherKey: "vehicleId",
    as: "compatibleVehicles",
  });

  Product.hasMany(models.SupplierPrice, {
    foreignKey: "productId",
    as: "supplierPrices",
  });
};

module.exports = Product;
