const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const PlatformData = sequelize.define(
  "PlatformData",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    entityType: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "Type of entity (product, order, etc.)",
    },
    entityId: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: "ID of the local entity",
    },
    platformType: {
      type: DataTypes.ENUM(
        "trendyol",
        "hepsiburada",
        "n11",
        "pazarama",
        "amazon",
        "csv",
        "shopify",
        "woocommerce",
        "magento",
        "etsy",
        "ebay",
        "lazada",
        "jumia",
        "shopee",
        "aliexpress",
        "cimri",
        "akakce",
        "ciceksepeti",
        "idefix"
      ),
      allowNull: false,
      comment: "Platform type",
    },
    platformEntityId: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "ID of the entity on the platform",
    },
    platformSku: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Platform-specific SKU",
    },
    platformPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: "Price on the platform",
    },
    platformQuantity: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "Quantity available on the platform",
    },
    status: {
      type: DataTypes.ENUM("active", "inactive", "syncing", "error"),
      defaultValue: "active",
      comment: "Sync status",
    },
    lastSyncedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "Last synchronization timestamp",
    },
    data: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: "Additional platform-specific data",
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "platform_data",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["entityType", "entityId", "platformType"],
        name: "platform_data_unique_entity_platform",
      },
      {
        fields: ["platformType", "platformEntityId"],
        name: "platform_data_platform_entity",
      },
      {
        fields: ["entityType", "platformType"],
        name: "platform_data_entity_type_platform",
      },
      {
        fields: ["status"],
        name: "platform_data_status",
      },
      {
        fields: ["lastSyncedAt"],
        name: "platform_data_last_synced",
      },
    ],
  }
);

module.exports = PlatformData;
