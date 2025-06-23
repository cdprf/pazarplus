const { DataTypes, Model } = require("sequelize");
const sequelize = require("../config/database");

class Subscription extends Model {
  // Check if subscription is active
  isActive() {
    return (
      this.status === "active" && (!this.endsAt || new Date() < this.endsAt)
    );
  }

  // Get days until renewal
  getDaysUntilRenewal() {
    if (!this.endsAt) return null;
    const diffTime = this.endsAt - new Date();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // Calculate prorated amount for plan changes
  calculateProratedAmount(newPlanPrice) {
    if (!this.endsAt) return newPlanPrice;

    const totalDays = Math.ceil(
      (this.endsAt - this.startedAt) / (1000 * 60 * 60 * 24)
    );
    const remainingDays = this.getDaysUntilRenewal();
    const usedAmount = (this.amount / totalDays) * (totalDays - remainingDays);

    return Math.max(0, newPlanPrice - (this.amount - usedAmount));
  }
}

Subscription.init(
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

    // Plan details
    planId: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "Plan identifier (starter, professional, enterprise)",
    },

    planName: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "Human-readable plan name",
    },

    // Billing information
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: "Subscription amount in cents/kuruş",
    },

    currency: {
      type: DataTypes.STRING(3),
      defaultValue: "TRY",
      allowNull: false,
    },

    billingInterval: {
      type: DataTypes.ENUM("monthly", "yearly"),
      defaultValue: "monthly",
      allowNull: false,
    },

    // Subscription lifecycle
    status: {
      type: DataTypes.ENUM(
        "trial",
        "active",
        "past_due",
        "canceled",
        "expired"
      ),
      defaultValue: "trial",
      allowNull: false,
    },

    startedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },

    endsAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "When current billing period ends",
    },

    canceledAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    // Trial information
    trialStartedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    trialEndsAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    // Payment provider integration
    stripeSubscriptionId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Stripe subscription ID",
    },

    iyzicoSubscriptionId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Iyzico subscription ID for Turkish customers",
    },

    // Plan features and limits
    features: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: "Features included in this subscription",
    },

    limits: {
      type: DataTypes.JSON,
      defaultValue: {
        apiCalls: 1000,
        platforms: 1,
        users: 1,
        reports: 10,
      },
      comment: "Usage limits for this subscription",
    },

    // Discount and promotional information
    discountPercent: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
      comment: "Discount percentage applied",
    },

    couponCode: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Applied coupon code",
    },

    // Next billing
    nextBillingAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "When next billing will occur",
    },

    nextBillingAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: "Amount for next billing cycle",
    },

    // Cancellation
    cancelAtPeriodEnd: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: "Whether to cancel at end of current period",
    },

    cancellationReason: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Reason for cancellation",
    },

    // Metadata
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: "Additional subscription metadata",
    },
  },
  {
    sequelize,
    modelName: "Subscription",
    tableName: "subscriptions",
    timestamps: true,
    indexes: [
      {
        fields: ["userId"],
      },
      {
        fields: ["status"],
      },
      {
        fields: ["planId"],
      },
      {
        fields: ["stripeSubscriptionId"],
        unique: true,
      },
      {
        fields: ["iyzicoSubscriptionId"],
        unique: true,
      },
      {
        fields: ["endsAt"],
      },
      {
        fields: ["nextBillingAt"],
      },
    ],
  }
);

module.exports = Subscription;
