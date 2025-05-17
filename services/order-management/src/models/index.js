// src/models/index.js
const { sequelize } = require('../config/database');
const { DataTypes } = require('sequelize');
const User = require('./user.model');
const PlatformConnection = require('./platform-connection.model');

// Import model definitions
const OrderModel = require('./Order');
const OrderItemModel = require('./OrderItem');
const ShippingDetailModel = require('./ShippingDetail');
const ProductModel = require('./Product');

// Initialize models
const Order = OrderModel(sequelize, DataTypes);
const OrderItem = OrderItemModel(sequelize, DataTypes);
const ShippingDetail = ShippingDetailModel(sequelize, DataTypes);
const Product = ProductModel(sequelize, DataTypes);

// Define relationships
User.hasMany(PlatformConnection, { foreignKey: 'userId' });
PlatformConnection.belongsTo(User, { foreignKey: 'userId' });

Order.belongsTo(User, { foreignKey: 'userId' });
Order.belongsTo(PlatformConnection, { foreignKey: 'platformId' });
Order.hasOne(ShippingDetail, { foreignKey: 'orderId' });
Order.hasMany(OrderItem, { foreignKey: 'orderId' });

OrderItem.belongsTo(Order, { foreignKey: 'orderId' });
OrderItem.belongsTo(Product, { foreignKey: 'productId' });

ShippingDetail.belongsTo(Order, { foreignKey: 'orderId' });

Product.belongsTo(User, { foreignKey: 'userId' });
Product.hasMany(OrderItem, { foreignKey: 'productId' });

// Sync all models with database
const syncDatabase = async (force = false) => {
  try {
    await User.sync({ force });
    await PlatformConnection.sync({ force });
    await Order.sync({ force });
    await OrderItem.sync({ force });
    await ShippingDetail.sync({ force });
    await Product.sync({ force });
    console.log('Database models synchronized');
    return true;
  } catch (error) {
    console.error('Failed to synchronize database models:', error);
    return false;
  }
};

module.exports = {
  User,
  PlatformConnection,
  Order,
  OrderItem,
  ShippingDetail,
  Product,
  syncDatabase
};