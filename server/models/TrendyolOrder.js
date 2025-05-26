const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class TrendyolOrder extends Model {}

TrendyolOrder.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  orderId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'orders',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  trendyolOrderId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    index: true
  },
  orderNumber: {
    type: DataTypes.STRING,
    allowNull: true,
    index: true
  },
  supplierId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  customerId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  orderStatus: {
    type: DataTypes.ENUM,
    values: [
      'Created', 'Picking', 'Picked', 'Cancelled', 'Shipped', 
      'Delivered', 'UnDelivered', 'Returned', 'Repack'
    ],
    allowNull: false,
    defaultValue: 'Created'
  },
  paymentType: {
    type: DataTypes.ENUM,
    values: ['Kredi_Karti', 'Havale_EFT', 'Kapida_Odeme', 'Trendyol_Kredisi'],
    allowNull: true
  },
  paymentStatus: {
    type: DataTypes.ENUM,
    values: ['Waiting', 'Paid', 'Cancelled'],
    allowNull: true
  },
  cargoProviderName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  cargoTrackingNumber: {
    type: DataTypes.STRING,
    allowNull: true,
    index: true
  },
  cargoTrackingLink: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  estimatedDeliveryStartDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  estimatedDeliveryEndDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  shipmentAddress: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Trendyol shipment address details'
  },
  invoiceAddress: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Trendyol invoice address details'
  },
  customerInfo: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Trendyol customer information'
  },
  invoiceData: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Trendyol invoice details for Turkish compliance'
  },
  trendyolOrderDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  lastModifiedDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  lastSyncAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Last synchronization with Trendyol platform'
  },
  commercialInvoiceNumber: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Turkish commercial invoice number'
  },
  grossAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  totalDiscount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  taxNumber: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Turkish tax number (VKN/TCKN)'
  },
  deliveryType: {
    type: DataTypes.STRING,
    allowNull: true
  },
  timeSlotId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  fastDelivery: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  scheduledDelivery: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  agreedDeliveryDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  packingListId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  shipmentPackageStatus: {
    type: DataTypes.STRING,
    allowNull: true
  },
  currency: {
    type: DataTypes.STRING,
    defaultValue: 'TRY',
    allowNull: false
  },
  platformOrderData: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Raw Trendyol order data for backup and debugging'
  }
}, {
  sequelize,
  modelName: 'TrendyolOrder',
  tableName: 'trendyol_orders',
  timestamps: true,
  indexes: [
    {
      fields: ['orderId']
    },
    {
      fields: ['trendyolOrderId'],
      unique: true
    },
    {
      fields: ['orderNumber']
    },
    {
      fields: ['supplierId']
    },
    {
      fields: ['orderStatus']
    },
    {
      fields: ['cargoTrackingNumber']
    },
    {
      fields: ['trendyolOrderDate']
    },
    {
      fields: ['lastSyncAt']
    },
    {
      fields: ['commercialInvoiceNumber']
    }
  ]
});

module.exports = TrendyolOrder;