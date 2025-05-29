"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
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
        onDelete: "CASCADE",
      },
      planId: {
        type: Sequelize.STRING,
        allowNull: false,
        comment:
          "Subscription plan identifier (trial, starter, professional, enterprise)",
      },
      planName: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM(
          "trial",
          "active",
          "past_due",
          "canceled",
          "unpaid"
        ),
        defaultValue: "trial",
        allowNull: false,
      },
      amount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: "Subscription amount in kuruş (Turkish currency subunit)",
      },
      currency: {
        type: Sequelize.STRING(3),
        defaultValue: "TRY",
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
        comment:
          "When subscription ends (for trials or canceled subscriptions)",
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
        comment: "When paid subscription started (after trial)",
      },
      subscriptionEndsAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      nextBillingAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      nextBillingAmount: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: "Amount for next billing cycle in kuruş",
      },
      cancelAtPeriodEnd: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      canceledAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      cancellationReason: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      features: {
        type: Sequelize.JSON,
        defaultValue: [],
        comment: "Array of enabled features for this subscription",
      },
      limits: {
        type: Sequelize.JSON,
        defaultValue: {},
        comment: "Usage limits for this subscription",
      },
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

    // Create UsageRecords table
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
        onDelete: "CASCADE",
      },
      subscriptionId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "subscriptions",
          key: "id",
        },
        onDelete: "SET NULL",
      },
      metricType: {
        type: Sequelize.ENUM(
          "apiCalls",
          "platforms",
          "users",
          "reports",
          "storage"
        ),
        allowNull: false,
      },
      currentUsage: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
      },
      limit: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: "Usage limit for this metric (-1 for unlimited)",
      },
      billingPeriodStart: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      billingPeriodEnd: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      lastResetAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: "When usage was last reset",
      },
      warningsSent: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: "Number of usage warning emails sent",
      },
      metadata: {
        type: Sequelize.JSON,
        defaultValue: {},
        comment: "Additional usage metadata",
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
      invoiceNumber: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
        comment: "Unique invoice number (e.g., INV-2025-001)",
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      subscriptionId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "subscriptions",
          key: "id",
        },
        onDelete: "SET NULL",
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: "Invoice description or memo",
      },
      subtotal: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        comment: "Subtotal amount before tax",
      },
      taxAmount: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0,
        comment: "Tax amount (KDV for Turkish customers)",
      },
      taxRate: {
        type: Sequelize.DECIMAL(5, 2),
        defaultValue: 0,
        comment: "Tax rate percentage",
      },
      discountAmount: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0,
        comment: "Discount amount applied",
      },
      total: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        comment: "Total amount including tax and discounts",
      },
      currency: {
        type: Sequelize.STRING(3),
        defaultValue: "TRY",
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM("draft", "open", "paid", "void", "uncollectible"),
        defaultValue: "draft",
        allowNull: false,
      },
      issueDate: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      dueDate: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: "Payment due date",
      },
      paidAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: "When invoice was paid",
      },
      voidedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: "When invoice was voided",
      },
      periodStart: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: "Start of billing period this invoice covers",
      },
      periodEnd: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: "End of billing period this invoice covers",
      },
      paymentMethod: {
        type: Sequelize.ENUM(
          "credit_card",
          "bank_transfer",
          "iyzico",
          "stripe"
        ),
        allowNull: true,
      },
      paymentReference: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Payment processor reference/transaction ID",
      },
      taxNumber: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Customer tax number for Turkish compliance",
      },
      taxOffice: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Tax office for Turkish compliance",
      },
      customerInfo: {
        type: Sequelize.JSON,
        defaultValue: {},
        comment: "Customer information snapshot for this invoice",
      },
      billingAddress: {
        type: Sequelize.JSON,
        defaultValue: {},
        comment: "Billing address for this invoice",
      },
      lineItems: {
        type: Sequelize.JSON,
        defaultValue: [],
        comment: "Invoice line items with quantities and prices",
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: "Internal notes about this invoice",
      },
      metadata: {
        type: Sequelize.JSON,
        defaultValue: {},
        comment: "Additional invoice metadata",
      },
      pdfUrl: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "URL to PDF version of invoice",
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

    // Create indexes for better performance
    await queryInterface.addIndex("subscriptions", ["userId"]);
    await queryInterface.addIndex("subscriptions", ["status"]);
    await queryInterface.addIndex("subscriptions", ["planId"]);
    await queryInterface.addIndex("subscriptions", ["nextBillingAt"]);

    await queryInterface.addIndex("usage_records", ["userId"]);
    await queryInterface.addIndex("usage_records", ["subscriptionId"]);
    await queryInterface.addIndex("usage_records", ["metricType"]);
    await queryInterface.addIndex("usage_records", [
      "billingPeriodStart",
      "billingPeriodEnd",
    ]);

    await queryInterface.addIndex("invoices", ["invoiceNumber"], {
      unique: true,
    });
    await queryInterface.addIndex("invoices", ["userId"]);
    await queryInterface.addIndex("invoices", ["subscriptionId"]);
    await queryInterface.addIndex("invoices", ["status"]);
    await queryInterface.addIndex("invoices", ["issueDate"]);
    await queryInterface.addIndex("invoices", ["dueDate"]);
    await queryInterface.addIndex("invoices", ["periodStart", "periodEnd"]);

    console.log("✅ Subscription tables created successfully");
  },

  down: async (queryInterface, Sequelize) => {
    // Drop tables in reverse order due to foreign key constraints
    await queryInterface.dropTable("invoices");
    await queryInterface.dropTable("usage_records");
    await queryInterface.dropTable("subscriptions");

    console.log("✅ Subscription tables dropped successfully");
  },
};
