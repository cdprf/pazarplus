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
      type: DataTypes.UUID, // Match User model's UUID
      allowNull: false,
      references: {
        model: "Users",
        key: "id",
      },
    },
    // Add missing fields that the controller expects
    externalOrderId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    orderNumber: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    platformType: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    platform: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // Fix: Make these nullable initially to avoid validation errors
    platformOrderId: {
      type: DataTypes.STRING,
      allowNull: true, // Changed from false to true
    },
    platformId: {
      type: DataTypes.STRING,
      allowNull: true, // Changed from false to true
    },
    connectionId: {
      type: DataTypes.INTEGER,
      allowNull: true,
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
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "pending",
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
    // Add shipping address field that controller expects
    shippingAddress: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    shippingDetailId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    // Add e-invoice fields that controller uses
    eInvoiceStatus: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    eInvoiceDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    notes: {
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
    modelName: "Order",
    tableName: "orders",
    timestamps: true,
    indexes: [
      {
        fields: ["userId"],
      },
      {
        fields: ["platformOrderId", "platformId"],
        unique: false, // Changed from true to false to avoid conflicts
      },
      {
        fields: ["orderStatus"], // Fixed: changed from status to orderStatus
      },
    ],
  }
);

module.exports = Order;
