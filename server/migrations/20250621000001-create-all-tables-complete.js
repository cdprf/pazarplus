"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create Users table first (referenced by other tables)
    await queryInterface.createTable("users", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      username: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      password: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      fullName: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      role: {
        type: Sequelize.ENUM("user", "admin", "support"),
        defaultValue: "user",
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      emailVerified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      twoFactorEnabled: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      twoFactorSecret: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      lastLogin: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      subscriptionPlan: {
        type: Sequelize.ENUM("trial", "starter", "professional", "enterprise"),
        defaultValue: "trial",
      },
      subscriptionStatus: {
        type: Sequelize.ENUM("trial", "active", "expired", "cancelled"),
        defaultValue: "trial",
      },
      subscriptionEndDate: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      trialStartedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      trialEndsAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      subscriptionStartedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      subscriptionEndsAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      preferences: {
        type: Sequelize.JSON,
        defaultValue: {},
      },
      stripeCustomerId: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      stripeSubscriptionId: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      iyzicoCustomerId: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      monthlyApiCalls: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      monthlyApiLimit: {
        type: Sequelize.INTEGER,
        defaultValue: 1000,
      },
      lastApiCallReset: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      featuresEnabled: {
        type: Sequelize.JSON,
        defaultValue: {
          analytics: true,
          inventory_management: true,
          multi_platform: false,
          ai_insights: false,
          custom_reports: false,
          api_access: false,
        },
      },
      onboardingCompleted: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      onboardingStep: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      companyName: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      businessType: {
        type: Sequelize.ENUM(
          "individual",
          "small_business",
          "medium_business",
          "enterprise"
        ),
        allowNull: true,
      },
      monthlyRevenue: {
        type: Sequelize.ENUM(
          "0-10k",
          "10k-50k",
          "50k-100k",
          "100k-500k",
          "500k+"
        ),
        allowNull: true,
      },
      healthScore: {
        type: Sequelize.DECIMAL(3, 2),
        defaultValue: 0.5,
      },
      lastActivityAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      referralCode: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      referredBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "users",
          key: "id",
        },
      },
      billingCurrency: {
        type: Sequelize.STRING(3),
        defaultValue: "TRY",
      },
      billingCountry: {
        type: Sequelize.STRING(2),
        defaultValue: "TR",
      },
      settings: {
        type: Sequelize.TEXT,
        allowNull: true,
        defaultValue: "{}",
      },
      passwordResetToken: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      passwordResetExpires: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      emailVerificationToken: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      emailVerificationExpires: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Create Platform Connections table
    await queryInterface.createTable("platform_connections", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      platformType: {
        type: Sequelize.ENUM(
          "trendyol",
          "hepsiburada",
          "n11",
          "pazarama",
          "amazon",
          "csv",
          "shopify",
          "woocommerce",
          "magento"
        ),
        allowNull: false,
      },
      platformName: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      credentials: {
        type: Sequelize.JSON,
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM("active", "inactive", "error", "pending"),
        defaultValue: "pending",
      },
      lastSync: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      syncSettings: {
        type: Sequelize.JSON,
        defaultValue: {},
      },
      errorMessage: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      isDefault: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      lastTestedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      syncInterval: {
        type: Sequelize.INTEGER,
        defaultValue: 24,
      },
      autoSync: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      environment: {
        type: Sequelize.STRING(50),
        defaultValue: "production",
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      rateLimitInfo: {
        type: Sequelize.JSON,
        defaultValue: {},
      },
      lastError: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      errorCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      maxRetries: {
        type: Sequelize.INTEGER,
        defaultValue: 3,
      },
      webhookUrl: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      webhookSecret: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      supportedFeatures: {
        type: Sequelize.JSON,
        defaultValue: [],
      },
      platformMetadata: {
        type: Sequelize.JSON,
        defaultValue: {},
      },
      settings: {
        type: Sequelize.JSON,
        defaultValue: {},
      },
      tags: {
        type: Sequelize.JSON,
        defaultValue: [],
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      expiresAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      notificationSettings: {
        type: Sequelize.JSON,
        defaultValue: {
          onError: true,
          onSync: false,
          onOrderUpdate: true,
          onConnectionExpiry: true,
        },
      },
      lastSyncAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: "Last time this connection was synced",
      },
    });

    // Create Products table
    await queryInterface.createTable("products", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      sku: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      barcode: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      category: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      brand: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      costPrice: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      stockQuantity: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      minStockLevel: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      weight: {
        type: Sequelize.DECIMAL(8, 3),
        allowNull: true,
      },
      dimensions: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      images: {
        type: Sequelize.JSON,
        defaultValue: [],
      },
      attributes: {
        type: Sequelize.JSON,
        defaultValue: {},
      },
      status: {
        type: Sequelize.ENUM("active", "inactive", "draft"),
        defaultValue: "active",
      },
      platforms: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: {},
      },
      tags: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: [],
      },
      lastSyncedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      hasVariants: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      variantAttributes: {
        type: Sequelize.JSON,
        defaultValue: [],
      },
      templateId: {
        type: Sequelize.UUID,
        allowNull: true,
        // Foreign key will be added after product_templates table is created
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Create Product Variants table
    await queryInterface.createTable("product_variants", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      productId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "products",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      sku: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      barcode: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      attributes: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: {},
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      costPrice: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      stockQuantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      minStockLevel: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      weight: {
        type: Sequelize.DECIMAL(10, 3),
        allowNull: true,
      },
      dimensions: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: {},
      },
      images: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: [],
      },
      status: {
        type: Sequelize.ENUM("active", "inactive", "discontinued"),
        allowNull: false,
        defaultValue: "active",
      },
      isDefault: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      sortOrder: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Create Product Media table
    await queryInterface.createTable("product_media", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      productId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "products",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      variantId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "product_variants",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      type: {
        type: Sequelize.ENUM("image", "gif", "video", "document"),
        allowNull: false,
      },
      url: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      thumbnailUrl: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      filename: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      originalName: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      mimeType: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      size: {
        type: Sequelize.BIGINT,
        allowNull: true,
      },
      dimensions: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      isPrimary: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      sortOrder: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      duration: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      altText: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      caption: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      tags: {
        type: Sequelize.JSON,
        defaultValue: [],
      },
      platform: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM(
          "active",
          "inactive",
          "processing",
          "failed",
          "archived"
        ),
        allowNull: false,
        defaultValue: "active",
      },
      platformSpecific: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: {},
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: {},
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Create PlatformConflict table
    await queryInterface.createTable("platform_conflicts", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      entityType: {
        type: Sequelize.ENUM("product", "order", "inventory"),
        allowNull: false,
      },
      entityId: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      platformType: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      conflictType: {
        type: Sequelize.ENUM(
          "price_mismatch",
          "stock_mismatch",
          "data_conflict",
          "sync_error"
        ),
        allowNull: false,
      },
      conflictData: {
        type: Sequelize.JSON,
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM("pending", "resolved", "ignored"),
        defaultValue: "pending",
      },
      resolvedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      resolvedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "users",
          key: "id",
        },
      },
      resolution: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Create PlatformData table
    await queryInterface.createTable("platform_data", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      platformType: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      entityType: {
        type: Sequelize.ENUM("product", "order", "variant"),
        allowNull: false,
      },
      entityId: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      platformId: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      platformEntityId: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: "ID of the entity on the platform",
      },
      platformSku: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Platform-specific SKU",
      },
      platformPrice: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        comment: "Price on the platform",
      },
      platformQuantity: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: "Quantity available on the platform",
      },
      platformStatus: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Status on the platform",
      },
      platformUrl: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: "URL on the platform",
      },
      platformImages: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: "Images on the platform",
      },
      platformTitle: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: "Title on the platform",
      },
      platformDescription: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: "Description on the platform",
      },
      platformCategory: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Category on the platform",
      },
      platformBrand: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Brand on the platform",
      },
      platformAttributes: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: "Attributes on the platform",
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        comment: "Whether the entity is active on the platform",
      },
      lastError: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: "Last synchronization error",
      },
      data: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: {},
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: {},
      },
      lastSyncAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      lastSyncedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: "Last synchronization timestamp",
      },
      syncStatus: {
        type: Sequelize.ENUM("pending", "synced", "failed"),
        defaultValue: "pending",
      },
      status: {
        type: Sequelize.ENUM("active", "inactive", "syncing", "error"),
        defaultValue: "active",
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Create ProductTemplate table
    await queryInterface.createTable("product_templates", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      platformType: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      categoryId: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      categoryName: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Human-readable category name",
      },
      template: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: {},
      },
      fieldMappings: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: {},
      },
      requiredFields: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: [],
        comment: "List of required fields for this template",
      },
      validationRules: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: {},
      },
      conditionalFields: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: {},
        comment: "Conditional fields configuration",
      },
      defaultValues: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: {},
        comment: "Default values for fields",
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      version: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
        comment: "Template version for updates",
      },
      parentTemplateId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "product_templates",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
        comment: "Parent template for inheritance",
      },
      isDefault: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      usageCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      usage_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: "Number of times this template has been used",
      },
      last_used: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: "Last time this template was used",
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Create Orders table
    await queryInterface.createTable("orders", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      connectionId: {
        type: Sequelize.INTEGER,
        allowNull: true, // Changed: Made nullable to support orders without platform connections
        references: {
          model: "platform_connections",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL", // Changed: Set to NULL instead of RESTRICT when platform connection is deleted
      },
      externalOrderId: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      orderNumber: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      orderDate: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      orderStatus: {
        type: Sequelize.ENUM(
          "new",
          "pending",
          "processing",
          "shipped",
          "in_transit",
          "delivered",
          "cancelled",
          "returned",
          "failed",
          "unknown",
          "claim_created",
          "claim_approved",
          "claim_rejected",
          "refunded",
          "consolidated",
          "in_batch"
        ),
        allowNull: false,
        defaultValue: "new",
      },
      paymentStatus: {
        type: Sequelize.ENUM("pending", "paid", "failed", "refunded"),
        defaultValue: "pending",
      },
      shippingStatus: {
        type: Sequelize.ENUM(
          "pending",
          "processing",
          "shipped",
          "delivered",
          "returned"
        ),
        defaultValue: "pending",
      },
      customerInfo: {
        type: Sequelize.JSON,
        allowNull: false,
      },
      shippingAddress: {
        type: Sequelize.JSON,
        allowNull: false,
      },
      billingAddress: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      totalAmount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      taxAmount: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0,
      },
      shippingAmount: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0,
      },
      discountAmount: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0,
      },
      currency: {
        type: Sequelize.STRING(3),
        defaultValue: "TRY",
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      trackingNumber: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      carrierName: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      metadata: {
        type: Sequelize.JSON,
        defaultValue: {},
      },
      isCommercial: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      isMicroExport: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      fastDeliveryType: {
        type: Sequelize.ENUM(
          "TodayDelivery",
          "SameDayShipping",
          "FastDelivery"
        ),
        allowNull: true,
      },
      deliveryType: {
        type: Sequelize.STRING(50),
        defaultValue: "normal",
      },
      deliveryAddressType: {
        type: Sequelize.ENUM("Shipment", "CollectionPoint"),
        defaultValue: "Shipment",
      },
      isGiftBoxRequested: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      etgbNo: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      etgbDate: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      is3pByTrendyol: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      containsDangerousProduct: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      identityNumber: {
        type: Sequelize.STRING(20),
        allowNull: true,
      },
      isConsolidated: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      consolidatedGroupId: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      batchId: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      shippingTemplateId: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      // Legacy platform fields for backward compatibility
      platformType: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      platform: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      platformOrderId: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      platformId: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      // Customer fields
      customerName: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      customerEmail: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      customerPhone: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      // Shipping detail reference
      shippingDetailId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        // Foreign key will be added after shipping_details table is created
      },
      // Cargo tracking information
      cargoTrackingNumber: {
        type: Sequelize.STRING,
        allowNull: true,
        comment:
          "Cargo tracking number from shipping provider (Trendyol, N11, etc.)",
      },
      cargoTrackingLink: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Link to the cargo tracking page",
      },
      cargoTrackingUrl: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: "URL for cargo tracking",
      },
      cargoCompany: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Name of the shipping provider",
      },
      // Invoice fields
      invoiceStatus: {
        type: Sequelize.ENUM("pending", "issued", "cancelled"),
        allowNull: true,
        defaultValue: "pending",
      },
      invoiceNumber: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      invoiceDate: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: "Invoice date",
      },
      invoiceTotal: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
        comment: "Total invoice amount",
      },
      // Data tracking fields
      rawData: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: "Raw order data from platform API",
      },
      lastSyncedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: "Last time this order was synced from platform",
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Create Order Items table
    await queryInterface.createTable("order_items", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      orderId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "orders",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      productId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "products",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      platformProductId: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      sku: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      barcode: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      totalPrice: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      taxAmount: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0,
      },
      discountAmount: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0,
      },
      attributes: {
        type: Sequelize.JSON,
        defaultValue: {},
      },
      discount: {
        type: Sequelize.FLOAT(10, 2),
        allowNull: true,
        defaultValue: 0,
      },
      platformDiscount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        comment: "Platform discount (Trendyol tyDiscount)",
      },
      merchantDiscount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        comment: "Merchant discount (separate from platform discount)",
      },
      invoiceTotal: {
        type: Sequelize.FLOAT(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      currency: {
        type: Sequelize.STRING(3),
        allowNull: false,
        defaultValue: "TRY",
      },
      productSize: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: "Product size from Trendyol API",
      },
      productColor: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: "Product color from Trendyol API",
      },
      productCategoryId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: "Product category ID from Trendyol API",
      },
      productOrigin: {
        type: Sequelize.STRING(10),
        allowNull: true,
        comment: "Product origin (important for micro export orders)",
      },
      salesCampaignId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: "Sales campaign ID from Trendyol API",
      },
      lineItemStatus: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: "Individual line item status (orderLineItemStatusName)",
      },
      vatBaseAmount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        comment: "VAT base amount",
      },
      laborCost: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        comment: "Labor cost",
      },
      fastDeliveryOptions: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: "Fast delivery options array from Trendyol API",
      },
      discountDetails: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: "Detailed discount breakdown from Trendyol API",
      },
      variantInfo: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      rawData: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Create Shipping Details table
    await queryInterface.createTable("shipping_details", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      orderId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "orders",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      recipientName: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      address: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      city: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      state: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      postalCode: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      country: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: "Turkey",
      },
      phone: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      shippingMethod: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      carrierId: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Create Hepsiburada Orders table - Platform-specific order details
    await queryInterface.createTable("hepsiburada_orders", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      orderId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "orders",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      packageNumber: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Hepsiburada package number",
      },
      merchantId: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Merchant ID in Hepsiburada system",
      },
      customerId: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Customer ID in Hepsiburada system",
      },
      orderNumber: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Hepsiburada order number",
      },
      referenceNumber: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Reference number for the order",
      },
      cargoCompany: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Cargo company for shipping",
      },
      cargoTrackingNumber: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Cargo tracking number",
      },
      cargoTrackingUrl: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: "Cargo tracking URL",
      },
      paymentType: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Payment type (e.g., credit card, bank transfer)",
      },
      platformStatus: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Platform-specific order status",
      },
      paymentStatus: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Payment status from Hepsiburada",
      },
      shippingAddressJson: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: "Complete shipping address information",
      },
      billingAddressJson: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: "Complete billing address information",
      },
      deliveryAddressJson: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: "Delivery address details",
      },
      invoiceDetailsJson: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: "Invoice details and information",
      },
      customerJson: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: "Customer information",
      },
      createdDate: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: "Creation date from Hepsiburada",
      },
      orderDate: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: "Order date from Hepsiburada",
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Create Trendyol Orders table - Platform-specific order details
    await queryInterface.createTable("trendyol_orders", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      orderId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "orders",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      trendyolOrderId: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Trendyol order ID",
      },
      orderNumber: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Trendyol order number",
      },
      supplierId: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Supplier ID in Trendyol system",
      },
      customerId: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Customer ID in Trendyol system",
      },
      orderStatus: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Trendyol order status",
      },
      paymentType: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Payment type from Trendyol",
      },
      paymentStatus: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Payment status from Trendyol",
      },
      cargoProviderName: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Cargo provider name",
      },
      cargoTrackingNumber: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Cargo tracking number",
      },
      cargoTrackingLink: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: "Cargo tracking link",
      },
      estimatedDeliveryStartDate: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: "Estimated delivery start date",
      },
      estimatedDeliveryEndDate: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: "Estimated delivery end date",
      },
      shipmentAddress: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: "Shipment address information",
      },
      invoiceAddress: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: "Invoice address information",
      },
      customerInfo: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: "Customer information",
      },
      invoiceData: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: "Invoice data",
      },
      trendyolOrderDate: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: "Order date from Trendyol",
      },
      lastModifiedDate: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: "Last modified date from Trendyol",
      },
      lastSyncAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: "Last sync timestamp",
      },
      commercialInvoiceNumber: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Commercial invoice number",
      },
      grossAmount: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: true,
        comment: "Gross amount",
      },
      totalDiscount: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: true,
        defaultValue: 0,
        comment: "Total discount amount",
      },
      taxNumber: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Tax number",
      },
      deliveryType: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Delivery type",
      },
      timeSlotId: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Time slot ID for delivery",
      },
      fastDelivery: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: false,
        comment: "Fast delivery option",
      },
      scheduledDelivery: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: false,
        comment: "Scheduled delivery option",
      },
      agreedDeliveryDate: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: "Agreed delivery date",
      },
      packingListId: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Packing list ID",
      },
      shipmentPackageStatus: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Shipment package status",
      },
      currency: {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: "TRY",
        comment: "Currency code",
      },
      platformOrderData: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: "Complete platform order data",
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Create N11 Orders table - Platform-specific order details
    await queryInterface.createTable("n11_orders", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      orderId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "orders",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      n11OrderId: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "N11 order ID",
      },
      orderNumber: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "N11 order number",
      },
      sellerId: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Seller ID in N11 system",
      },
      buyerId: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Buyer ID in N11 system",
      },
      orderStatus: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "N11 order status",
      },
      shippingCompany: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Shipping company name",
      },
      trackingNumber: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Tracking number",
      },
      trackingUrl: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: "Tracking URL",
      },
      estimatedDeliveryDate: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: "Estimated delivery date",
      },
      actualDeliveryDate: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: "Actual delivery date",
      },
      shippingAddress: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: "Shipping address information",
      },
      billingAddress: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: "Billing address information",
      },
      customerInfo: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: "Customer information",
      },
      n11OrderDate: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: "Order date from N11",
      },
      lastSyncAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: "Last sync timestamp",
      },
      platformFees: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: true,
        defaultValue: 0,
        comment: "Platform fees",
      },
      cancellationReason: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Cancellation reason",
      },
      returnReason: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Return reason",
      },
      platformOrderData: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: "Complete platform order data",
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Create Platform Categories table
    await queryInterface.createTable("platform_categories", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      platformType: {
        type: Sequelize.ENUM(
          "trendyol",
          "hepsiburada",
          "n11",
          "pazarama",
          "amazon",
          "csv",
          "shopify",
          "woocommerce",
          "magento"
        ),
        allowNull: false,
      },
      platformCategoryId: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      parentId: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      path: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      level: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      isLeaf: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      fieldDefinitions: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: {},
      },
      requiredFields: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: [],
      },
      commissionRate: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Create BulkOperation table
    await queryInterface.createTable("bulk_operations", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      type: {
        type: Sequelize.ENUM(
          "platform_publish",
          "inventory_update",
          "price_update",
          "status_update",
          "data_export",
          "data_import"
        ),
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM(
          "pending",
          "processing",
          "completed",
          "failed",
          "cancelled"
        ),
        defaultValue: "pending",
      },
      totalItems: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      processedItems: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      successfulItems: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      failedItems: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      progress: {
        type: Sequelize.DECIMAL(5, 2),
        defaultValue: 0,
      },
      configuration: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: {},
      },
      results: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      errors: {
        type: Sequelize.JSON,
        defaultValue: [],
      },
      startedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      completedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      processingTimeMs: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Create Hepsiburada Products table
    await queryInterface.createTable("hepsiburada_products", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      productId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "products",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      merchantSku: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      barcode: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      brand: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      categoryId: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      attributes: {
        type: Sequelize.JSON,
        defaultValue: {},
      },
      images: {
        type: Sequelize.JSON,
        defaultValue: [],
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      listPrice: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      stockQuantity: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      status: {
        type: Sequelize.ENUM("active", "inactive", "pending", "rejected"),
        defaultValue: "pending",
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Create Trendyol Products table
    await queryInterface.createTable("trendyol_products", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      productId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "products",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      trendyolProductId: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Trendyol product ID from platform",
      },
      barcode: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      brand: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      categoryId: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      attributes: {
        type: Sequelize.JSON,
        defaultValue: {},
      },
      images: {
        type: Sequelize.JSON,
        defaultValue: [],
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      listPrice: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      stockQuantity: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      status: {
        type: Sequelize.ENUM("active", "inactive", "pending", "rejected"),
        defaultValue: "pending",
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Create N11 Products table
    await queryInterface.createTable("n11_products", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      productId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "products",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      stockCode: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      brand: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      categoryId: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      attributes: {
        type: Sequelize.JSON,
        defaultValue: {},
      },
      images: {
        type: Sequelize.JSON,
        defaultValue: [],
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      listPrice: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      stockQuantity: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      status: {
        type: Sequelize.ENUM("active", "inactive", "pending", "rejected"),
        defaultValue: "pending",
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Create Background Tasks table
    await queryInterface.createTable("background_tasks", {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      platformConnectionId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "platform_connections",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      taskType: {
        type: Sequelize.ENUM(
          "order_fetching",
          "product_sync",
          "inventory_sync",
          "bulk_operation"
        ),
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM(
          "pending",
          "running",
          "completed",
          "failed",
          "stopped"
        ),
        defaultValue: "pending",
      },
      config: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      progress: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      totalItems: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      processedItems: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      errorMessage: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      error: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      result: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      scheduledAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      startedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      completedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      stoppedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      scheduledFor: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      retryCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      maxRetries: {
        type: Sequelize.INTEGER,
        defaultValue: 3,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Create Subscriptions table
    await queryInterface.createTable("subscriptions", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      // Plan details
      planId: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: "Plan identifier (starter, professional, enterprise)",
      },
      planName: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: "Human-readable plan name",
      },
      // Billing information
      amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        comment: "Subscription amount in cents/kuruş",
      },
      currency: {
        type: Sequelize.STRING(3),
        defaultValue: "TRY",
        allowNull: false,
      },
      billingInterval: {
        type: Sequelize.ENUM("monthly", "yearly"),
        defaultValue: "monthly",
        allowNull: false,
      },
      // Subscription lifecycle
      status: {
        type: Sequelize.ENUM(
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
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      endsAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: "When current billing period ends",
      },
      canceledAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      // Trial information
      trialStartedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      trialEndsAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      // Payment provider integration
      stripeSubscriptionId: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Stripe subscription ID",
      },
      iyzicoSubscriptionId: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Iyzico subscription ID for Turkish customers",
      },
      // Plan features and limits
      features: {
        type: Sequelize.JSON,
        defaultValue: {},
        comment: "Features included in this subscription",
      },
      limits: {
        type: Sequelize.JSON,
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
        type: Sequelize.DECIMAL(5, 2),
        defaultValue: 0,
        comment: "Discount percentage applied",
      },
      couponCode: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Applied coupon code",
      },
      // Next billing
      nextBillingAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: "When next billing will occur",
      },
      nextBillingAmount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        comment: "Amount for next billing cycle",
      },
      // Cancellation
      cancelAtPeriodEnd: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        comment: "Whether to cancel at end of current period",
      },
      cancellationReason: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Reason for cancellation",
      },
      // Metadata
      metadata: {
        type: Sequelize.JSON,
        defaultValue: {},
        comment: "Additional subscription metadata",
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Create Settings table
    await queryInterface.createTable("settings", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      name: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      address: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      phone: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      website: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      taxNumber: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      category: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      settings: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: {},
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Create Inventory Movements table
    await queryInterface.createTable("inventory_movements", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      productId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "products",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      variantId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "product_variants",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      movementType: {
        type: Sequelize.ENUM("in", "out", "adjustment", "transfer"),
        allowNull: false,
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      previousStock: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      newStock: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      reason: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Create InventorySync table
    await queryInterface.createTable("inventory_sync", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      sku: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      productId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "products",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      masterQuantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      reservedQuantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      availableQuantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      lowStockThreshold: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 10,
      },
      platformQuantities: {
        type: Sequelize.JSON,
        defaultValue: {
          trendyol: { quantity: 0, lastSync: null, status: "pending" },
          hepsiburada: { quantity: 0, lastSync: null, status: "pending" },
          n11: { quantity: 0, lastSync: null, status: "pending" },
        },
      },
      syncStatus: {
        type: Sequelize.ENUM("synced", "pending", "failed", "partial"),
        defaultValue: "pending",
      },
      lastSyncAttempt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      lastSuccessfulSync: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      syncErrors: {
        type: Sequelize.JSON,
        defaultValue: {},
      },
      autoSyncEnabled: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      syncFrequency: {
        type: Sequelize.INTEGER,
        defaultValue: 300,
      },
      metadata: {
        type: Sequelize.JSON,
        defaultValue: {},
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Create Shipping Carriers table
    await queryInterface.createTable("shipping_carriers", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      code: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      apiEndpoint: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      supportedServices: {
        type: Sequelize.JSON,
        defaultValue: [],
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Create Shipping Rates table
    await queryInterface.createTable("shipping_rates", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      carrierId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "shipping_carriers",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      serviceName: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      minWeight: {
        type: Sequelize.DECIMAL(8, 2),
        allowNull: false,
        defaultValue: 0,
      },
      maxWeight: {
        type: Sequelize.DECIMAL(8, 2),
        allowNull: false,
      },
      baseRate: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      perKgRate: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      zones: {
        type: Sequelize.JSON,
        defaultValue: [],
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Create Invoices table
    await queryInterface.createTable("invoices", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      orderId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "orders",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      invoiceNumber: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      invoiceDate: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      customerInfo: {
        type: Sequelize.JSON,
        allowNull: false,
      },
      items: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: [],
      },
      subtotal: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      taxAmount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      totalAmount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      currency: {
        type: Sequelize.STRING(3),
        defaultValue: "TRY",
      },
      status: {
        type: Sequelize.ENUM("draft", "sent", "paid", "cancelled"),
        defaultValue: "draft",
      },
      pdfPath: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Create Stock Reservations table
    await queryInterface.createTable("stock_reservations", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      productId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "products",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      variantId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "product_variants",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      orderId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "orders",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM("active", "released", "fulfilled"),
        defaultValue: "active",
      },
      expiresAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Create Usage Records table
    await queryInterface.createTable("usage_records", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      subscriptionId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "subscriptions",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      // Usage tracking
      metricType: {
        type: Sequelize.ENUM(
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
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
        comment: "Current usage count for this metric",
      },
      limit: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: "Usage limit for this metric based on subscription plan",
      },
      // Billing period
      billingPeriodStart: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: "Start of current billing period",
      },
      billingPeriodEnd: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: "End of current billing period",
      },
      // Overage tracking
      overageAllowed: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        comment: "Whether overage is allowed for this metric",
      },
      overageRate: {
        type: Sequelize.DECIMAL(10, 4),
        defaultValue: 0,
        comment: "Cost per unit over limit (in minor currency units)",
      },
      // Last reset
      lastResetAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        comment: "When usage was last reset",
      },
      // Metadata
      metadata: {
        type: Sequelize.JSON,
        defaultValue: {},
        comment: "Additional usage tracking metadata",
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Add indexes for performance
    await queryInterface.addIndex("users", ["email"]);
    await queryInterface.addIndex("users", ["username"]);
    await queryInterface.addIndex("users", ["subscriptionStatus"]);
    await queryInterface.addIndex("users", ["subscriptionPlan"]);
    await queryInterface.addIndex("users", ["tenantId"]);
    await queryInterface.addIndex("users", ["referralCode"], { unique: true });
    await queryInterface.addIndex("users", ["stripeCustomerId"]);
    await queryInterface.addIndex("users", ["stripeSubscriptionId"]);
    await queryInterface.addIndex("users", ["iyzicoCustomerId"]);
    await queryInterface.addIndex("users", ["lastLogin"]);
    await queryInterface.addIndex("users", ["emailVerified"]);
    await queryInterface.addIndex("users", ["isActive"]);
    await queryInterface.addIndex("users", ["createdAt"]);
    await queryInterface.addIndex("users", ["lastActivityAt"]);
    await queryInterface.addIndex("users", ["fullName"], {
      name: "users_fullname_search_idx",
    });
    await queryInterface.addIndex("users", ["companyName"], {
      name: "users_company_search_idx",
    });

    await queryInterface.addIndex("platform_connections", ["userId"]);
    await queryInterface.addIndex("platform_connections", ["platformType"]);
    await queryInterface.addIndex("platform_connections", ["status"]);
    await queryInterface.addIndex("platform_connections", [
      "userId",
      "platformType",
    ]);
    await queryInterface.addIndex("platform_connections", ["createdAt"]);
    await queryInterface.addIndex("platform_connections", ["updatedAt"]);
    await queryInterface.addIndex("platform_connections", ["lastSync"]);
    await queryInterface.addIndex("platform_connections", ["lastTestedAt"]);
    await queryInterface.addIndex("platform_connections", ["isActive"]);
    await queryInterface.addIndex("platform_connections", ["autoSync"]);
    await queryInterface.addIndex("platform_connections", [
      "userId",
      "platformType",
      "isActive",
    ]);
    await queryInterface.addIndex("platform_connections", [
      "userId",
      "status",
      "isActive",
    ]);

    await queryInterface.addIndex("products", ["userId"]);
    await queryInterface.addIndex("products", ["sku"]);
    await queryInterface.addIndex("products", ["barcode"]);
    await queryInterface.addIndex("products", ["status"]);
    await queryInterface.addIndex("products", ["category"]);
    await queryInterface.addIndex("products", ["stockQuantity"]);
    await queryInterface.addIndex("products", ["userId", "sku"], {
      unique: true,
    });
    await queryInterface.addIndex("products", ["createdAt"]);
    await queryInterface.addIndex("products", ["updatedAt"]);
    await queryInterface.addIndex("products", ["lastSyncedAt"]);
    await queryInterface.addIndex("products", ["hasVariants"]);
    await queryInterface.addIndex("products", ["brand"]);
    await queryInterface.addIndex("products", ["price"]);
    await queryInterface.addIndex("products", ["name"], {
      name: "products_name_search_idx",
    });
    await queryInterface.addIndex("products", [
      "userId",
      "status",
      "createdAt",
    ]);
    await queryInterface.addIndex("products", ["userId", "category", "status"]);
    await queryInterface.addIndex("products", [
      "userId",
      "stockQuantity",
      "status",
    ]);

    await queryInterface.addIndex("product_variants", ["productId"]);
    await queryInterface.addIndex("product_variants", ["sku"]);
    await queryInterface.addIndex("product_variants", ["barcode"]);
    await queryInterface.addIndex("product_variants", ["status"]);
    await queryInterface.addIndex("product_variants", ["isDefault"]);
    await queryInterface.addIndex("product_variants", ["productId", "sku"], {
      unique: true,
    });
    await queryInterface.addIndex("product_variants", ["createdAt"]);
    await queryInterface.addIndex("product_variants", ["updatedAt"]);
    await queryInterface.addIndex("product_variants", ["price"]);
    await queryInterface.addIndex("product_variants", ["stockQuantity"]);
    await queryInterface.addIndex("product_variants", ["sortOrder"]);
    await queryInterface.addIndex("product_variants", [
      "productId",
      "status",
      "isDefault",
    ]);
    await queryInterface.addIndex("product_variants", [
      "productId",
      "stockQuantity",
    ]);

    await queryInterface.addIndex("product_media", ["productId"]);
    await queryInterface.addIndex("product_media", ["variantId"]);
    await queryInterface.addIndex("product_media", ["type"]);
    await queryInterface.addIndex("product_media", ["userId"]);
    await queryInterface.addIndex("product_media", ["isPrimary"]);
    await queryInterface.addIndex("product_media", ["productId", "sortOrder"]);

    await queryInterface.addIndex("inventory_sync", ["sku"], { unique: true });
    await queryInterface.addIndex("inventory_sync", ["syncStatus"]);
    await queryInterface.addIndex("inventory_sync", ["availableQuantity"]);
    await queryInterface.addIndex("inventory_sync", ["lastSyncAttempt"]);
    await queryInterface.addIndex("inventory_sync", ["productId"]);

    await queryInterface.addIndex("platform_conflicts", ["userId"]);
    await queryInterface.addIndex("platform_conflicts", ["entityType"]);
    await queryInterface.addIndex("platform_conflicts", ["entityId"]);
    await queryInterface.addIndex("platform_conflicts", ["platformType"]);
    await queryInterface.addIndex("platform_conflicts", ["conflictType"]);
    await queryInterface.addIndex("platform_conflicts", ["status"]);

    await queryInterface.addIndex("product_templates", ["userId"]);
    await queryInterface.addIndex("product_templates", ["platformType"]);
    await queryInterface.addIndex("product_templates", ["categoryId"]);
    await queryInterface.addIndex("product_templates", ["isActive"]);
    await queryInterface.addIndex("product_templates", ["isDefault"]);

    // Add the foreign key constraint now that product_templates table exists
    try {
      await queryInterface.addConstraint("products", {
        fields: ["templateId"],
        type: "foreign key",
        name: "products_templateId_fkey",
        references: {
          table: "product_templates",
          field: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      });
    } catch (error) {
      console.log("Foreign key constraint may already exist:", error.message);
    }

    await queryInterface.addIndex("bulk_operations", ["userId"]);
    await queryInterface.addIndex("bulk_operations", ["type"]);
    await queryInterface.addIndex("bulk_operations", ["status"]);
    await queryInterface.addIndex("bulk_operations", ["createdAt"]);

    await queryInterface.addIndex("platform_data", ["platformType"]);
    await queryInterface.addIndex("platform_data", ["entityType"]);
    await queryInterface.addIndex("platform_data", ["entityId"]);
    await queryInterface.addIndex("platform_data", ["platformId"]);
    await queryInterface.addIndex("platform_data", ["platformEntityId"]);
    await queryInterface.addIndex("platform_data", ["syncStatus"]);
    
    // Add unique constraint for platform data (merged from 20250622000001-add-platform-data-unique-constraint.js)
    await queryInterface.addConstraint("platform_data", {
      fields: ["entityType", "entityId", "platformType"],
      type: "unique",
      name: "platform_data_unique_entity_platform",
    });

    await queryInterface.addIndex("orders", ["userId"]);
    await queryInterface.addIndex("orders", ["connectionId"]);
    await queryInterface.addIndex("orders", ["orderStatus"]);
    await queryInterface.addIndex("orders", ["orderDate"]);
    await queryInterface.addIndex("orders", ["externalOrderId"]);
    await queryInterface.addIndex("orders", ["trackingNumber"]);
    // Note: Unique constraint on externalOrderId and connectionId handles NULL connectionId properly
    // Multiple orders can have NULL connectionId (manual orders), but platform orders must be unique per connection
    await queryInterface.addIndex(
      "orders",
      ["externalOrderId", "connectionId"],
      { unique: true }
    );
    await queryInterface.addIndex("orders", ["isConsolidated"]);
    await queryInterface.addIndex("orders", ["batchId"]);
    await queryInterface.addIndex("orders", ["shippingTemplateId"]);
    await queryInterface.addIndex("orders", ["isCommercial"]);
    await queryInterface.addIndex("orders", ["isMicroExport"]);
    await queryInterface.addIndex("orders", ["fastDeliveryType"]);
    await queryInterface.addIndex("orders", ["createdAt"]);
    await queryInterface.addIndex("orders", ["updatedAt"]);
    await queryInterface.addIndex("orders", ["totalAmount"]);
    await queryInterface.addIndex("orders", ["currency"]);
    await queryInterface.addIndex("orders", ["paymentStatus"]);
    await queryInterface.addIndex("orders", ["shippingStatus"]);
    await queryInterface.addIndex("orders", ["deliveryType"]);
    await queryInterface.addIndex("orders", ["cargoTrackingNumber"]);
    await queryInterface.addIndex("orders", ["cargoCompany"]);
    await queryInterface.addIndex("orders", ["invoiceStatus"]);
    await queryInterface.addIndex("orders", ["invoiceNumber"]);
    await queryInterface.addIndex("orders", [
      "userId",
      "orderStatus",
      "orderDate",
    ]);
    await queryInterface.addIndex("orders", [
      "userId",
      "connectionId",
      "orderDate",
    ]);
    await queryInterface.addIndex("orders", [
      "connectionId",
      "orderStatus",
      "orderDate",
    ]);

    await queryInterface.addIndex("order_items", ["orderId"]);
    await queryInterface.addIndex("order_items", ["productId"]);
    await queryInterface.addIndex("order_items", ["sku"]);

    await queryInterface.addIndex("shipping_details", ["orderId"]);

    // Add indexes for platform-specific order tables
    await queryInterface.addIndex("hepsiburada_orders", ["orderId"]);
    await queryInterface.addIndex("hepsiburada_orders", ["packageNumber"]);
    await queryInterface.addIndex("hepsiburada_orders", ["merchantId"]);
    await queryInterface.addIndex("hepsiburada_orders", ["orderNumber"]);
    await queryInterface.addIndex("hepsiburada_orders", [
      "cargoTrackingNumber",
    ]);

    await queryInterface.addIndex("trendyol_orders", ["orderId"]);
    await queryInterface.addIndex("trendyol_orders", ["trendyolOrderId"]);
    await queryInterface.addIndex("trendyol_orders", ["orderNumber"]);
    await queryInterface.addIndex("trendyol_orders", ["supplierId"]);
    await queryInterface.addIndex("trendyol_orders", ["cargoTrackingNumber"]);

    await queryInterface.addIndex("n11_orders", ["orderId"]);
    await queryInterface.addIndex("n11_orders", ["n11OrderId"]);
    await queryInterface.addIndex("n11_orders", ["orderNumber"]);
    await queryInterface.addIndex("n11_orders", ["sellerId"]);
    await queryInterface.addIndex("n11_orders", ["trackingNumber"]);

    // Add index for the new trendyolProductId column
    await queryInterface.addIndex("trendyol_products", ["trendyolProductId"]);

    // Add the foreign key constraint now that shipping_details table exists
    try {
      await queryInterface.addConstraint("orders", {
        fields: ["shippingDetailId"],
        type: "foreign key",
        name: "orders_shippingDetailId_fkey",
        references: {
          table: "shipping_details",
          field: "id",
        },
      });
    } catch (error) {
      console.log("Foreign key constraint may already exist:", error.message);
    }

    await queryInterface.addIndex("platform_categories", ["platformType"]);
    await queryInterface.addIndex("platform_categories", [
      "platformCategoryId",
    ]);
    await queryInterface.addIndex("platform_categories", ["parentId"]);

    await queryInterface.addIndex("hepsiburada_products", ["productId"]);
    await queryInterface.addIndex("hepsiburada_products", ["merchantSku"]);
    await queryInterface.addIndex("hepsiburada_products", ["barcode"]);

    await queryInterface.addIndex("trendyol_products", ["productId"]);
    await queryInterface.addIndex("trendyol_products", ["barcode"]);

    await queryInterface.addIndex("n11_products", ["productId"]);
    await queryInterface.addIndex("n11_products", ["stockCode"]);

    await queryInterface.addIndex("background_tasks", ["userId"]);
    await queryInterface.addIndex("background_tasks", ["platformConnectionId"]);
    await queryInterface.addIndex("background_tasks", ["status"]);
    await queryInterface.addIndex("background_tasks", ["taskType"]);
    await queryInterface.addIndex("background_tasks", ["updatedAt"]);
    await queryInterface.addIndex("background_tasks", ["startedAt"]);
    await queryInterface.addIndex("background_tasks", ["completedAt"]);
    await queryInterface.addIndex("background_tasks", ["scheduledFor"]);

    await queryInterface.addIndex("subscriptions", ["userId"]);
    await queryInterface.addIndex("subscriptions", ["status"]);
    await queryInterface.addIndex("subscriptions", ["startedAt"]);
    await queryInterface.addIndex("subscriptions", ["endsAt"]);
    await queryInterface.addIndex("subscriptions", ["planId"]);
    await queryInterface.addIndex("subscriptions", ["billingInterval"]);

    await queryInterface.addIndex("settings", ["userId"]);
    await queryInterface.addIndex("settings", ["category"]);
    await queryInterface.addIndex("settings", ["userId", "category"], {
      unique: true,
    });

    await queryInterface.addIndex("inventory_movements", ["userId"]);
    await queryInterface.addIndex("inventory_movements", ["productId"]);
    await queryInterface.addIndex("inventory_movements", ["variantId"]);
    await queryInterface.addIndex("inventory_movements", ["movementType"]);
    await queryInterface.addIndex("inventory_movements", ["createdAt"]);
    await queryInterface.addIndex("inventory_movements", ["quantity"]);
    await queryInterface.addIndex("inventory_movements", ["reason"]);

    await queryInterface.addIndex("shipping_carriers", ["code"]);
    await queryInterface.addIndex("shipping_rates", ["carrierId"]);
    await queryInterface.addIndex("shipping_rates", ["userId"]);

    await queryInterface.addIndex("invoices", ["userId"]);
    await queryInterface.addIndex("invoices", ["orderId"]);
    await queryInterface.addIndex("invoices", ["invoiceNumber"]);
    await queryInterface.addIndex("invoices", ["invoiceDate"]);
    await queryInterface.addIndex("invoices", ["totalAmount"]);
    await queryInterface.addIndex("invoices", ["currency"]);

    await queryInterface.addIndex("stock_reservations", ["productId"]);
    await queryInterface.addIndex("stock_reservations", ["variantId"]);
    await queryInterface.addIndex("stock_reservations", ["orderId"]);
    await queryInterface.addIndex("stock_reservations", ["status"]);
    await queryInterface.addIndex("stock_reservations", ["createdAt"]);
    await queryInterface.addIndex("stock_reservations", ["expiresAt"]);
    await queryInterface.addIndex("stock_reservations", ["quantity"]);

    await queryInterface.addIndex("usage_records", ["userId"]);
    await queryInterface.addIndex("usage_records", ["subscriptionId"]);
    await queryInterface.addIndex("usage_records", ["metricType"]);
    await queryInterface.addIndex("usage_records", ["userId", "metricType"]);
    await queryInterface.addIndex("usage_records", ["billingPeriodStart"]);
    await queryInterface.addIndex("usage_records", ["billingPeriodEnd"]);
    await queryInterface.addIndex("usage_records", ["currentUsage"]);
    await queryInterface.addIndex("usage_records", ["lastResetAt"]);
  },

  down: async (queryInterface, Sequelize) => {
    // Drop tables in reverse order to handle foreign key constraints
    // Use CASCADE to ensure all dependencies are dropped
    await queryInterface.dropTable("usage_records", { cascade: true });
    await queryInterface.dropTable("stock_reservations", { cascade: true });
    await queryInterface.dropTable("invoices", { cascade: true });
    await queryInterface.dropTable("shipping_rates", { cascade: true });
    await queryInterface.dropTable("shipping_carriers", { cascade: true });
    await queryInterface.dropTable("inventory_movements", { cascade: true });
    await queryInterface.dropTable("settings", { cascade: true });
    await queryInterface.dropTable("subscriptions", { cascade: true });
    await queryInterface.dropTable("background_tasks", { cascade: true });
    await queryInterface.dropTable("n11_products", { cascade: true });
    await queryInterface.dropTable("trendyol_products", { cascade: true });
    await queryInterface.dropTable("hepsiburada_products", { cascade: true });
    await queryInterface.dropTable("platform_categories", { cascade: true });
    await queryInterface.dropTable("bulk_operations", { cascade: true });
    await queryInterface.dropTable("order_items", { cascade: true });
    // Drop platform-specific order tables
    await queryInterface.dropTable("n11_orders", { cascade: true });
    await queryInterface.dropTable("trendyol_orders", { cascade: true });
    await queryInterface.dropTable("hepsiburada_orders", { cascade: true });
    await queryInterface.dropTable("shipping_details", { cascade: true });
    await queryInterface.dropTable("orders", { cascade: true });
    await queryInterface.dropTable("product_media", { cascade: true });
    await queryInterface.dropTable("product_variants", { cascade: true });
    await queryInterface.dropTable("products", { cascade: true });
    await queryInterface.dropTable("product_templates", { cascade: true });
    await queryInterface.dropTable("platform_data", { cascade: true });
    await queryInterface.dropTable("platform_conflicts", { cascade: true });
    await queryInterface.dropTable("platform_connections", { cascade: true });
    await queryInterface.dropTable("users", { cascade: true });
    await queryInterface.dropTable("inventory_sync", { cascade: true });
  },
};
