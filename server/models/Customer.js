const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Customer = sequelize.define(
  "Customer",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // Customer Analytics
    totalOrders: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    totalSpent: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.0,
    },
    averageOrderValue: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.0,
    },
    loyaltyScore: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100,
      },
    },
    customerType: {
      type: DataTypes.ENUM("new", "loyal", "vip"),
      defaultValue: "new",
    },
    riskLevel: {
      type: DataTypes.ENUM("low", "medium", "high"),
      defaultValue: "low",
    },
    // Dates
    firstOrderDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastOrderDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // Platform preferences
    primaryPlatform: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    platformUsage: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: "Platform usage statistics as JSON",
    },
    // Shipping information
    shippingAddresses: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: "Array of shipping addresses used by customer",
    },
    // Product preferences
    favoriteProducts: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: "Array of favorite products with purchase counts",
    },
    favoriteCategories: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: "Array of favorite product categories",
    },
    // Additional metadata
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    tags: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: "Custom tags for customer classification",
    },
    // Status
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    lastUpdated: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "customers",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["email"],
      },
      {
        fields: ["customerType"],
      },
      {
        fields: ["riskLevel"],
      },
      {
        fields: ["lastOrderDate"],
      },
      {
        fields: ["totalSpent"],
      },
      {
        fields: ["loyaltyScore"],
      },
    ],
  }
);

module.exports = Customer;
