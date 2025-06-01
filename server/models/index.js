const sequelize = require("../config/database");
const User = require("./User");
const Order = require("./Order");
const OrderItem = require("./OrderItem");
const Product = require("./Product");
const PlatformConnection = require("./PlatformConnection");
const PlatformData = require("./PlatformData");
const ShippingDetail = require("./ShippingDetail");
const HepsiburadaOrder = require("./HepsiburadaOrder");
const N11Order = require("./N11Order");
const TrendyolOrder = require("./TrendyolOrder");
const ShippingCarrier = require("./ShippingCarrier");
const ShippingRate = require("./ShippingRate");
const TurkishCompliance = require("./TurkishCompliance");
const ComplianceDocuments = require("./ComplianceDocuments");

// === NEW SUBSCRIPTION MODELS ===
const Subscription = require("./Subscription");
const UsageRecord = require("./UsageRecord");
const Invoice = require("./Invoice");

// Initialize models with sequelize
const models = {
  User: User,
  Order: Order,
  OrderItem: OrderItem,
  Product: Product,
  PlatformConnection: PlatformConnection,
  PlatformData: PlatformData,
  ShippingDetail: ShippingDetail,
  HepsiburadaOrder: HepsiburadaOrder,
  N11Order: N11Order,
  TrendyolOrder: TrendyolOrder,
  ShippingCarrier: ShippingCarrier,
  ShippingRate: ShippingRate,
  TurkishCompliance: TurkishCompliance,
  ComplianceDocuments: ComplianceDocuments,

  // === SUBSCRIPTION MODELS ===
  Subscription: Subscription,
  UsageRecord: UsageRecord,
  Invoice: Invoice,
};

// Define associations
models.User.hasMany(models.Order, { foreignKey: "userId", as: "orders" });
models.Order.belongsTo(models.User, { foreignKey: "userId", as: "user" });

models.User.hasMany(models.Product, { foreignKey: "userId", as: "products" });
models.Product.belongsTo(models.User, { foreignKey: "userId", as: "user" });

models.Order.hasMany(models.OrderItem, { foreignKey: "orderId", as: "items" });
models.OrderItem.belongsTo(models.Order, {
  foreignKey: "orderId",
  as: "order",
});

// Add Product <-> OrderItem association
models.Product.hasMany(models.OrderItem, {
  foreignKey: "productId",
  as: "orderItems",
});
models.OrderItem.belongsTo(models.Product, {
  foreignKey: "productId",
  as: "product",
});

models.User.hasMany(models.PlatformConnection, {
  foreignKey: "userId",
  as: "platformConnections",
});
models.PlatformConnection.belongsTo(models.User, {
  foreignKey: "userId",
  as: "user",
});

models.Order.belongsTo(models.ShippingDetail, {
  foreignKey: "shippingDetailId",
  as: "shippingDetail",
});
models.ShippingDetail.hasMany(models.Order, {
  foreignKey: "shippingDetailId",
  as: "orders",
});

models.PlatformConnection.hasMany(models.Order, {
  foreignKey: "connectionId",
  as: "orders",
});
models.Order.belongsTo(models.PlatformConnection, {
  foreignKey: "connectionId",
  as: "platformConnection",
});

// Platform-specific order associations
models.Order.hasOne(models.HepsiburadaOrder, {
  foreignKey: "orderId",
  as: "hepsiburadaOrder",
});
models.HepsiburadaOrder.belongsTo(models.Order, {
  foreignKey: "orderId",
  as: "order",
});

models.Order.hasOne(models.N11Order, { foreignKey: "orderId", as: "n11Order" });
models.N11Order.belongsTo(models.Order, { foreignKey: "orderId", as: "order" });

models.Order.hasOne(models.TrendyolOrder, {
  foreignKey: "orderId",
  as: "trendyolOrder",
});
models.TrendyolOrder.belongsTo(models.Order, {
  foreignKey: "orderId",
  as: "order",
});

