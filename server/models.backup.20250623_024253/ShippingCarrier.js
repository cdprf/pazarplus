const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class ShippingCarrier extends Model {}

ShippingCarrier.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Carrier name (e.g., Aras Kargo, Yurtiçi Kargo)'
  },
  code: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: 'Unique carrier code for API integration'
  },
  carrierType: {
    type: DataTypes.ENUM,
    values: ['TURKISH_DOMESTIC', 'INTERNATIONAL', 'EXPRESS'],
    allowNull: false,
    defaultValue: 'TURKISH_DOMESTIC'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  },
  apiEndpoint: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Base API URL for carrier integration'
  },
  trackingUrlTemplate: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'URL template for tracking with {trackingNumber} placeholder'
  },
  supportedServices: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Supported shipping services (standard, express, etc.)'
  },
  credentials: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Encrypted API credentials for carrier integration'
  },
  configuration: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Carrier-specific configuration settings'
  },
  coverage: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Coverage areas and delivery options'
  },
  pricingInfo: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Pricing structure and calculation rules'
  },
  deliveryTimeRange: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Expected delivery time (e.g., "1-3 business days")'
  },
  maxWeight: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Maximum weight in kg'
  },
  maxDimensions: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Maximum dimensions {length, width, height} in cm'
  },
  cashOnDeliverySupported: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether carrier supports COD (Kapıda Ödeme)'
  },
  insuranceSupported: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether carrier supports package insurance'
  },
  returnSupported: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether carrier supports return shipping'
  },
  businessDaysOnly: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Whether delivery is only on business days'
  },
  contactInfo: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Contact information for carrier support'
  }
}, {
  sequelize,
  modelName: 'ShippingCarrier',
  tableName: 'shipping_carriers',
  timestamps: true,
  indexes: [
    {
      fields: ['code'],
      unique: true
    },
    {
      fields: ['carrierType']
    },
    {
      fields: ['isActive']
    },
    {
      fields: ['name']
    }
  ]
});

module.exports = ShippingCarrier;