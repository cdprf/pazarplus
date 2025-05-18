// src/models/index.js
const { sequelize } = require('../config/database');
const { DataTypes } = require('sequelize');

// Import model definitions
const OrderModel = require('./Order');
const OrderItemModel = require('./OrderItem');
const ShippingDetailModel = require('./ShippingDetail');
const ProductModel = require('./Product');
const User = require('./user.model');
const PlatformConnection = require('./platform-connection.model');
const TrendyolOrderModel = require('./TrendyolOrder');
const HepsiburadaOrderModel = require('./HepsiburadaOrder');

// Initialize models
const Order = OrderModel(sequelize, DataTypes);
const OrderItem = OrderItemModel(sequelize, DataTypes);
const ShippingDetail = ShippingDetailModel(sequelize, DataTypes);
const Product = ProductModel(sequelize, DataTypes);
const TrendyolOrder = TrendyolOrderModel(sequelize, DataTypes);
const HepsiburadaOrder = HepsiburadaOrderModel(sequelize, DataTypes);

// Create models object
const models = {
  User,
  PlatformConnection,
  Order,
  OrderItem,
  ShippingDetail,
  Product,
  TrendyolOrder,
  HepsiburadaOrder
};

// Call associate methods if they exist
Object.keys(models).forEach(modelName => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

// Sync all models with database
const syncDatabase = async (force = false) => {
  try {
    for (const model of Object.values(models)) {
      await model.sync({ force });
    }
    console.log('Database models synchronized');
    return true;
  } catch (error) {
    console.error('Failed to synchronize database models:', error);
    return false;
  }
};

module.exports = {
  sequelize,
  ...models,
  syncDatabase
};