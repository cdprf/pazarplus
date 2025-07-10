const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Invoice extends Model {
  // Check if invoice is overdue
  isOverdue() {
    return this.status === 'open' && this.dueDate && new Date() > this.dueDate;
  }

  // Get days since due date
  getDaysOverdue() {
    if (!this.isOverdue()) {return 0;}
    const diffTime = new Date() - this.dueDate;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // Calculate total with tax
  getTotalWithTax() {
    const subtotal = parseFloat(this.subtotal);
    const taxAmount = parseFloat(this.taxAmount || 0);
    return subtotal + taxAmount;
  }
}

Invoice.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },

    // Invoice identification
    invoiceNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      comment: 'Unique invoice number (e.g., INV-2025-001)'
    },

    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },

    subscriptionId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'subscriptions',
        key: 'id'
      },
      onDelete: 'SET NULL'
    },

    // Invoice details
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Invoice description or memo'
    },

    // Financial information
    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Subtotal amount before tax'
    },

    taxAmount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      comment: 'Tax amount (KDV for Turkish customers)'
    },

    taxRate: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
      comment: 'Tax rate percentage'
    },

    discountAmount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      comment: 'Discount amount applied'
    },

    total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Total amount including tax and discounts'
    },

    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'TRY',
      allowNull: false
    },

    // Invoice status and dates
    status: {
      type: DataTypes.ENUM('draft', 'open', 'paid', 'void', 'uncollectible'),
      defaultValue: 'draft',
      allowNull: false
    },

    issueDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },

    dueDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Payment due date'
    },

    paidAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When invoice was paid'
    },

    voidedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When invoice was voided'
    },

    // Billing period
    periodStart: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Start of billing period this invoice covers'
    },

    periodEnd: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'End of billing period this invoice covers'
    },

    // Payment information
    paymentMethod: {
      type: DataTypes.ENUM('credit_card', 'bank_transfer', 'iyzico', 'stripe'),
      allowNull: true
    },

    paymentReference: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Payment processor reference/transaction ID'
    },

    // Turkish tax compliance
    taxNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Customer tax number for Turkish compliance'
    },

    taxOffice: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Tax office for Turkish compliance'
    },

    // Customer information (snapshot at time of invoice)
    customerInfo: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: 'Customer information snapshot for this invoice'
    },

    billingAddress: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: 'Billing address for this invoice'
    },

    // Invoice items
    lineItems: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'Invoice line items with quantities and prices'
    },

    // Additional fields
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Internal notes about this invoice'
    },

    metadata: {
      type: DataTypes.JSON,
      defaultValue: {},
      comment: 'Additional invoice metadata'
    },

    // File attachments
    pdfUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'URL to PDF version of invoice'
    }
  },
  {
    sequelize,
    modelName: 'Invoice',
    tableName: 'invoices',
    timestamps: true,
    indexes: [
      {
        fields: ['invoiceNumber'],
        unique: true
      },
      {
        fields: ['userId']
      },
      {
        fields: ['subscriptionId']
      },
      {
        fields: ['status']
      },
      {
        fields: ['issueDate']
      },
      {
        fields: ['dueDate']
      },
      {
        fields: ['periodStart', 'periodEnd']
      }
    ]
  }
);

module.exports = Invoice;
