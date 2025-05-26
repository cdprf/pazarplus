const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class HepsiburadaOrder extends Model {}

HepsiburadaOrder.init({
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
  packageNumber: {
    type: DataTypes.STRING,
    allowNull: true,
    index: true
  },
  merchantId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  customerId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  orderNumber: {
    type: DataTypes.STRING,
    allowNull: true,
    index: true
  },
  referenceNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  cargoCompany: {
    type: DataTypes.STRING,
    allowNull: true
  },
  cargoTrackingNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  cargoTrackingUrl: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  paymentType: {
    type: DataTypes.STRING,
    allowNull: true
  },
  platformStatus: {
    type: DataTypes.STRING,
    allowNull: true
  },
  paymentStatus: {
    type: DataTypes.STRING,
    allowNull: true
  },
  shippingAddressJson: {
    type: DataTypes.JSON,
    allowNull: true
  },
  billingAddressJson: {
    type: DataTypes.JSON,
    allowNull: true
  },
  deliveryAddressJson: {
    type: DataTypes.JSON,
    allowNull: true
  },
  invoiceDetailsJson: {
    type: DataTypes.JSON,
    allowNull: true
  },
  customerJson: {
    type: DataTypes.JSON,
    allowNull: true
  },
  createdDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  orderDate: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  sequelize,
  modelName: 'HepsiburadaOrder',
  tableName: 'hepsiburada_orders',
  timestamps: true,
  indexes: [
    {
      fields: ['orderId']
    },
    {
      fields: ['packageNumber']
    },
    {
      fields: ['orderNumber']
    },
    {
      fields: ['merchantId']
    }
  ]
});

module.exports = HepsiburadaOrder;