// Shipping carrier associations
models.ShippingCarrier.hasMany(models.ShippingRate, {
  foreignKey: "carrierId",
  as: "rates",
});
models.ShippingRate.belongsTo(models.ShippingCarrier, {
  foreignKey: "carrierId",
  as: "carrier",
});

models.Order.hasMany(models.ShippingRate, {
  foreignKey: "orderId",
  as: "shippingRates",
});
models.ShippingRate.belongsTo(models.Order, {
  foreignKey: "orderId",
  as: "order",
});

// Optional: Add carrier to shipping detail for selected carrier
models.ShippingDetail.belongsTo(models.ShippingCarrier, {
  foreignKey: "carrierId",
  as: "carrier",
});
models.ShippingCarrier.hasMany(models.ShippingDetail, {
  foreignKey: "carrierId",
  as: "shipments",
});

// Turkish compliance associations
models.Order.hasOne(models.TurkishCompliance, {
  foreignKey: "orderId",
  as: "turkishCompliance",
});
models.TurkishCompliance.belongsTo(models.Order, {
  foreignKey: "orderId",
  as: "order",
});

// Enhanced compliance documents associations
models.Order.hasMany(models.ComplianceDocuments, {
  foreignKey: "orderId",
  as: "complianceDocuments",
});
models.ComplianceDocuments.belongsTo(models.Order, {
  foreignKey: "orderId",
  as: "order",
});

// === SUBSCRIPTION ASSOCIATIONS ===

// User <-> Subscription (One-to-Many)
models.User.hasMany(models.Subscription, {
  foreignKey: "userId",
  as: "subscriptions",
});
models.Subscription.belongsTo(models.User, {
  foreignKey: "userId",
  as: "user",
});

// User <-> UsageRecord (One-to-Many)
models.User.hasMany(models.UsageRecord, {
  foreignKey: "userId",
  as: "usageRecords",
});
models.UsageRecord.belongsTo(models.User, {
  foreignKey: "userId",
  as: "user",
});

// Subscription <-> UsageRecord (One-to-Many)
models.Subscription.hasMany(models.UsageRecord, {
  foreignKey: "subscriptionId",
  as: "usageRecords",
});
models.UsageRecord.belongsTo(models.Subscription, {
  foreignKey: "subscriptionId",
  as: "subscription",
});

// User <-> Invoice (One-to-Many)
models.User.hasMany(models.Invoice, {
  foreignKey: "userId",
  as: "invoices",
});
models.Invoice.belongsTo(models.User, {
  foreignKey: "userId",
  as: "user",
});

// Subscription <-> Invoice (One-to-Many)
models.Subscription.hasMany(models.Invoice, {
  foreignKey: "subscriptionId",
  as: "invoices",
});
models.Invoice.belongsTo(models.Subscription, {
  foreignKey: "subscriptionId",
  as: "subscription",
});

// User self-referencing for referrals
models.User.hasMany(models.User, {
  foreignKey: "referredBy",
  as: "referrals",
});
models.User.belongsTo(models.User, {
  foreignKey: "referredBy",
  as: "referrer",
});

// === PLATFORM DATA ASSOCIATIONS ===

// Product <-> PlatformData (One-to-Many)
models.Product.hasMany(models.PlatformData, {
  foreignKey: "entityId",
  scope: { entityType: "product" },
  as: "platformData",
});
models.PlatformData.belongsTo(models.Product, {
  foreignKey: "entityId",
  constraints: false,
  as: "product",
});

// Order <-> PlatformData (One-to-Many)
models.Order.hasMany(models.PlatformData, {
  foreignKey: "entityId",
  scope: { entityType: "order" },
  as: "platformData",
});
models.PlatformData.belongsTo(models.Order, {
  foreignKey: "entityId",
  constraints: false,
  as: "order",
});

module.exports = {
  sequelize,
  ...models,
};
