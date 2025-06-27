const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const PlatformConnection = sequelize.define(
  "PlatformConnection",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.UUID, // Fixed: Changed from INTEGER to UUID to match User model
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
    },
    platformType: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [
          [
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
            "idefix",
          ],
        ],
      },
    },
    platformName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    credentials: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    environment: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "production",
      validate: {
        isIn: [["test", "sandbox", "staging", "production"]],
      },
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: "active",
      validate: {
        isIn: [
          ["active", "inactive", "error", "pending", "testing", "suspended"],
        ],
      },
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    isDefault: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: "Whether this is the default connection for this platform type",
    },
    lastTestedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "When the connection was last tested",
    },
    lastSyncAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "When data was last synced from this platform",
    },
    syncInterval: {
      type: DataTypes.INTEGER,
      defaultValue: 300, // 5 minutes in seconds
      comment: "Sync interval in seconds",
    },
    autoSync: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: "Whether automatic sync is enabled",
    },
    rateLimitInfo: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: "Rate limit information from the platform",
    },
    lastError: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Last error message encountered",
    },
    errorCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: "Number of consecutive errors",
    },
    maxRetries: {
      type: DataTypes.INTEGER,
      defaultValue: 3,
      comment: "Maximum number of retries for failed requests",
    },
    webhookUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Webhook URL for receiving platform notifications",
    },
    webhookSecret: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Secret for webhook verification",
    },
    supportedFeatures: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: "List of supported features for this connection",
    },
    platformMetadata: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: "Platform-specific metadata and configuration",
    },
    settings: {
      type: DataTypes.JSON,
      defaultValue: {},
    },
    tags: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: "Tags for organizing connections",
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Description or notes about this connection",
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "When the connection credentials expire (if applicable)",
    },
    notificationSettings: {
      type: DataTypes.JSON,
      defaultValue: {
        onError: true,
        onSync: false,
        onOrderUpdate: true,
        onConnectionExpiry: true,
      },
      comment: "Notification preferences for this connection",
    },
  },
  {
    tableName: "platform_connections",
    timestamps: true,
    indexes: [
      {
        unique: false,
        fields: ["userId"],
      },
      {
        unique: false,
        fields: ["platformType"],
      },
      {
        unique: false,
        fields: ["status"],
      },
      {
        unique: false,
        fields: ["environment"],
      },
    ],
    hooks: {
      beforeCreate: async (connection) => {
        // If this is marked as default, unset other defaults for this user/platform
        if (connection.isDefault) {
          await PlatformConnection.update(
            { isDefault: false },
            {
              where: {
                userId: connection.userId,
                platformType: connection.platformType,
                isDefault: true,
              },
            }
          );
        }
      },
      beforeUpdate: async (connection) => {
        // If this is being set as default, unset other defaults for this user/platform
        if (connection.changed("isDefault") && connection.isDefault) {
          await PlatformConnection.update(
            { isDefault: false },
            {
              where: {
                userId: connection.userId,
                platformType: connection.platformType,
                isDefault: true,
                id: { [sequelize.Sequelize.Op.ne]: connection.id },
              },
            }
          );
        }
      },
    },
  }
);

// Instance methods
PlatformConnection.prototype.isExpired = function () {
  return this.expiresAt && new Date() > this.expiresAt;
};

PlatformConnection.prototype.needsSync = function () {
  if (!this.autoSync || !this.isActive) return false;
  if (!this.lastSyncAt) return true;

  const nextSync = new Date(
    this.lastSyncAt.getTime() + this.syncInterval * 1000
  );
  return new Date() >= nextSync;
};

PlatformConnection.prototype.incrementErrorCount = async function () {
  this.errorCount = (this.errorCount || 0) + 1;

  // Auto-suspend after too many consecutive errors
  if (this.errorCount >= 10) {
    this.status = "suspended";
  }

  await this.save();
};

PlatformConnection.prototype.resetErrorCount = async function () {
  if (this.errorCount > 0) {
    this.errorCount = 0;
    this.lastError = null;

    // Reactivate if it was suspended due to errors
    if (this.status === "suspended") {
      this.status = "active";
    }

    await this.save();
  }
};

// Class methods
PlatformConnection.getDefaultConnection = async function (
  userId,
  platformType
) {
  return await this.findOne({
    where: {
      userId,
      platformType,
      isDefault: true,
      isActive: true,
    },
  });
};

PlatformConnection.getActiveConnections = async function (
  userId,
  platformType = null
) {
  const where = {
    userId,
    isActive: true,
    status: "active",
  };

  if (platformType) {
    where.platformType = platformType;
  }

  return await this.findAll({ where });
};

module.exports = PlatformConnection;
