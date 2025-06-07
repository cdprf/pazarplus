const { DataTypes, Model } = require("sequelize");
const sequelize = require("../config/database");

class HepsiburadaProduct extends Model {}

HepsiburadaProduct.init(
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
        model: "products",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    merchantSku: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "Merchant SKU (unique identifier for the seller)",
    },
    barcode: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "Product barcode (GTIN/EAN/UPC)",
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "Product title",
    },
    brand: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "Brand name",
    },
    categoryId: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "Hepsiburada category ID",
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: "Product description",
    },
    attributes: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: "Product attributes as key-value pairs",
    },
    images: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
      comment: "Array of image URLs",
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: "Product price",
    },
    stock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "Stock quantity",
    },
    vatRate: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "VAT rate (%)",
    },
    cargoCompany1Id: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Primary cargo company ID",
    },
    cargoCompany2Id: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Secondary cargo company ID",
    },
    deliveryDuration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "Delivery duration (days)",
    },
    status: {
      type: DataTypes.ENUM("active", "inactive", "syncing", "error", "pending"),
      allowNull: false,
      defaultValue: "pending",
      comment: "Product status on Hepsiburada",
    },
    lastSyncedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "Last synchronization timestamp",
    },
    syncErrors: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: "Synchronization error details",
    },
  },
  {
    sequelize,
    modelName: "HepsiburadaProduct",
    tableName: "hepsiburada_products",
    timestamps: true,
    indexes: [
      {
        fields: ["productId"],
        name: "hepsiburada_products_product_id_idx",
      },
      {
        fields: ["merchantSku"],
        name: "hepsiburada_products_merchant_sku_idx",
      },
      {
        fields: ["barcode"],
        name: "hepsiburada_products_barcode_idx",
      },
      {
        fields: ["status"],
        name: "hepsiburada_products_status_idx",
      },
      {
        fields: ["lastSyncedAt"],
        name: "hepsiburada_products_last_synced_at_idx",
      },
    ],
  }
);

module.exports = HepsiburadaProduct;
