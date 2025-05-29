const { DataTypes, Model } = require("sequelize");
const sequelize = require("../config/database");

class UsageRecord extends Model {
  // Check if usage exceeds limit
  isOverLimit() {
    return this.currentUsage > this.limit;
  }

  // Get usage percentage
  getUsagePercentage() {
    if (this.limit === 0) return 100;
    return Math.min(100, (this.currentUsage / this.limit) * 100);
  }

  // Check if approaching limit (80% threshold)
  isApproachingLimit() {
    return this.getUsagePercentage() >= 80;
  }
}

UsageRecord.init(
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
        model: "users",
        key: "id",
      },
      onDelete: "CASCADE",
    },

    subscriptionId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "subscriptions",
        key: "id",
      },
      onDelete: "CASCADE",
    },

    // Usage tracking
    metricType: {
      type: DataTypes.ENUM(
        "api_calls",
        "platforms",
        "users",
        "reports",
        "storage"
      ),
      allowNull: false,
      comment: "Type of usage metric being tracked",
    },

    currentUsage: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      comment: "Current usage count for this metric",
    },

    limit: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "Usage limit for this metric based on subscription plan",
    },

    // Billing period
    billingPeriodStart: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: "Start of current billing period",
    },

    billingPeriodEnd: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: "End of current billing period",
    },

    // Overage tracking
    overageAllowed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: "Whether overage is allowed for this metric",
    },

    overageRate: {
      type: DataTypes.DECIMAL(10, 4),
      defaultValue: 0,
      comment: "Cost per unit over limit (in minor currency units)",
    },

    // Last reset
    lastResetAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      comment: "When usage was last reset",
    },

    // Metadata
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: "Additional usage tracking metadata",
    },
  },
  {
    sequelize,
    modelName: "UsageRecord",
    tableName: "usage_records",
    timestamps: true,
    indexes: [
      {
        fields: ["userId"],
      },
      {
        fields: ["subscriptionId"],
      },
      {
        fields: ["metricType"],
      },
      {
        unique: true,
        fields: ["userId", "metricType", "billingPeriodStart"],
        name: "unique_user_metric_period",
      },
      {
        fields: ["billingPeriodStart"],
      },
      {
        fields: ["billingPeriodEnd"],
      },
    ],
  }
);

module.exports = UsageRecord;
