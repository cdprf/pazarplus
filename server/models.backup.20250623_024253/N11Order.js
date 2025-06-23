const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class N11Order extends Model {}

N11Order.init({
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
  n11OrderId: {
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
  sellerId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  buyerId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  orderStatus: {
    type: DataTypes.ENUM,
    values: [
      'Yeni', 'Onaylandi', 'Hazirlaniyor', 'Kargoya_Verildi', 
      'Teslim_Edildi', 'Iptal_Edildi', 'Iade_Edildi'
    ],
    allowNull: false,
    defaultValue: 'Yeni'
  },
  paymentType: {
    type: DataTypes.ENUM,
    values: ['Kredi_Karti', 'Havale_EFT', 'Kapida_Odeme', 'N11_Cuzdan'],
    allowNull: true
  },
  paymentStatus: {
    type: DataTypes.ENUM,
    values: ['Bekliyor', 'Onaylandi', 'Iptal_Edildi'],
    allowNull: true
  },
  shippingCompany: {
    type: DataTypes.STRING,
    allowNull: true
  },
  trackingNumber: {
    type: DataTypes.STRING,
    allowNull: true,
    index: true
  },
  trackingUrl: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  estimatedDeliveryDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  actualDeliveryDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  shippingAddress: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'N11 shipping address details'
  },
  billingAddress: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'N11 billing address details'
  },
  customerInfo: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'N11 customer information'
  },
  invoiceInfo: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'N11 invoice details for Turkish tax compliance'
  },
  n11OrderDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  lastSyncAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Last synchronization with N11 platform'
  },
  platformFees: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'N11 platform commission fees'
  },
  cancellationReason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  returnReason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  platformOrderData: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Raw N11 order data for backup and debugging'
  }
}, {
  sequelize,
  modelName: 'N11Order',
  tableName: 'n11_orders',
  timestamps: true,
  indexes: [
    {
      fields: ['orderId']
    },
    {
      fields: ['n11OrderId'],
      unique: true
    },
    {
      fields: ['orderNumber']
    },
    {
      fields: ['sellerId']
    },
    {
      fields: ['orderStatus']
    },
    {
      fields: ['trackingNumber']
    },
    {
      fields: ['n11OrderDate']
    },
    {
      fields: ['lastSyncAt']
    }
  ]
});

module.exports = N11Order;