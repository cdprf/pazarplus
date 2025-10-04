const sequelize = require("../config/database");
const User = require("./User");
const Order = require("./Order");
const OrderItem = require("./OrderItem");
const Product = require("./Product");
const Customer = require("./Customer");
const PlatformConnection = require("./PlatformConnection");
const PlatformData = require("./PlatformData");
const PlatformConflict = require("./PlatformConflict");
const ShippingDetail = require("./ShippingDetail");
const HepsiburadaOrder = require("./HepsiburadaOrder");
const N11Order = require("./N11Order");
const TrendyolOrder = require("./TrendyolOrder");
const ShippingCarrier = require("./ShippingCarrier");
const ShippingRate = require("./ShippingRate");
const TurkishCompliance = require("./TurkishCompliance");
const ComplianceDocuments = require("./ComplianceDocuments");
const Settings = require("./Settings");

// === SPARE PARTS MODELS ===
const Vehicle = require("./Vehicle");
const Supplier = require("./Supplier");
const PartCompatibility = require("./PartCompatibility");
const SupplierPrice = require("./SupplierPrice");
const AIChatLog = require("./AIChatLog");
const Cart = require("./Cart");
const CartItem = require("./CartItem");

// === PLATFORM-SPECIFIC PRODUCT MODELS ===
const TrendyolProduct = require("./TrendyolProduct");
const HepsiburadaProduct = require("./HepsiburadaProduct");
const N11Product = require("./N11Product");

// === PRODUCT VARIANT AND INVENTORY MODELS ===
const ProductVariant = require("./ProductVariant")(sequelize);
const InventoryMovement = require("./InventoryMovement")(sequelize);
const StockReservation = require("./StockReservation")(sequelize);

// === NEW PRODUCT MANAGEMENT MODELS ===
const ProductTemplate = require("./ProductTemplate")(sequelize);
const ProductMedia = require("./ProductMedia")(sequelize);
const PlatformCategory = require("./PlatformCategory")(sequelize);
const BulkOperation = require("./BulkOperation")(sequelize);
const InventorySync = require("./InventorySync");

// === NEW SUBSCRIPTION MODELS ===
const Subscription = require("./Subscription");
const UsageRecord = require("./UsageRecord");
const Invoice = require("./Invoice");

// === BACKGROUND TASK MODELS ===
// Temporarily commenting out BackgroundTask to debug server hang
const BackgroundTask = require("./BackgroundTask")(sequelize);

// === CUSTOMER QUESTION MODELS ===
const CustomerQuestion = require("./CustomerQuestion");
const CustomerReply = require("./CustomerReply");
const ReplyTemplate = require("./ReplyTemplate");
const QuestionStats = require("./QuestionStats");

// ========================================
// === NEW ENHANCED PRODUCT MANAGEMENT MODELS ===
// ========================================
const MainProduct = require("./MainProduct");
const PlatformVariant = require("./PlatformVariant");
const PlatformTemplate = require("./PlatformTemplate");

