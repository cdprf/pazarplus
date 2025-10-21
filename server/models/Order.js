const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Order extends Model {}

Order.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true, // Allow null for guest checkouts
      references: {
        model: 'users',
        key: 'id'
      }
    },
    // Core order identifiers
    externalOrderId: {
      type: DataTypes.STRING,
      allowNull: false, // Changed: Made required for proper order tracking
      comment:
        'Order ID from the external platform (e.g., Trendyol order number)'
    },
    orderNumber: {
      type: DataTypes.STRING,
      allowNull: false, // Changed: Made required for display purposes
      comment: 'Order number for display purposes'
    },
    // Legacy platform fields - kept for backward compatibility
    platformType: {
      type: DataTypes.STRING,
      allowNull: true
    },
    platform: {
      type: DataTypes.STRING,
      allowNull: true
    },
    platformOrderId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    platformId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    // Platform connection reference
    connectionId: {
      type: DataTypes.INTEGER,
      allowNull: true, // Changed: Made nullable to support orders without platform connections
      references: {
        model: 'platform_connections',
        key: 'id'
      }
    },
    orderDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    orderStatus: {
      type: DataTypes.ENUM(
        'new',
        'pending',
        'processing',
        'shipped',
        'in_transit',
        'delivered',
        'cancelled',
        'returned',
        'failed',
        'unknown',
        'claim_created',
        'claim_approved',
        'claim_rejected',
        'refunded',
        'consolidated',
        'in_batch'
      ), // Enhanced: Added missing status values for platform compatibility including consolidated and in_batch
      allowNull: false,
      defaultValue: 'new' // Changed: Better default status
    },
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'TRY'
    },
    customerName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    customerEmail: {
      type: DataTypes.STRING,
      allowNull: true
    },
    customerPhone: {
      type: DataTypes.STRING,
      allowNull: true
    },
    // Customer information as JSON (required by database)
    customerInfo: {
      type: DataTypes.JSON,
      allowNull: false, // Changed to match database constraint
      defaultValue: {}, // Added default empty object
      comment: 'Customer information in JSON format'
    },
    // Shipping information
    shippingAddress: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: 'Shipping address information in JSON format'
    },
    shippingDetailId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'shipping_details',
        key: 'id'
      }
    },
    // Cargo tracking information
    cargoTrackingNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      comment:
        'Cargo tracking number from shipping provider (Trendyol, N11, etc.)'
    },
    cargoTrackingLink: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Link to the cargo tracking page'
    },
    cargoTrackingUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'URL for cargo tracking'
    },
    cargoCompany: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Name of the shipping provider'
    },
    // Invoice fields - updated names for consistency
    invoiceStatus: {
      // Changed: Renamed from eInvoiceStatus for consistency
      type: DataTypes.ENUM('pending', 'issued', 'cancelled'),
      allowNull: true,
      defaultValue: 'pending'
    },
    invoiceNumber: {
      // Added: For invoice tracking
      type: DataTypes.STRING,
      allowNull: true
    },
    invoiceDate: {
      // Changed: Renamed from eInvoiceDate for consistency
      type: DataTypes.DATE,
      allowNull: true
    },
    invoiceTotal: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Total invoice amount'
    },

    // Enhanced Trendyol-specific fields from API documentation
    isCommercial: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment:
        'Indicates if this is a corporate/commercial order (Trendyol commercial field)'
    },
    isMicroExport: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment:
        'Indicates if this is a micro export order (Trendyol micro field)'
    },
    fastDeliveryType: {
      type: DataTypes.ENUM('TodayDelivery', 'SameDayShipping', 'FastDelivery'),
      allowNull: true,
      comment: 'Fast delivery type from Trendyol API'
    },
    deliveryType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'normal',
      comment: 'Delivery type (normal, fast, etc.)'
    },
    deliveryAddressType: {
      type: DataTypes.ENUM('Shipment', 'CollectionPoint'),
      allowNull: false,
      defaultValue: 'Shipment',
      comment: 'Delivery address type - Shipment or CollectionPoint (PUDO)'
    },
    isGiftBoxRequested: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Indicates if customer requested gift box packaging'
    },
    etgbNo: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'ETGB number for micro export orders'
    },
    etgbDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'ETGB date for micro export orders'
    },
    is3pByTrendyol: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: '3P by Trendyol partnership flag'
    },
    containsDangerousProduct: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment:
        'Indicates if order contains dangerous products (batteries, perfumes, etc.)'
    },
    identityNumber: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment:
        'TCKN for high-value orders (gold, fertilizer, orders over 5000₺)'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    rawData: {
      type: DataTypes.JSON, // Enhanced: Changed from TEXT to JSON for better data handling
      allowNull: true,
      comment: 'Raw order data from platform API'
    },
    lastSyncedAt: {
      // Added: For tracking sync status
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Last time this order was synced from platform'
    },
    // Consolidation and batch processing fields
    isConsolidated: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Indicates if this order is part of a consolidated shipment'
    },
    consolidatedGroupId: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Groups orders that are consolidated together'
    },
    batchId: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Groups orders that are processed in the same batch'
    },
    // Shipping template association
    shippingTemplateId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'ID of the linked shipping template for this order'
    },
    // Shipping and Invoice Print Status Tracking
    shippingLabelPrinted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Indicates if shipping label has been printed for this order'
    },
    shippingLabelPrintedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Date and time when shipping label was printed'
    },
    invoicePrinted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Indicates if invoice has been printed for this order'
    },
    invoicePrintedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Date and time when invoice was printed'
    },
    // Error handling fields
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Error message for failed orders or operations'
    },
    retryCount: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      comment: 'Number of retry attempts for failed operations'
    }
  },
  {
    sequelize,
    modelName: 'Order',
    tableName: 'orders',
    timestamps: true,
    indexes: [
      {
        fields: ['userId']
      },
      {
        fields: ['externalOrderId', 'connectionId'], // Enhanced: Better unique constraint
        unique: true,
        name: 'unique_external_order_per_connection'
      },
      {
        fields: ['orderStatus']
      },
      {
        fields: ['orderDate'] // Added: For date-based queries
      },
      {
        fields: ['connectionId'] // Added: For platform-based queries
      },
      {
        fields: ['isConsolidated'] // Added: For consolidation queries
      },
      {
        fields: ['batchId'], // Added: For batch processing queries
        where: {
          batchId: {
            [sequelize.Sequelize.Op.ne]: null
          }
        }
      },
      {
        fields: ['shippingTemplateId'] // Added: For template-based queries
      },
      {
        fields: ['isCommercial'] // Added: For commercial order queries
      },
      {
        fields: ['isMicroExport'] // Added: For micro export order queries
      },
      {
        fields: ['fastDeliveryType'] // Added: For fast delivery filtering
      },
      // Keep legacy index for backward compatibility
      {
        fields: ['platformOrderId', 'platformId'],
        unique: false,
        name: 'legacy_platform_order_index'
      },
      // Error handling indexes
      {
        fields: ['errorMessage'],
        name: 'orders_error_message_idx'
      },
      {
        fields: ['retryCount'],
        name: 'orders_retry_count_idx'
      }
    ]
  }
);

module.exports = Order;
