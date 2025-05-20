// src/models/index.js
const { sequelize } = require('../config/database');
const { DataTypes } = require('sequelize');

// Import model definitions
const OrderModel = require('./Order');
const OrderItemModel = require('./OrderItem');
const ShippingDetailModel = require('./ShippingDetail');
const ProductModel = require('./Product');
const CategoryModel = require('./Category');
const User = require('./user.model');
const PlatformConnection = require('./platform-connection.model');
const TrendyolOrderModel = require('./TrendyolOrder');
const HepsiburadaOrderModel = require('./HepsiburadaOrder');
const PlatformData = require('./platform-data')(sequelize, DataTypes);
const PlatformAttribute = require('./platform-attribute')(sequelize, DataTypes);
const PlatformSchema = require('./platform-schema')(sequelize, DataTypes);
const OrderHistoryModel = require('./OrderHistory');
const FinancialTransactionModel = require('./FinancialTransaction');

// Initialize models
const Order = OrderModel(sequelize, DataTypes);
const OrderItem = OrderItemModel(sequelize, DataTypes);
const ShippingDetail = ShippingDetailModel(sequelize, DataTypes);
const Product = ProductModel(sequelize, DataTypes);
const Category = CategoryModel(sequelize, DataTypes);
const TrendyolOrder = TrendyolOrderModel(sequelize, DataTypes);
const HepsiburadaOrder = HepsiburadaOrderModel(sequelize, DataTypes);
const OrderHistory = OrderHistoryModel(sequelize, DataTypes);
const FinancialTransaction = FinancialTransactionModel(sequelize, DataTypes);

// Create models object
const models = {
  User,
  PlatformConnection,
  Order,
  OrderItem,
  ShippingDetail,
  Product,
  Category,
  TrendyolOrder,
  HepsiburadaOrder,
  PlatformData,
  PlatformAttribute,
  PlatformSchema,
  OrderHistory,
  FinancialTransaction
};

// Call associate methods if they exist
Object.keys(models).forEach(modelName => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
  // Safely call associateWith if it exists
  if (typeof models[modelName].associateWith === 'function') {
    // Attach to Order and Product for polymorphic associations
    if (modelName === 'PlatformData') {
      models[modelName].associateWith('Order', models);
      models[modelName].associateWith('Product', models);
    }
    if (modelName === 'PlatformAttribute') {
      models[modelName].associateWith('Order', models);
      models[modelName].associateWith('Product', models);
    }
  }
});

// Set up associations
PlatformData.hasMany(PlatformAttribute, {
  foreignKey: 'entityId',
  constraints: false,
  scope: {
    entityType: 'platform_data'
  }
});

PlatformAttribute.belongsTo(PlatformData, {
  foreignKey: 'entityId',
  constraints: false
});

// Removed manual Product/Order <-> PlatformData associations to avoid alias conflicts with associateWith

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