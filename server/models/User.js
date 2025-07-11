const { DataTypes, Model } = require("sequelize");
const sequelize = require("../config/database");
const bcrypt = require("bcryptjs");

class User extends Model {
  // Method to validate password
  async validatePassword(password) {
    return await bcrypt.compare(password, this.password);
  }

  // Check if user has access to a specific feature
  hasFeatureAccess(featureName) {
    if (!this.subscriptionPlan) {
      return false;
    }

    const planFeatures = {
      starter: ["basic_analytics", "single_platform", "email_support"],
      professional: [
        "advanced_analytics",
        "multi_platform",
        "inventory_intelligence",
        "email_support",
        "priority_support",
      ],
      enterprise: [
        "all_features",
        "unlimited_platforms",
        "ai_insights",
        "custom_reports",
        "dedicated_support",
        "api_access",
      ],
    };

    const userFeatures = planFeatures[this.subscriptionPlan] || [];
    return (
      userFeatures.includes(featureName) ||
      userFeatures.includes("all_features")
    );
  }

  // Check if user is in trial period
  isInTrialPeriod() {
    if (!this.trialEndsAt) {
      return false;
    }
    return new Date() < this.trialEndsAt;
  }

  // Get days remaining in trial
  getTrialDaysRemaining() {
    if (!this.isInTrialPeriod()) {
      return 0;
    }
    const diffTime = this.trialEndsAt - new Date();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        len: [3, 50],
      },
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [6, 100],
      },
    },
    fullName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "User phone number",
    },
    bio: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "User biography/description",
    },
    role: {
      type: DataTypes.ENUM("user", "admin", "support"),
      defaultValue: "user",
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    emailVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    twoFactorEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    twoFactorSecret: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    passwordResetToken: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    passwordResetExpires: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    emailVerificationToken: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    emailVerificationExpires: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    // === MULTI-TENANT & SUBSCRIPTION FIELDS ===

    // Tenant isolation
    tenantId: {
      type: DataTypes.UUID,
      allowNull: true, // Null for admin users, UUID for tenant users
      comment: "Tenant isolation - groups users by organization/company",
    },

    // Subscription management
    subscriptionPlan: {
      type: DataTypes.ENUM("trial", "starter", "professional", "enterprise"),
      defaultValue: "trial",
      allowNull: false,
      comment: "Current subscription plan",
    },

    subscriptionStatus: {
      type: DataTypes.ENUM(
        "trial",
        "active",
        "past_due",
        "canceled",
        "expired"
      ),
      defaultValue: "trial",
      allowNull: false,
      comment: "Current subscription status",
    },

    // Trial management
    trialStartedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "When trial period started",
    },

    trialEndsAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "When trial period ends",
    },

    // Subscription dates
    subscriptionStartedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "When paid subscription started",
    },

    subscriptionEndsAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "When current subscription period ends",
    },

    // Payment information
    stripeCustomerId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Stripe customer ID for payment processing",
    },

    stripeSubscriptionId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Current Stripe subscription ID for the user",
    },

    iyzicoCustomerId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Iyzico customer ID for Turkish payment processing",
    },

    // Usage tracking
    monthlyApiCalls: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: "API calls made this month",
    },

    monthlyApiLimit: {
      type: DataTypes.INTEGER,
      defaultValue: 1000, // Starter plan limit
      comment: "Monthly API call limit based on plan",
    },

    lastApiCallReset: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      comment: "When monthly API counter was last reset",
    },

    // Feature flags
    featuresEnabled: {
      type: DataTypes.JSON,
      defaultValue: {
        analytics: true,
        inventory_management: true,
        multi_platform: false,
        ai_insights: false,
        custom_reports: false,
        api_access: false,
      },
      comment: "Feature access flags based on subscription plan",
    },

    // Onboarding tracking
    onboardingCompleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: "Whether user completed onboarding flow",
    },

    onboardingStep: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: "Current step in onboarding process (0 = not started)",
    },

    // Business information
    companyName: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Company or business name",
    },

    businessType: {
      type: DataTypes.ENUM(
        "individual",
        "small_business",
        "medium_business",
        "enterprise"
      ),
      allowNull: true,
      comment: "Type of business for better plan recommendations",
    },

    monthlyRevenue: {
      type: DataTypes.ENUM(
        "0-10k",
        "10k-50k",
        "50k-100k",
        "100k-500k",
        "500k+"
      ),
      allowNull: true,
      comment: "Monthly revenue range for plan recommendations",
    },

    // Customer success
    healthScore: {
      type: DataTypes.DECIMAL(3, 2), // 0.00 to 1.00
      defaultValue: 0.5,
      comment: "Customer health score for churn prediction",
    },

    lastActivityAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      comment: "Last time user was active in the platform",
    },

    // Referral system
    referralCode: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: true,
      comment: "Unique referral code for this user",
    },

    referredBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "users",
        key: "id",
      },
      comment: "User who referred this user",
    },

    // Billing preferences
    billingCurrency: {
      type: DataTypes.STRING(3),
      defaultValue: "TRY",
      comment: "Preferred billing currency",
    },

    billingCountry: {
      type: DataTypes.STRING(2),
      defaultValue: "TR",
      comment: "Billing country code",
    },

    // User settings
    settings: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: "{}",
      comment: "User settings stored as JSON string",
    },
  },
  {
    sequelize,
    modelName: "User",
    tableName: "users",
    timestamps: true,
    defaultScope: {
      attributes: {
        exclude: ["password", "twoFactorSecret"],
      },
    },
    scopes: {
      withPassword: {
        attributes: {
          include: ["password"],
        },
      },
      withTenant: {
        // Include tenant-specific data
        attributes: {
          include: ["tenantId", "subscriptionPlan", "subscriptionStatus"],
        },
      },
    },
    indexes: [
      {
        fields: ["email"],
        unique: true,
      },
      {
        fields: ["username"],
        unique: true,
      },
      {
        fields: ["tenantId"],
      },
      {
        fields: ["subscriptionPlan"],
      },
      {
        fields: ["subscriptionStatus"],
      },
      {
        fields: ["referralCode"],
        unique: true,
      },
      {
        fields: ["stripeCustomerId"],
      },
      {
        fields: ["stripeSubscriptionId"],
      },
      {
        fields: ["iyzicoCustomerId"],
      },
    ],
  }
);

module.exports = User;
