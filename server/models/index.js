const sequelize = require("../config/database");
const User = require("./User");
const Order = require("./Order");
const OrderItem = require("./OrderItem");
const Product = require("./Product");
const PlatformConnection = require("./PlatformConnection");
const ShippingDetail = require("./ShippingDetail");
const HepsiburadaOrder = require("./HepsiburadaOrder");
const N11Order = require("./N11Order");
const TrendyolOrder = require("./TrendyolOrder");
const ShippingCarrier = require("./ShippingCarrier");
const ShippingRate = require("./ShippingRate");
const TurkishCompliance = require("./TurkishCompliance");

// Define associations
User.hasMany(Order, { foreignKey: "userId", as: "orders" });
Order.belongsTo(User, { foreignKey: "userId", as: "user" });

User.hasMany(Product, { foreignKey: "userId", as: "products" });
Product.belongsTo(User, { foreignKey: "userId", as: "user" });

Order.hasMany(OrderItem, { foreignKey: "orderId", as: "items" });
OrderItem.belongsTo(Order, { foreignKey: "orderId", as: "order" });

User.hasMany(PlatformConnection, {
  foreignKey: "userId",
  as: "platformConnections",
});
PlatformConnection.belongsTo(User, { foreignKey: "userId", as: "user" });

Order.belongsTo(ShippingDetail, {
  foreignKey: "shippingDetailId",
  as: "shippingDetail",
});
ShippingDetail.hasMany(Order, { foreignKey: "shippingDetailId", as: "orders" });

PlatformConnection.hasMany(Order, { foreignKey: "connectionId", as: "orders" });
Order.belongsTo(PlatformConnection, {
  foreignKey: "connectionId",
  as: "platformConnection",
});

// Platform-specific order associations
Order.hasOne(HepsiburadaOrder, {
  foreignKey: "orderId",
  as: "hepsiburadaOrder",
});
HepsiburadaOrder.belongsTo(Order, { foreignKey: "orderId", as: "order" });

Order.hasOne(N11Order, { foreignKey: "orderId", as: "n11Order" });
N11Order.belongsTo(Order, { foreignKey: "orderId", as: "order" });

Order.hasOne(TrendyolOrder, { foreignKey: "orderId", as: "trendyolOrder" });
TrendyolOrder.belongsTo(Order, { foreignKey: "orderId", as: "order" });

// Shipping carrier associations
ShippingCarrier.hasMany(ShippingRate, { foreignKey: "carrierId", as: "rates" });
ShippingRate.belongsTo(ShippingCarrier, {
  foreignKey: "carrierId",
  as: "carrier",
});

Order.hasMany(ShippingRate, { foreignKey: "orderId", as: "shippingRates" });
ShippingRate.belongsTo(Order, { foreignKey: "orderId", as: "order" });

// Optional: Add carrier to shipping detail for selected carrier
ShippingDetail.belongsTo(ShippingCarrier, {
  foreignKey: "carrierId",
  as: "carrier",
});
ShippingCarrier.hasMany(ShippingDetail, {
  foreignKey: "carrierId",
  as: "shipments",
});

// Turkish compliance associations
Order.hasOne(TurkishCompliance, {
  foreignKey: "orderId",
  as: "turkishCompliance",
});
TurkishCompliance.belongsTo(Order, { foreignKey: "orderId", as: "order" });

module.exports = {
  sequelize,
  User,
  Order,
  OrderItem,
  Product,
  PlatformConnection,
  ShippingDetail,
  HepsiburadaOrder,
  N11Order,
  TrendyolOrder,
  ShippingCarrier,
  ShippingRate,
  TurkishCompliance,
};
