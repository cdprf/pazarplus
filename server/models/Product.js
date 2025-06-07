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

  Product.hasMany(models.ProductVariant, {
    foreignKey: "productId",
    as: "variants",
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
};

module.exports = Product;
