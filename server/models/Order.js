const { DataTypes, Model } = require("sequelize");
const sequelize = require("../config/database");

class Order extends Model {}

Order.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "Users",
        key: "id",
      },
    },
    // Core order identifiers
    externalOrderId: {
      type: DataTypes.STRING,
      allowNull: false, // Changed: Made required for proper order tracking
      comment:
        "Order ID from the external platform (e.g., Trendyol order number)",
    },
    orderNumber: {
      type: DataTypes.STRING,
      allowNull: false, // Changed: Made required for display purposes
      comment: "Order number for display purposes",
    },
    // Legacy platform fields - kept for backward compatibility
    platformType: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    platform: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    platformOrderId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    platformId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // Platform connection reference
    connectionId: {
      type: DataTypes.INTEGER,
      allowNull: false, // Changed: Made required for proper platform association
      references: {
        model: "platform_connections",
        key: "id",
      },
    },
    orderDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    orderStatus: {
      type: DataTypes.ENUM(
        "new",
        "pending",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "returned",
        "failed",
        "unknown"
      ), // Enhanced: Added proper ENUM values
      allowNull: false,
      defaultValue: "new", // Changed: Better default status
    },
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: "TRY",
    },
    customerName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    customerEmail: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    customerPhone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // Shipping information
    shippingAddress: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    shippingDetailId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "shipping_details",
        key: "id",
      },
    },
    // Invoice fields - updated names for consistency
    invoiceStatus: {
      // Changed: Renamed from eInvoiceStatus for consistency
      type: DataTypes.ENUM("pending", "issued", "cancelled"),
      allowNull: true,
      defaultValue: "pending",
    },
    invoiceNumber: {
      // Added: For invoice tracking
      type: DataTypes.STRING,
      allowNull: true,
    },
    invoiceDate: {
      // Changed: Renamed from eInvoiceDate for consistency
      type: DataTypes.DATE,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    rawData: {
      type: DataTypes.JSON, // Enhanced: Changed from TEXT to JSON for better data handling
      allowNull: true,
      comment: "Raw order data from platform API",
    },
    lastSyncedAt: {
      // Added: For tracking sync status
      type: DataTypes.DATE,
      allowNull: true,
      comment: "Last time this order was synced from platform",
    },
  },
  {
    sequelize,
    modelName: "Order",
    tableName: "orders",
    timestamps: true,
    indexes: [
      {
        fields: ["userId"],
      },
      {
        fields: ["externalOrderId", "connectionId"], // Enhanced: Better unique constraint
        unique: true,
        name: "unique_external_order_per_connection",
      },
      {
        fields: ["orderStatus"],
      },
      {
        fields: ["orderDate"], // Added: For date-based queries
      },
      {
        fields: ["connectionId"], // Added: For platform-based queries
      },
      // Keep legacy index for backward compatibility
      {
        fields: ["platformOrderId", "platformId"],
        unique: false,
        name: "legacy_platform_order_index",
      },
    ],
  }
);

module.exports = Order;
