const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class ShippingRate extends Model {}

ShippingRate.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  carrierId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'shipping_carriers',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  orderId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'orders',
      key: 'id'
    },
    onDelete: 'SET NULL'
  },
  serviceType: {
    type: DataTypes.ENUM,
    values: ['STANDARD', 'EXPRESS', 'NEXT_DAY', 'SAME_DAY', 'ECONOMY'],
    allowNull: false,
    defaultValue: 'STANDARD'
  },
  fromCity: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Origin city name'
  },
  fromPostalCode: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Origin postal code'
  },
  toCity: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Destination city name'
  },
  toPostalCode: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Destination postal code'
  },
  weight: {
    type: DataTypes.DECIMAL(10, 3),
    allowNull: false,
    comment: 'Package weight in kg'
  },
  dimensions: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Package dimensions {length, width, height} in cm'
  },
  basePrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'Base shipping price in TRY'
  },
  taxAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    comment: 'KDV amount in TRY'
  },
  totalPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'Total price including tax in TRY'
  },
  currency: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'TRY'
  },
  deliveryTime: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Estimated delivery time'
  },
  deliveryDate: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Estimated delivery date'
  },
  cashOnDelivery: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'COD service requested'
  },
  codFee: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0,
    comment: 'Cash on delivery fee'
  },
  insurance: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Insurance service requested'
  },
  insuranceFee: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0,
    comment: 'Insurance fee'
  },
  additionalServices: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Additional services and fees'
  },
  rateValidUntil: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Rate validity expiration'
  },
  calculatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'When this rate was calculated'
  },
  isSelected: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether this rate was selected for the order'
  },
  carrierResponse: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Raw carrier API response for debugging'
  },
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Error message if rate calculation failed'
  }
}, {
  sequelize,
  modelName: 'ShippingRate',
  tableName: 'shipping_rates',
  timestamps: true,
  indexes: [
    {
      fields: ['carrierId']
    },
    {
      fields: ['orderId']
    },
    {
      fields: ['fromCity', 'toCity']
    },
    {
      fields: ['serviceType']
    },
    {
      fields: ['isSelected']
    },
    {
      fields: ['calculatedAt']
    },
    {
      fields: ['rateValidUntil']
    }
  ]
});

module.exports = ShippingRate;