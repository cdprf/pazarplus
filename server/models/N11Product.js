const { DataTypes, Model } = require("sequelize");
const sequelize = require("../config/database");

class N11Product extends Model {}

N11Product.init(
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
    // N11 API Response Fields
    n11ProductId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      unique: true,
      comment: "N11 Product ID from API response",
    },
    sellerId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      comment: "N11 Seller ID",
    },
    sellerNickname: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "N11 Seller Nickname",
    },
    stockCode: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "N11 Stock Code (SKU)",
    },
    title: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Product title",
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Product description HTML",
    },
    categoryId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      comment: "N11 Category ID",
    },
    productMainId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "N11 Product Main ID",
    },
    status: {
      type: DataTypes.ENUM("Active", "Inactive"),
      allowNull: true,
      comment: "N11 Product Status",
    },
    saleStatus: {
      type: DataTypes.ENUM("Active", "Inactive", "Out_Of_Stock", "Suspended"),
      allowNull: true,
      comment: "N11 Product Sale Status",
    },
    preparingDay: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "N11 Product Preparing Days",
    },
    shipmentTemplate: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "N11 Shipment Template",
    },
    maxPurchaseQuantity: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "N11 Max Purchase Quantity",
    },
    catalogId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      comment: "N11 Catalog ID",
    },
    barcode: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Product barcode",
    },
    groupId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      comment: "N11 Group ID",
    },
    currencyType: {
      type: DataTypes.STRING(3),
      allowNull: true,
      defaultValue: "TL",
      comment: "N11 Currency Type",
    },
    salePrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: "N11 Sale Price",
    },
    listPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: "N11 List Price",
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "N11 Stock Quantity",
    },
    attributes: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: "N11 Product Attributes Array",
    },
    imageUrls: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: "N11 Product Image URLs Array",
    },
    vatRate: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "N11 VAT Rate",
    },
    commissionRate: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "N11 Commission Rate",
    },
    // Local tracking fields
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
    modelName: "N11Product",
    tableName: "n11_products",
    timestamps: true,
    indexes: [
      {
        fields: ["productId"],
        name: "n11_products_product_id_idx",
      },
      {
        fields: ["n11ProductId"],
        unique: true,
        name: "n11_products_n11_product_id_unique",
      },
      {
        fields: ["stockCode"],
        name: "n11_products_stock_code_idx",
      },
      {
        fields: ["status"],
        name: "n11_products_status_idx",
      },
      {
        fields: ["saleStatus"],
        name: "n11_products_sale_status_idx",
      },
      {
        fields: ["lastSyncedAt"],
        name: "n11_products_last_synced_at_idx",
      },
    ],
  }
);

module.exports = N11Product;