// Initialize models with sequelize
const models = {
  User: User,
  Order: Order,
  OrderItem: OrderItem,
  Product: Product,
  Customer: Customer,
  PlatformConnection: PlatformConnection,
  PlatformData: PlatformData,
  PlatformConflict: PlatformConflict,
  InventorySync: InventorySync,
  ShippingDetail: ShippingDetail,
  HepsiburadaOrder: HepsiburadaOrder,
  N11Order: N11Order,
  TrendyolOrder: TrendyolOrder,
  ShippingCarrier: ShippingCarrier,
  ShippingRate: ShippingRate,
  TurkishCompliance: TurkishCompliance,
  ComplianceDocuments: ComplianceDocuments,
  Settings: Settings,

  // === SPARE PARTS MODELS ===
  Vehicle: Vehicle,
  Supplier: Supplier,
  PartCompatibility: PartCompatibility,
  SupplierPrice: SupplierPrice,
  AIChatLog: AIChatLog,
  Cart: Cart,
  CartItem: CartItem,

  // === PLATFORM-SPECIFIC PRODUCT MODELS ===
  TrendyolProduct: TrendyolProduct,
  HepsiburadaProduct: HepsiburadaProduct,
  N11Product: N11Product,

  // === PRODUCT VARIANT AND INVENTORY MODELS ===
  ProductVariant: ProductVariant,
  InventoryMovement: InventoryMovement,
  StockReservation: StockReservation,

  // === NEW PRODUCT MANAGEMENT MODELS ===
  ProductTemplate: ProductTemplate,
  ProductMedia: ProductMedia,
  PlatformCategory: PlatformCategory,
  BulkOperation: BulkOperation,

  // === SUBSCRIPTION MODELS ===
  Subscription: Subscription,
  UsageRecord: UsageRecord,
  Invoice: Invoice,

  // === BACKGROUND TASK MODELS ===
  BackgroundTask: BackgroundTask,

  // === CUSTOMER QUESTION MODELS ===
  CustomerQuestion: CustomerQuestion,
  CustomerReply: CustomerReply,
  ReplyTemplate: ReplyTemplate,
  QuestionStats: QuestionStats,

  // ========================================
  // === NEW ENHANCED PRODUCT MANAGEMENT MODELS ===
  // ========================================
  MainProduct: MainProduct,
  PlatformVariant: PlatformVariant,
  PlatformTemplate: PlatformTemplate,
  ProductMedia: ProductMedia,

  // === ADDITIONAL MODELS ===
  PlatformConflict: PlatformConflict,
  InventorySync: InventorySync,
};

// === CORE ASSOCIATIONS ===

// User associations
models.User.hasMany(models.Order, {
  foreignKey: "userId",
  as: "orders",
  onDelete: "CASCADE",
  hooks: true,
});
models.Order.belongsTo(models.User, {
  foreignKey: "userId",
  as: "user",
  allowNull: false,
});

// models.User.hasMany(models.Product, {
//   foreignKey: "userId",
//   as: "products",
//   onDelete: "CASCADE",
//   hooks: true,
// });
// models.Product.belongsTo(models.User, {
//   foreignKey: "userId",
//   as: "user",
//   allowNull: false,
// });
// NOTE: Product associations are now handled in Product.associate() function

models.User.hasMany(models.PlatformConnection, {
  foreignKey: "userId",
  as: "platformConnections",
  onDelete: "CASCADE",
  hooks: true,
});
models.PlatformConnection.belongsTo(models.User, {
  foreignKey: "userId",
  as: "user",
  allowNull: false,
});

// Order associations
models.Order.hasMany(models.OrderItem, {
  foreignKey: "orderId",
  as: "items",
  onDelete: "CASCADE",
  hooks: true,
});
models.OrderItem.belongsTo(models.Order, {
  foreignKey: "orderId",
  as: "order",
  allowNull: false,
});

// Customer associations
models.Customer.hasMany(models.Order, {
  foreignKey: "customerEmail",
  sourceKey: "email",
  as: "customerOrders",
});
models.Order.belongsTo(models.Customer, {
  foreignKey: "customerEmail",
  targetKey: "email",
  as: "customer",
});

models.Product.hasMany(models.OrderItem, {
  foreignKey: "productId",
  as: "orderItems",
  onDelete: "SET NULL",
});
models.OrderItem.belongsTo(models.Product, {
  foreignKey: "productId",
  as: "product",
});

models.PlatformConnection.hasMany(models.Order, {
  foreignKey: "connectionId",
  as: "connectionOrders",
  onDelete: "RESTRICT",
});
models.Order.belongsTo(models.PlatformConnection, {
  foreignKey: "connectionId",
  as: "platformConnection",
  allowNull: false,
});

