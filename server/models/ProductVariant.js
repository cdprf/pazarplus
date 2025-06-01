const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const ProductVariant = sequelize.define(
    "ProductVariant",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      productId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "Products",
          key: "id",
        },
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
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
          notEmpty: true,
          len: [1, 100],
        },
      },
      barcode: {
        type: DataTypes.STRING(100),
        allowNull: true,
        validate: {
          len: [0, 100],
        },
      },
      attributes: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {},
        comment: "Variant attributes like size, color, material, etc.",
      },
      price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        validate: {
          min: 0,
        },
        comment: "Variant-specific price override",
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
        type: DataTypes.DECIMAL(10, 3),
        allowNull: true,
        validate: {
          min: 0,
        },
      },
      dimensions: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {},
      },
      images: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
      },
      status: {
        type: DataTypes.ENUM("active", "inactive", "discontinued"),
        allowNull: false,
        defaultValue: "active",
      },
      isDefault: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: "Whether this is the default variant for the product",
      },
      sortOrder: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      tableName: "ProductVariants",
      indexes: [
        {
          fields: ["productId"],
        },
        {
          fields: ["sku"],
        },
        {
          fields: ["barcode"],
        },
        {
          fields: ["status"],
        },
        {
          fields: ["isDefault"],
        },
        {
          unique: true,
          fields: ["productId", "sku"],
          name: "product_variants_product_sku_unique",
        },
      ],
      hooks: {
        beforeValidate: (variant) => {
          // Ensure only one default variant per product
          if (variant.isDefault && variant.changed("isDefault")) {
            return ProductVariant.update(
              { isDefault: false },
              {
                where: {
                  productId: variant.productId,
                  id: { [sequelize.Sequelize.Op.ne]: variant.id },
                },
              }
            );
          }
        },
      },
    }
  );

  ProductVariant.associate = function (models) {
    ProductVariant.belongsTo(models.Product, {
      foreignKey: "productId",
      as: "product",
    });

    ProductVariant.hasMany(models.InventoryMovement, {
      foreignKey: "variantId",
      as: "inventoryMovements",
    });

    ProductVariant.hasMany(models.StockReservation, {
      foreignKey: "variantId",
      as: "stockReservations",
    });

    ProductVariant.hasMany(models.PlatformData, {
      foreignKey: "entityId",
      constraints: false,
      scope: {
        entityType: "variant",
      },
      as: "platformData",
    });
  };

  return ProductVariant;
};
