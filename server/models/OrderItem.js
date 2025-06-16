const { DataTypes, Model } = require("sequelize");
const sequelize = require("../config/database");

class OrderItem extends Model {}

OrderItem.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    orderId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "Orders",
        key: "id",
      },
    },
    productId: {
      type: DataTypes.INTEGER,
      allowNull: true, // Made optional since some orders might not have matching products
      references: {
        model: "Products",
        key: "id",
      },
    },
    platformProductId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    sku: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    barcode: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    price: {
      type: DataTypes.FLOAT(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    discount: {
      type: DataTypes.FLOAT(10, 2),
      allowNull: true,
      defaultValue: 0,
    },
    platformDiscount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      comment: "Platform discount (Trendyol tyDiscount)",
    },
    merchantDiscount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      comment: "Merchant discount (separate from platform discount)",
    },
    invoiceTotal: {
      type: DataTypes.FLOAT(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: "TRY",
    },

    // Enhanced product information from Trendyol API
    productSize: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: "Product size from Trendyol API",
    },
    productColor: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: "Product color from Trendyol API",
    },
    productCategoryId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "Product category ID from Trendyol API",
    },
    productOrigin: {
      type: DataTypes.STRING(10),
      allowNull: true,
      comment: "Product origin (important for micro export orders)",
    },
    salesCampaignId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "Sales campaign ID from Trendyol API",
    },
    lineItemStatus: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: "Individual line item status (orderLineItemStatusName)",
    },
    vatBaseAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      comment: "VAT base amount",
    },
    laborCost: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      comment: "Labor cost",
    },
    fastDeliveryOptions: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: "Fast delivery options array from Trendyol API",
    },
    discountDetails: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: "Detailed discount breakdown from Trendyol API",
    },
    variantInfo: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    rawData: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "OrderItem",
    tableName: "order_items",
    timestamps: true,
    indexes: [
      {
        fields: ["orderId"],
      },
      {
        fields: ["sku"],
      },
      {
        fields: ["barcode"],
      },
      {
        fields: ["productOrigin"], // Added: For export order queries
      },
      {
        fields: ["salesCampaignId"], // Added: For campaign tracking
      },
    ],
  }
);

module.exports = OrderItem;