// Shipping associations
models.Order.hasOne(models.ShippingDetail, {
  foreignKey: "orderId",
  as: "shippingDetail",
  onDelete: "CASCADE",
  hooks: true,
});
models.ShippingDetail.belongsTo(models.Order, {
  foreignKey: "orderId",
  as: "order",
  allowNull: false,
});

// Additional reference from Order to ShippingDetail via shippingDetailId
// This allows orders to reference shipping details that may be shared
models.Order.belongsTo(models.ShippingDetail, {
  foreignKey: "shippingDetailId",
  as: "shippingDetailRef",
  onDelete: "SET NULL",
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

// === PLATFORM-SPECIFIC PRODUCT ASSOCIATIONS ===

// Product <-> TrendyolProduct (One-to-One)
models.Product.hasOne(models.TrendyolProduct, {
  foreignKey: "productId",
  as: "trendyolProduct",
  onDelete: "CASCADE",
  hooks: true,
});
models.TrendyolProduct.belongsTo(models.Product, {
  foreignKey: "productId",
  as: "product",
  allowNull: false,
});

// Product <-> HepsiburadaProduct (One-to-One)
models.Product.hasOne(models.HepsiburadaProduct, {
  foreignKey: "productId",
  as: "hepsiburadaProduct",
  onDelete: "CASCADE",
  hooks: true,
});
models.HepsiburadaProduct.belongsTo(models.Product, {
  foreignKey: "productId",
  as: "product",
  allowNull: false,
});

// Product <-> N11Product (One-to-One)
models.Product.hasOne(models.N11Product, {
  foreignKey: "productId",
  as: "n11Product",
  onDelete: "CASCADE",
  hooks: true,
});
models.N11Product.belongsTo(models.Product, {
  foreignKey: "productId",
  as: "product",
  allowNull: false,
});

// === SHIPPING ASSOCIATIONS ===

// ShippingCarrier <-> ShippingRate (One-to-Many)
models.ShippingCarrier.hasMany(models.ShippingRate, {
  foreignKey: "carrierId",
  as: "rates",
  onDelete: "CASCADE",
  hooks: true,
});
models.ShippingRate.belongsTo(models.ShippingCarrier, {
  foreignKey: "carrierId",
  as: "carrier",
  allowNull: false,
});

// User <-> ShippingRate (One-to-Many)
models.User.hasMany(models.ShippingRate, {
  foreignKey: "userId",
  as: "shippingRates",
  onDelete: "CASCADE",
  hooks: true,
});
models.ShippingRate.belongsTo(models.User, {
  foreignKey: "userId",
  as: "user",
  allowNull: false,
});

// ShippingDetail <-> ShippingCarrier (Many-to-One)
models.ShippingDetail.belongsTo(models.ShippingCarrier, {
  foreignKey: "carrierId",
  as: "carrier",
});
models.ShippingCarrier.hasMany(models.ShippingDetail, {
  foreignKey: "carrierId",
  as: "shipments",
  onDelete: "SET NULL",
});

// === COMPLIANCE ASSOCIATIONS ===

// Order <-> TurkishCompliance (One-to-One)
models.Order.hasOne(models.TurkishCompliance, {
  foreignKey: "orderId",
  as: "turkishCompliance",
  onDelete: "CASCADE",
  hooks: true,
});
models.TurkishCompliance.belongsTo(models.Order, {
  foreignKey: "orderId",
  as: "order",
  allowNull: false,
});

// Order <-> ComplianceDocuments (One-to-Many)
models.Order.hasMany(models.ComplianceDocuments, {
  foreignKey: "orderId",
  as: "complianceDocuments",
  onDelete: "CASCADE",
  hooks: true,
});
models.ComplianceDocuments.belongsTo(models.Order, {
  foreignKey: "orderId",
  as: "order",
  allowNull: false,
});

// === SUBSCRIPTION ASSOCIATIONS ===

// User <-> Subscription (One-to-Many)
models.User.hasMany(models.Subscription, {
  foreignKey: "userId",
  as: "subscriptions",
  onDelete: "CASCADE",
  hooks: true,
});
models.Subscription.belongsTo(models.User, {
  foreignKey: "userId",
  as: "user",
  allowNull: false,
});

// User <-> UsageRecord (One-to-Many)
models.User.hasMany(models.UsageRecord, {
  foreignKey: "userId",
  as: "usageRecords",
  onDelete: "CASCADE",
  hooks: true,
});
models.UsageRecord.belongsTo(models.User, {
  foreignKey: "userId",
  as: "user",
  allowNull: false,
});

// User <-> Invoice (One-to-Many)
models.User.hasMany(models.Invoice, {
  foreignKey: "userId",
  as: "invoices",
  onDelete: "CASCADE",
  hooks: true,
});
models.Invoice.belongsTo(models.User, {
  foreignKey: "userId",
  as: "user",
  allowNull: false,
});

// Order <-> Invoice (One-to-One)
models.Order.hasOne(models.Invoice, {
  foreignKey: "orderId",
  as: "invoice",
  onDelete: "SET NULL",
});
models.Invoice.belongsTo(models.Order, {
  foreignKey: "orderId",
  as: "order",
});

// User self-referencing for referrals
models.User.hasMany(models.User, {
  foreignKey: "referredBy",
  as: "referrals",
  onDelete: "SET NULL",
});
models.User.belongsTo(models.User, {
  foreignKey: "referredBy",
  as: "referrer",
});

// User <-> Settings (One-to-Many)
models.User.hasMany(models.Settings, {
  foreignKey: "userId",
  as: "userSettingsRecords", // Changed alias to avoid conflict with 'settings' attribute
  onDelete: "CASCADE",
  hooks: true,
});
models.Settings.belongsTo(models.User, {
  foreignKey: "userId",
  as: "user",
  allowNull: false,
});

// === PLATFORM DATA ASSOCIATIONS ===

// Product <-> PlatformData (One-to-Many)
// NOTE: Product-PlatformData associations are now handled in Product.associate() function

// Order <-> PlatformData (One-to-Many)
// models.Order.hasMany(models.PlatformData, {
//   foreignKey: "entityId",
//   scope: { entityType: "order" },
//   as: "platformData",
//   onDelete: "CASCADE",
//   hooks: true,
// });
// models.PlatformData.belongsTo(models.Order, {
//   foreignKey: "entityId",
//   constraints: false,
//   as: "order",
// });
// NOTE: Order-PlatformData associations should be handled in PlatformData.associate() function if needed

// ProductVariant <-> PlatformData (One-to-Many)
// models.ProductVariant.hasMany(models.PlatformData, {
//   foreignKey: "entityId",
//   scope: { entityType: "variant" },
//   as: "platformData",
//   onDelete: "CASCADE",
//   hooks: true,
// });
// models.PlatformData.belongsTo(models.ProductVariant, {
//   foreignKey: "entityId",
//   constraints: false,
//   as: "variant",
// });
// NOTE: ProductVariant-PlatformData associations are now handled in ProductVariant.associate() function

// === CONFLICT MANAGEMENT ASSOCIATIONS ===

// User <-> PlatformConflict (One-to-Many)
models.User.hasMany(models.PlatformConflict, {
  foreignKey: "userId",
  as: "platformConflicts",
  onDelete: "CASCADE",
  hooks: true,
});
models.PlatformConflict.belongsTo(models.User, {
  foreignKey: "userId",
  as: "user",
  allowNull: false,
});

// User <-> PlatformConflict (resolver)
models.User.hasMany(models.PlatformConflict, {
  foreignKey: "resolvedBy",
  as: "resolvedConflicts",
  onDelete: "SET NULL",
});
models.PlatformConflict.belongsTo(models.User, {
  foreignKey: "resolvedBy",
  as: "resolver",
});

// === INVENTORY SYNC ASSOCIATIONS ===

// Product <-> InventorySync (One-to-One)
models.Product.hasOne(models.InventorySync, {
  foreignKey: "productId",
  as: "inventorySync",
  onDelete: "CASCADE",
  hooks: true,
});
models.InventorySync.belongsTo(models.Product, {
  foreignKey: "productId",
  as: "product",
});

// === PRODUCT VARIANT AND INVENTORY ASSOCIATIONS ===

// Product <-> ProductVariant (One-to-Many)
// models.Product.hasMany(models.ProductVariant, {
//   foreignKey: "productId",
//   as: "variants",
//   onDelete: "CASCADE",
//   hooks: true,
// });
// models.ProductVariant.belongsTo(models.Product, {
//   foreignKey: "productId",
//   as: "product",
//   allowNull: false,
// });
// NOTE: Product-ProductVariant associations are now handled in Product.associate() function

// Product <-> InventoryMovement (One-to-Many)
// models.Product.hasMany(models.InventoryMovement, {
//   foreignKey: "productId",
//   as: "inventoryMovements",
//   onDelete: "CASCADE",
//   hooks: true,
// });
// models.InventoryMovement.belongsTo(models.Product, {
//   foreignKey: "productId",
//   as: "product",
//   allowNull: false,
// });
// NOTE: Product-InventoryMovement associations are now handled in Product.associate() function

// ProductVariant <-> InventoryMovement (One-to-Many)
// models.ProductVariant.hasMany(models.InventoryMovement, {
//   foreignKey: "variantId",
//   as: "inventoryMovements",
//   onDelete: "CASCADE",
//   hooks: true,
// });
// models.InventoryMovement.belongsTo(models.ProductVariant, {
//   foreignKey: "variantId",
//   as: "variant",
// });
// NOTE: ProductVariant-InventoryMovement associations are now handled in ProductVariant.associate() function

// Product <-> StockReservation (One-to-Many)
// models.Product.hasMany(models.StockReservation, {
//   foreignKey: "productId",
//   as: "stockReservations",
//   onDelete: "CASCADE",
//   hooks: true,
// });
// models.StockReservation.belongsTo(models.Product, {
//   foreignKey: "productId",
//   as: "product",
//   allowNull: false,
// });
// NOTE: Product-StockReservation associations are now handled in Product.associate() function

// ProductVariant <-> StockReservation (One-to-Many)
// models.ProductVariant.hasMany(models.StockReservation, {
//   foreignKey: "variantId",
//   as: "stockReservations",
//   onDelete: "CASCADE",
//   hooks: true,
// });
// models.StockReservation.belongsTo(models.ProductVariant, {
//   foreignKey: "variantId",
//   as: "variant",
// });
// NOTE: ProductVariant-StockReservation associations are now handled in ProductVariant.associate() function

// User <-> InventoryMovement (One-to-Many)
// models.User.hasMany(models.InventoryMovement, {
//   foreignKey: "userId",
//   as: "inventoryMovements",
//   onDelete: "CASCADE",
//   hooks: true,
// });
// models.InventoryMovement.belongsTo(models.User, {
//   foreignKey: "userId",
//   as: "user",
//   allowNull: false,
// });
// NOTE: User-InventoryMovement associations should be handled in InventoryMovement.associate() function if needed

// User <-> StockReservation (One-to-Many)
// models.User.hasMany(models.StockReservation, {
//   foreignKey: "userId",
//   as: "stockReservations",
//   onDelete: "CASCADE",
//   hooks: true,
// });
// models.StockReservation.belongsTo(models.User, {
//   foreignKey: "userId",
//   as: "user",
//   allowNull: false,
// });
// NOTE: User-StockReservation associations should be handled in StockReservation.associate() function if needed

// Order <-> StockReservation (One-to-Many)
// models.Order.hasMany(models.StockReservation, {
//   foreignKey: "orderId",
//   as: "stockReservations",
//   onDelete: "SET NULL",
// });
// models.StockReservation.belongsTo(models.Order, {
//   foreignKey: "orderId",
//   as: "order",
// });
// NOTE: Order-StockReservation associations should be handled in StockReservation.associate() function if needed

// ========================================
// === LEGACY PRODUCT MANAGEMENT SYSTEM ===
// ========================================
// This section handles the OLD/LEGACY product management system
// with Product, ProductVariant, ProductMedia, etc.
// This will be gradually phased out in favor of the NEW enhanced system.
// ========================================

// Product <-> ProductTemplate (Many-to-One)
models.Product.belongsTo(models.ProductTemplate, {
  foreignKey: "templateId",
  as: "template",
});
models.ProductTemplate.hasMany(models.Product, {
  foreignKey: "templateId",
  as: "products",
  onDelete: "SET NULL",
});

// User <-> ProductTemplate (One-to-Many)
models.User.hasMany(models.ProductTemplate, {
  foreignKey: "userId",
  as: "productTemplates",
  onDelete: "CASCADE",
  hooks: true,
});
models.ProductTemplate.belongsTo(models.User, {
  foreignKey: "userId",
  as: "user",
  allowNull: false,
});

// Product <-> ProductMedia (One-to-Many)
// NOTE: This association is handled in ProductMedia.associate() function
// models.Product.hasMany(models.ProductMedia, {
//   foreignKey: "productId",
//   as: "media",
//   onDelete: "CASCADE",
//   hooks: true,
// });
// models.ProductMedia.belongsTo(models.Product, {
//   foreignKey: "productId",
//   as: "product",
//   allowNull: false,
// });

// ProductVariant <-> ProductMedia (One-to-Many)
// NOTE: This association is handled in ProductMedia.associate() function
// models.ProductVariant.hasMany(models.ProductMedia, {
//   foreignKey: "variantId",
//   as: "media",
//   onDelete: "CASCADE",
//   hooks: true,
// });
// models.ProductMedia.belongsTo(models.ProductVariant, {
//   foreignKey: "variantId",
//   as: "productVariant",
// });

// User <-> ProductMedia (One-to-Many)
// NOTE: This association is handled in ProductMedia.associate() function
// models.User.hasMany(models.ProductMedia, {
//   foreignKey: "userId",
//   as: "productMedia",
//   onDelete: "CASCADE",
//   hooks: true,
// });
// models.ProductMedia.belongsTo(models.User, {
//   foreignKey: "userId",
//   as: "user",
//   allowNull: false,
// });

// User <-> PlatformCategory (One-to-Many)
models.User.hasMany(models.PlatformCategory, {
  foreignKey: "userId",
  as: "platformCategories",
  onDelete: "CASCADE",
  hooks: true,
});
models.PlatformCategory.belongsTo(models.User, {
  foreignKey: "userId",
  as: "user",
});

// User <-> BulkOperation (One-to-Many)
models.User.hasMany(models.BulkOperation, {
  foreignKey: "userId",
  as: "bulkOperations",
  onDelete: "CASCADE",
  hooks: true,
});
models.BulkOperation.belongsTo(models.User, {
  foreignKey: "userId",
  as: "user",
  allowNull: false,
});

// User <-> BackgroundTask (One-to-Many)
models.User.hasMany(models.BackgroundTask, {
  foreignKey: "userId",
  as: "backgroundTasks",
  onDelete: "CASCADE",
  hooks: true,
});
models.BackgroundTask.belongsTo(models.User, {
  foreignKey: "userId",
  as: "user",
  allowNull: false,
});

// PlatformConnection <-> BackgroundTask (One-to-Many)
models.PlatformConnection.hasMany(models.BackgroundTask, {
  foreignKey: "platformConnectionId",
  as: "backgroundTasks",
  onDelete: "CASCADE",
  hooks: true,
});
models.BackgroundTask.belongsTo(models.PlatformConnection, {
  foreignKey: "platformConnectionId",
  as: "platformConnection",
});

// BackgroundTask self-referencing for parent-child relationships
models.BackgroundTask.belongsTo(models.BackgroundTask, {
  foreignKey: "parentTaskId",
  as: "parentTask",
});
models.BackgroundTask.hasMany(models.BackgroundTask, {
  foreignKey: "parentTaskId",
  as: "childTasks",
});

// ========================================
// === END LEGACY PRODUCT MANAGEMENT SYSTEM ===
// ========================================

// PlatformVariant <-> Product associations are now defined in their respective model files

// MainProduct <-> PlatformVariant (One-to-Many)
// Note: Both MainProduct -> PlatformVariant and PlatformVariant -> MainProduct
// associations are defined in their respective model files

// User <-> MainProduct (One-to-Many)
models.User.hasMany(models.MainProduct, {
  foreignKey: "userId",
  as: "mainProducts",
  onDelete: "CASCADE",
  hooks: true,
});
// Note: MainProduct -> User association is defined in MainProduct.js model file

// ========================================
// === CUSTOMER QUESTIONS & REPLIES ASSOCIATIONS ===
// ========================================

// CustomerQuestion <-> CustomerReply (One-to-Many)
models.CustomerQuestion.hasMany(models.CustomerReply, {
  foreignKey: "question_id",
  as: "replies",
  onDelete: "CASCADE",
  hooks: true,
});
models.CustomerReply.belongsTo(models.CustomerQuestion, {
  foreignKey: "question_id",
  as: "question",
  allowNull: false,
});

// User <-> CustomerReply (One-to-Many)
models.User.hasMany(models.CustomerReply, {
  foreignKey: "created_by",
  as: "customerReplies",
  onDelete: "SET NULL",
  hooks: true,
});
models.CustomerReply.belongsTo(models.User, {
  foreignKey: "created_by",
  as: "creator",
  allowNull: true,
});

// ReplyTemplate <-> CustomerReply (One-to-Many)
models.ReplyTemplate.hasMany(models.CustomerReply, {
  foreignKey: "template_id",
  as: "replies",
  onDelete: "SET NULL",
  hooks: true,
});
models.CustomerReply.belongsTo(models.ReplyTemplate, {
  foreignKey: "template_id",
  as: "template",
  allowNull: true,
});

// ========================================
// === END CUSTOMER QUESTIONS & REPLIES ===
// ========================================

// ========================================
// === NEW ENHANCED PRODUCT MANAGEMENT ===
// ========================================
// This section handles the NEW enhanced product management system
// with MainProduct, PlatformVariant, and EnhancedProductMedia models.
// This is SEPARATE from the legacy Product/ProductVariant system above.
// ========================================

// === SPARE PARTS ASSOCIATIONS ===
if (models.Vehicle.associate) {
  models.Vehicle.associate(models);
}
if (models.Supplier.associate) {
  models.Supplier.associate(models);
}
if (models.SupplierPrice.associate) {
  models.SupplierPrice.associate(models);
}
if (models.AIChatLog.associate) {
  models.AIChatLog.associate(models);
}
if (models.Cart.associate) {
  models.Cart.associate(models);
}
if (models.CartItem.associate) {
  models.CartItem.associate(models);
}

if (models.MainProduct.associate) {
  models.MainProduct.associate(models);
}
if (models.Product.associate) {
  models.Product.associate(models);
}
if (models.ProductVariant.associate) {
  models.ProductVariant.associate(models);
}
if (models.InventoryMovement.associate) {
  models.InventoryMovement.associate(models);
}
if (models.StockReservation.associate) {
  models.StockReservation.associate(models);
}
if (models.PlatformVariant.associate) {
  models.PlatformVariant.associate(models);
}
if (models.PlatformTemplate.associate) {
  models.PlatformTemplate.associate(models);
}
if (models.ProductMedia.associate) {
  models.ProductMedia.associate(models);
}

// ========================================
// === END NEW ENHANCED PRODUCT MANAGEMENT ===
// ========================================

module.exports = {
  sequelize,
  ...models,
};
