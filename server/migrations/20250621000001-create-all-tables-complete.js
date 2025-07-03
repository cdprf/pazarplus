"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Helper function to determine JSON type based on dialect
    const getJsonType = () => {
      const dialect = queryInterface.sequelize.getDialect();
      return dialect === "postgres" ? Sequelize.JSONB : Sequelize.JSON;
    };

    const JsonType = getJsonType();

    // Neon PostgreSQL specific configurations
    if (queryInterface.sequelize.getDialect() === "postgres") {
      // Enable required extensions
      await queryInterface.sequelize.query(
        'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'
      );
      await queryInterface.sequelize.query(
        'CREATE EXTENSION IF NOT EXISTS "btree_gin";'
      );

      // Set timezone for consistent date handling
      await queryInterface.sequelize.query("SET timezone = 'UTC';");
    }

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
        type: JsonType,
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
        type: JsonType,
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
        type: JsonType,
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
        type: JsonType,
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
        type: JsonType,
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
        type: JsonType,
        defaultValue: [],
      },
      platformMetadata: {
        type: JsonType,
        defaultValue: {},
      },
      settings: {
        type: JsonType,
        defaultValue: {},
      },
      tags: {
        type: JsonType,
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
        type: JsonType,
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
        type: JsonType,
        allowNull: true,
      },
      images: {
        type: JsonType,
        defaultValue: [],
      },
      attributes: {
        type: JsonType,
        defaultValue: {},
      },
      status: {
        type: Sequelize.ENUM("active", "inactive", "draft"),
        defaultValue: "active",
      },
      platforms: {
        type: JsonType,
        allowNull: true,
        defaultValue: {},
      },
      tags: {
        type: JsonType,
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
        type: JsonType,
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
        type: JsonType,
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
        type: JsonType,
        allowNull: true,
        defaultValue: {},
      },
      images: {
        type: JsonType,
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
        type: JsonType,
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
        type: JsonType,
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
        type: JsonType,
        allowNull: false,
        defaultValue: {},
      },
      metadata: {
        type: JsonType,
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
        type: JsonType,
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
        type: JsonType,
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
        type: JsonType,
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
        type: JsonType,
        allowNull: false,
        defaultValue: {},
      },
      metadata: {
        type: JsonType,
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
        type: JsonType,
        allowNull: false,
        defaultValue: {},
      },
      fieldMappings: {
        type: JsonType,
        allowNull: false,
        defaultValue: {},
      },
      requiredFields: {
        type: JsonType,
        allowNull: false,
        defaultValue: [],
        comment: "List of required fields for this template",
      },
      validationRules: {
        type: JsonType,
        allowNull: false,
        defaultValue: {},
      },
      conditionalFields: {
        type: JsonType,
        allowNull: false,
        defaultValue: {},
        comment: "Conditional fields configuration",
      },
      defaultValues: {
        type: JsonType,
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
        type: JsonType,
        allowNull: false,
      },
      shippingAddress: {
        type: JsonType,
        allowNull: false,
      },
      billingAddress: {
        type: JsonType,
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
        type: JsonType,
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
        type: JsonType,
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
        type: JsonType,
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
        type: JsonType,
        allowNull: true,
        comment: "Fast delivery options array from Trendyol API",
      },
      discountDetails: {
        type: JsonType,
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
        type: JsonType,
        allowNull: true,
        comment: "Complete shipping address information",
      },
      billingAddressJson: {
        type: JsonType,
        allowNull: true,
        comment: "Complete billing address information",
      },
      deliveryAddressJson: {
        type: JsonType,
        allowNull: true,
        comment: "Delivery address details",
      },
      invoiceDetailsJson: {
        type: JsonType,
        allowNull: true,
        comment: "Invoice details and information",
      },
      customerJson: {
        type: JsonType,
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
        type: JsonType,
        allowNull: true,
        comment: "Shipment address information",
      },
      invoiceAddress: {
        type: JsonType,
        allowNull: true,
        comment: "Invoice address information",
      },
      customerInfo: {
        type: JsonType,
        allowNull: true,
        comment: "Customer information",
      },
      invoiceData: {
        type: JsonType,
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
        type: JsonType,
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
        type: Sequelize.ENUM(
          "Created",
          "Picking",
          "Shipped",
          "Delivered",
          "Cancelled",
          "Returned",
          "Processing"
        ),
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
        type: JsonType,
        allowNull: true,
        comment: "Shipping address information",
      },
      billingAddress: {
        type: JsonType,
        allowNull: true,
        comment: "Billing address information",
      },
      customerInfo: {
        type: JsonType,
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
        type: JsonType,
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
        type: JsonType,
        allowNull: false,
        defaultValue: {},
      },
      requiredFields: {
        type: JsonType,
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
        type: JsonType,
        allowNull: false,
        defaultValue: {},
      },
      results: {
        type: JsonType,
        allowNull: true,
      },
      errors: {
        type: JsonType,
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
        type: JsonType,
        defaultValue: {},
      },
      images: {
        type: JsonType,
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
        type: JsonType,
        defaultValue: {},
      },
      images: {
        type: JsonType,
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
        type: JsonType,
        defaultValue: {},
      },
      images: {
        type: JsonType,
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
      sellerCode: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Seller code for N11 product",
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
      priority: {
        type: Sequelize.ENUM("low", "normal", "high", "urgent"),
        allowNull: false,
        defaultValue: "normal",
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
        type: JsonType,
        allowNull: true,
      },
      progress: {
        type: JsonType,
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
        type: JsonType,
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
        type: JsonType,
        defaultValue: {},
        comment: "Features included in this subscription",
      },
      limits: {
        type: JsonType,
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
        type: JsonType,
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
        type: JsonType,
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
        type: JsonType,
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
        type: JsonType,
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
        type: JsonType,
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
        type: JsonType,
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
        type: JsonType,
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
        type: JsonType,
        allowNull: false,
      },
      items: {
        type: JsonType,
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
        type: JsonType,
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

    // Create Customers table
    await queryInterface.createTable("customers", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      phone: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      totalOrders: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      totalSpent: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0.0,
      },
      averageOrderValue: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0.0,
      },
      loyaltyScore: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      customerType: {
        type: Sequelize.ENUM("new", "loyal", "vip"),
        defaultValue: "new",
      },
      addressLine1: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      addressLine2: {
        type: Sequelize.STRING,
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
      zipCode: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      country: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      dateOfBirth: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      gender: {
        type: Sequelize.ENUM("male", "female", "other"),
        allowNull: true,
      },
      preferences: {
        type: JsonType,
        allowNull: true,
      },
      tags: {
        type: JsonType,
        allowNull: true,
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      source: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      lastOrderDate: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      firstOrderDate: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
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

    // Create Customer Questions table
    await queryInterface.createTable("customer_questions", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      platform: {
        type: Sequelize.ENUM("trendyol", "hepsiburada", "n11"),
        allowNull: false,
      },
      platform_question_id: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      customer_id: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      customer_name: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      show_customer_name: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      question_text: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      question_date: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      product_id: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      product_name: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      barcode: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      reply_text: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      reply_date: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      reply_user: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      is_answered: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      status: {
        type: Sequelize.ENUM("new", "answered", "ignored", "pending"),
        defaultValue: "new",
      },
      priority: {
        type: Sequelize.ENUM("low", "medium", "high", "urgent"),
        defaultValue: "medium",
      },
      platform_specific_data: {
        type: JsonType,
        allowNull: true,
      },
      internal_notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      auto_reply_used: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      reply_template_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
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

    // Create Customer Replies table
    await queryInterface.createTable("customer_replies", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      question_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "customer_questions",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      reply_text: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      reply_date: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      reply_user: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      is_from_customer: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      platform_reply_id: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM("sent", "delivered", "failed"),
        defaultValue: "sent",
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
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

    // Create Main Products table
    await queryInterface.createTable("main_products", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      baseSku: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      category: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      brand: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      productType: {
        type: Sequelize.ENUM("simple", "variant"),
        defaultValue: "simple",
      },
      status: {
        type: Sequelize.ENUM("active", "inactive", "draft"),
        defaultValue: "active",
      },
      basePrice: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      baseCost: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      weight: {
        type: Sequelize.DECIMAL(8, 3),
        allowNull: true,
      },
      dimensions: {
        type: JsonType,
        allowNull: true,
      },
      sharedStock: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      totalStock: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      reservedStock: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      availableStock: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      lowStockThreshold: {
        type: Sequelize.INTEGER,
        defaultValue: 10,
      },
      trackInventory: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      allowBackorder: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      backorderLimit: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      variantAttributes: {
        type: JsonType,
        allowNull: true,
      },
      defaultVariantId: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      tags: {
        type: JsonType,
        allowNull: true,
      },
      metadata: {
        type: JsonType,
        allowNull: true,
      },
      seoTitle: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      seoDescription: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      seoKeywords: {
        type: JsonType,
        allowNull: true,
      },
      isVirtual: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      isDownloadable: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      downloadableFiles: {
        type: JsonType,
        allowNull: true,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
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

    // Create Platform Variants table
    await queryInterface.createTable("platform_variants", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      mainProductId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "main_products",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      platform: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      platformSku: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      platformProductId: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      platformBarcode: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      compareAtPrice: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      cost: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      platformStock: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      platformReservedStock: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      stockAllocation: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      weight: {
        type: Sequelize.DECIMAL(8, 3),
        allowNull: true,
      },
      dimensions: {
        type: JsonType,
        allowNull: true,
      },
      attributes: {
        type: JsonType,
        allowNull: true,
      },
      variantValues: {
        type: JsonType,
        allowNull: true,
      },
      platformSpecificData: {
        type: JsonType,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM(
          "active",
          "inactive",
          "draft",
          "pending",
          "rejected"
        ),
        defaultValue: "draft",
      },
      isVisible: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      isFeatured: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      position: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      images: {
        type: JsonType,
        allowNull: true,
      },
      primaryImage: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      seoTitle: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      seoDescription: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      seoKeywords: {
        type: JsonType,
        allowNull: true,
      },
      platformCategory: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      platformCategoryId: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      shippingInfo: {
        type: JsonType,
        allowNull: true,
      },
      taxInfo: {
        type: JsonType,
        allowNull: true,
      },
      tags: {
        type: JsonType,
        allowNull: true,
      },
      metadata: {
        type: JsonType,
        allowNull: true,
      },
      lastSyncAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      syncStatus: {
        type: Sequelize.ENUM("pending", "syncing", "synced", "error"),
        defaultValue: "pending",
      },
      syncErrors: {
        type: JsonType,
        allowNull: true,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
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

    // Create Enhanced Product Media table
    await queryInterface.createTable("enhanced_product_media", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      productId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "products",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      mainProductId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "main_products",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      platformVariantId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "platform_variants",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      type: {
        type: Sequelize.ENUM("image", "video", "document", "3d_model"),
        allowNull: false,
      },
      url: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      fileName: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      originalName: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      mimeType: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      size: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      alt: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      title: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      position: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      isPrimary: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      platforms: {
        type: JsonType,
        allowNull: true,
      },
      metadata: {
        type: JsonType,
        allowNull: true,
      },
      dimensions: {
        type: JsonType,
        allowNull: true,
      },
      thumbnails: {
        type: JsonType,
        allowNull: true,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
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

    // Create Question Stats table
    await queryInterface.createTable("question_stats", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      platform: {
        type: Sequelize.ENUM("trendyol", "hepsiburada", "n11", "all"),
        allowNull: false,
      },
      date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      totalQuestions: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      answeredQuestions: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      pendingQuestions: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      averageResponseTime: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      autoRepliesUsed: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
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

    // Create Reply Templates table
    await queryInterface.createTable("reply_templates", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      category: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      platforms: {
        type: JsonType,
        allowNull: true,
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      isDefault: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      tags: {
        type: JsonType,
        allowNull: true,
      },
      variables: {
        type: JsonType,
        allowNull: true,
      },
      usageCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
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

    // Create Platform Templates table
    await queryInterface.createTable("platform_templates", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      platform: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      category: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      templateData: {
        type: JsonType,
        allowNull: false,
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      isDefault: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      version: {
        type: Sequelize.STRING,
        defaultValue: "1.0",
      },
      usageCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
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

    // Create Compliance Documents table
    await queryInterface.createTable("compliance_documents", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      productId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "products",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      mainProductId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "main_products",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      documentType: {
        type: Sequelize.ENUM(
          "ce_certificate",
          "test_report",
          "safety_datasheet",
          "manual",
          "warranty",
          "other"
        ),
        allowNull: false,
      },
      documentName: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      documentUrl: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      expiryDate: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      issuedBy: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      issuedDate: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM("valid", "expired", "pending", "rejected"),
        defaultValue: "valid",
      },
      platforms: {
        type: JsonType,
        allowNull: true,
      },
      metadata: {
        type: JsonType,
        allowNull: true,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
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

    // Create Turkish Compliance table
    await queryInterface.createTable("turkish_compliance", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      productId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "products",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      mainProductId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "main_products",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      gtip: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      tse: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      ce: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      eprel: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      batteryRegulation: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      hasWarranty: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      warrantyPeriod: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      warrantyType: {
        type: Sequelize.ENUM("distributor", "manufacturer", "importer"),
        allowNull: true,
      },
      riskClass: {
        type: Sequelize.ENUM("low", "medium", "high"),
        defaultValue: "low",
      },
      complianceStatus: {
        type: Sequelize.ENUM(
          "compliant",
          "non_compliant",
          "pending",
          "unknown"
        ),
        defaultValue: "unknown",
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      documents: {
        type: JsonType,
        allowNull: true,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
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
    await queryInterface.addIndex("background_tasks", ["priority"]);
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

    // Neon PostgreSQL specific optimizations
    if (queryInterface.sequelize.getDialect() === "postgres") {
      // Add JSONB GIN indexes for better performance on JSON queries
      await queryInterface.addIndex("users", ["preferences"], {
        using: "gin",
        name: "users_preferences_gin_idx",
      });

      await queryInterface.addIndex("users", ["featuresEnabled"], {
        using: "gin",
        name: "users_features_gin_idx",
      });

      await queryInterface.addIndex("platform_connections", ["credentials"], {
        using: "gin",
        name: "platform_connections_credentials_gin_idx",
      });

      await queryInterface.addIndex("platform_connections", ["settings"], {
        using: "gin",
        name: "platform_connections_settings_gin_idx",
      });

      await queryInterface.addIndex("products", ["specifications"], {
        using: "gin",
        name: "products_specifications_gin_idx",
      });

      await queryInterface.addIndex("products", ["images"], {
        using: "gin",
        name: "products_images_gin_idx",
      });

      await queryInterface.addIndex("orders", ["metadata"], {
        using: "gin",
        name: "orders_metadata_gin_idx",
      });

      // Add partial indexes for better performance on filtered queries
      await queryInterface.addIndex("users", ["email"], {
        where: { isActive: true },
        name: "users_active_email_idx",
      });

      await queryInterface.addIndex("products", ["sku"], {
        where: { status: "active" },
        name: "products_active_sku_idx",
      });

      await queryInterface.addIndex("orders", ["createdAt"], {
        where: "status IN ('pending', 'processing')",
        name: "orders_active_created_idx",
      });

      // Add composite indexes for common query patterns
      await queryInterface.addIndex(
        "platform_connections",
        ["userId", "platformType", "isActive"],
        {
          name: "platform_connections_user_platform_active_idx",
        }
      );

      await queryInterface.addIndex(
        "products",
        ["userId", "status", "createdAt"],
        {
          name: "products_user_status_date_idx",
        }
      );

      await queryInterface.addIndex(
        "orders",
        ["userId", "status", "orderDate"],
        {
          name: "orders_user_status_date_idx",
        }
      );

      // Add indexes for new tables
      // Customers table indexes
      await queryInterface.addIndex("customers", ["email"], { unique: true });
      await queryInterface.addIndex("customers", ["userId"]);
      await queryInterface.addIndex("customers", ["customerType"]);
      await queryInterface.addIndex("customers", ["isActive"]);
      await queryInterface.addIndex("customers", ["totalOrders"]);
      await queryInterface.addIndex("customers", ["lastOrderDate"]);

      // Customer Questions table indexes
      await queryInterface.addIndex("customer_questions", ["platform"]);
      await queryInterface.addIndex("customer_questions", [
        "platform_question_id",
      ]);
      await queryInterface.addIndex("customer_questions", ["customer_id"]);
      await queryInterface.addIndex("customer_questions", ["is_answered"]);
      await queryInterface.addIndex("customer_questions", ["status"]);
      await queryInterface.addIndex("customer_questions", ["priority"]);
      await queryInterface.addIndex("customer_questions", ["question_date"]);
      await queryInterface.addIndex("customer_questions", ["userId"]);
      await queryInterface.addIndex("customer_questions", [
        "platform",
        "status",
      ]);
      await queryInterface.addIndex("customer_questions", [
        "platform",
        "is_answered",
      ]);

      // Customer Replies table indexes
      await queryInterface.addIndex("customer_replies", ["question_id"]);
      await queryInterface.addIndex("customer_replies", ["is_from_customer"]);
      await queryInterface.addIndex("customer_replies", ["status"]);
      await queryInterface.addIndex("customer_replies", ["reply_date"]);
      await queryInterface.addIndex("customer_replies", ["userId"]);

      // Main Products table indexes
      await queryInterface.addIndex("main_products", ["baseSku"], {
        unique: true,
      });
      await queryInterface.addIndex("main_products", ["category"]);
      await queryInterface.addIndex("main_products", ["brand"]);
      await queryInterface.addIndex("main_products", ["productType"]);
      await queryInterface.addIndex("main_products", ["status"]);
      await queryInterface.addIndex("main_products", ["userId"]);
      await queryInterface.addIndex("main_products", ["trackInventory"]);
      await queryInterface.addIndex("main_products", ["totalStock"]);
      await queryInterface.addIndex("main_products", ["availableStock"]);

      // Platform Variants table indexes
      await queryInterface.addIndex("platform_variants", ["mainProductId"]);
      await queryInterface.addIndex("platform_variants", ["platform"]);
      await queryInterface.addIndex("platform_variants", ["platformSku"]);
      await queryInterface.addIndex("platform_variants", ["platformProductId"]);
      await queryInterface.addIndex("platform_variants", ["status"]);
      await queryInterface.addIndex("platform_variants", ["isVisible"]);
      await queryInterface.addIndex("platform_variants", ["syncStatus"]);
      await queryInterface.addIndex("platform_variants", ["userId"]);
      await queryInterface.addIndex("platform_variants", [
        "platform",
        "status",
      ]);
      await queryInterface.addIndex("platform_variants", [
        "mainProductId",
        "platform",
      ]);

      // Enhanced Product Media table indexes
      await queryInterface.addIndex("enhanced_product_media", ["productId"]);
      await queryInterface.addIndex("enhanced_product_media", [
        "mainProductId",
      ]);
      await queryInterface.addIndex("enhanced_product_media", [
        "platformVariantId",
      ]);
      await queryInterface.addIndex("enhanced_product_media", ["type"]);
      await queryInterface.addIndex("enhanced_product_media", ["isPrimary"]);
      await queryInterface.addIndex("enhanced_product_media", ["isActive"]);
      await queryInterface.addIndex("enhanced_product_media", ["position"]);
      await queryInterface.addIndex("enhanced_product_media", ["userId"]);

      // Question Stats table indexes
      await queryInterface.addIndex("question_stats", ["platform"]);
      await queryInterface.addIndex("question_stats", ["date"]);
      await queryInterface.addIndex("question_stats", ["userId"]);
      await queryInterface.addIndex("question_stats", ["platform", "date"], {
        unique: true,
      });

      // Reply Templates table indexes
      await queryInterface.addIndex("reply_templates", ["category"]);
      await queryInterface.addIndex("reply_templates", ["isActive"]);
      await queryInterface.addIndex("reply_templates", ["isDefault"]);
      await queryInterface.addIndex("reply_templates", ["userId"]);
      await queryInterface.addIndex("reply_templates", ["usageCount"]);

      // Platform Templates table indexes
      await queryInterface.addIndex("platform_templates", ["platform"]);
      await queryInterface.addIndex("platform_templates", ["category"]);
      await queryInterface.addIndex("platform_templates", ["isActive"]);
      await queryInterface.addIndex("platform_templates", ["isDefault"]);
      await queryInterface.addIndex("platform_templates", ["userId"]);
      await queryInterface.addIndex("platform_templates", ["usageCount"]);

      // Compliance Documents table indexes
      await queryInterface.addIndex("compliance_documents", ["productId"]);
      await queryInterface.addIndex("compliance_documents", ["mainProductId"]);
      await queryInterface.addIndex("compliance_documents", ["documentType"]);
      await queryInterface.addIndex("compliance_documents", ["status"]);
      await queryInterface.addIndex("compliance_documents", ["expiryDate"]);
      await queryInterface.addIndex("compliance_documents", ["userId"]);

      // Turkish Compliance table indexes
      await queryInterface.addIndex("turkish_compliance", ["productId"]);
      await queryInterface.addIndex("turkish_compliance", ["mainProductId"]);
      await queryInterface.addIndex("turkish_compliance", ["gtip"]);
      await queryInterface.addIndex("turkish_compliance", ["complianceStatus"]);
      await queryInterface.addIndex("turkish_compliance", ["riskClass"]);
      await queryInterface.addIndex("turkish_compliance", ["userId"]);
    }
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
    // Drop new tables (in reverse order of creation)
    await queryInterface.dropTable("turkish_compliance", { cascade: true });
    await queryInterface.dropTable("compliance_documents", { cascade: true });
    await queryInterface.dropTable("platform_templates", { cascade: true });
    await queryInterface.dropTable("reply_templates", { cascade: true });
    await queryInterface.dropTable("question_stats", { cascade: true });
    await queryInterface.dropTable("enhanced_product_media", { cascade: true });
    await queryInterface.dropTable("platform_variants", { cascade: true });
    await queryInterface.dropTable("main_products", { cascade: true });
    await queryInterface.dropTable("customer_replies", { cascade: true });
    await queryInterface.dropTable("customer_questions", { cascade: true });
    await queryInterface.dropTable("customers", { cascade: true });
    // Drop existing tables
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
