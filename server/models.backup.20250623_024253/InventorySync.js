const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

/**
 * InventorySync Model
 * Tracks inventory synchronization across Turkish marketplace platforms
 */
const InventorySync = sequelize.define(
  "InventorySync",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    sku: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "Product SKU being tracked",
    },
    productId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: "Local product ID reference",
    },
    masterQuantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "Master inventory quantity (source of truth)",
    },
    reservedQuantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "Quantity reserved for pending orders",
    },
    availableQuantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "Available quantity for sale (master - reserved)",
    },
    lowStockThreshold: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 10,
      comment: "Threshold for low stock alerts",
    },
    platformQuantities: {
      type: DataTypes.JSONB,
      defaultValue: {
        trendyol: { quantity: 0, lastSync: null, status: "pending" },
        hepsiburada: { quantity: 0, lastSync: null, status: "pending" },
        n11: { quantity: 0, lastSync: null, status: "pending" },
      },
      comment: "Quantities on each platform",
    },
    syncStatus: {
      type: DataTypes.ENUM("synced", "pending", "failed", "partial"),
      defaultValue: "pending",
      comment: "Overall synchronization status",
    },
    lastSyncAttempt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "Last synchronization attempt timestamp",
    },
    lastSuccessfulSync: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "Last successful synchronization timestamp",
    },
    syncErrors: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: "Synchronization errors by platform",
    },
    autoSyncEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: "Whether automatic synchronization is enabled",
    },
    syncFrequency: {
      type: DataTypes.INTEGER,
      defaultValue: 300, // 5 minutes
      comment: "Sync frequency in seconds",
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: "Additional metadata for inventory tracking",
    },
  },
  {
    tableName: "inventory_sync",
    timestamps: true,
    indexes: [
      {
        fields: ["sku"],
        unique: true,
      },
      {
        fields: ["syncStatus"],
      },
      {
        fields: ["availableQuantity"],
      },
      {
        fields: ["lastSyncAttempt"],
      },
      {
        fields: ["productId"],
      },
    ],
    hooks: {
      beforeSave: (inventory) => {
        // Calculate available quantity
        inventory.availableQuantity = Math.max(
          0,
          inventory.masterQuantity - inventory.reservedQuantity
        );
      },
    },
  }
);

// Class methods
InventorySync.getLowStockItems = async function (threshold = null) {
  const where = threshold
    ? { availableQuantity: { [sequelize.Op.lte]: threshold } }
    : sequelize.literal("available_quantity <= low_stock_threshold");

  return await this.findAll({
    where,
    order: [["availableQuantity", "ASC"]],
  });
};

InventorySync.getOutOfStockItems = async function () {
  return await this.findAll({
    where: {
      availableQuantity: 0,
    },
    order: [["lastSyncAttempt", "DESC"]],
  });
};

InventorySync.getPendingSyncItems = async function (platform = null) {
  const where = {
    syncStatus: ["pending", "failed"],
  };

  if (platform) {
    where[`platformQuantities.${platform}.status`] = "pending";
  }

  return await this.findAll({
    where,
    order: [["lastSyncAttempt", "ASC"]],
  });
};

InventorySync.getSyncHealthReport = async function () {
  const stats = await sequelize.query(
    `
    SELECT 
      sync_status,
      COUNT(*) as count,
      AVG(available_quantity) as avg_quantity,
      MIN(available_quantity) as min_quantity,
      MAX(available_quantity) as max_quantity
    FROM inventory_sync 
    GROUP BY sync_status
  `,
    {
      type: sequelize.QueryTypes.SELECT,
    }
  );

  const lowStock = await this.getLowStockItems();
  const outOfStock = await this.getOutOfStockItems();

  return {
    stats,
    lowStockCount: lowStock.length,
    outOfStockCount: outOfStock.length,
    totalItems: await this.count(),
  };
};

InventorySync.bulkUpdateQuantities = async function (updates) {
  const results = [];

  for (const update of updates) {
    try {
      const inventory = await this.findOne({ where: { sku: update.sku } });
      if (inventory) {
        await inventory.updateQuantity(update.quantity, update.reason);
        results.push({ sku: update.sku, success: true });
      } else {
        results.push({
          sku: update.sku,
          success: false,
          error: "SKU not found",
        });
      }
    } catch (error) {
      results.push({ sku: update.sku, success: false, error: error.message });
    }
  }

  return results;
};

// Instance methods
InventorySync.prototype.updateQuantity = async function (
  newQuantity,
  reason = "manual_update"
) {
  const oldQuantity = this.masterQuantity;
  this.masterQuantity = newQuantity;
  this.availableQuantity = Math.max(0, newQuantity - this.reservedQuantity);

  // Add to metadata for audit trail
  if (!this.metadata.quantityHistory) {
    this.metadata.quantityHistory = [];
  }

  this.metadata.quantityHistory.push({
    timestamp: new Date(),
    oldQuantity,
    newQuantity,
    reason,
    availableQuantity: this.availableQuantity,
  });

  // Keep only last 50 history entries
  if (this.metadata.quantityHistory.length > 50) {
    this.metadata.quantityHistory = this.metadata.quantityHistory.slice(-50);
  }

  await this.save();
  return this;
};

InventorySync.prototype.reserveQuantity = async function (
  quantity,
  orderId = null
) {
  if (quantity > this.availableQuantity) {
    throw new Error(
      `Insufficient inventory. Available: ${this.availableQuantity}, Requested: ${quantity}`
    );
  }

  this.reservedQuantity += quantity;
  this.availableQuantity = Math.max(
    0,
    this.masterQuantity - this.reservedQuantity
  );

  // Track reservation
  if (!this.metadata.reservations) {
    this.metadata.reservations = [];
  }

  this.metadata.reservations.push({
    timestamp: new Date(),
    quantity,
    orderId,
    type: "reserve",
  });

  await this.save();
  return this;
};

InventorySync.prototype.releaseQuantity = async function (
  quantity,
  orderId = null
) {
  this.reservedQuantity = Math.max(0, this.reservedQuantity - quantity);
  this.availableQuantity = Math.max(
    0,
    this.masterQuantity - this.reservedQuantity
  );

  // Track release
  if (!this.metadata.reservations) {
    this.metadata.reservations = [];
  }

  this.metadata.reservations.push({
    timestamp: new Date(),
    quantity,
    orderId,
    type: "release",
  });

  await this.save();
  return this;
};

InventorySync.prototype.updatePlatformQuantity = async function (
  platform,
  quantity,
  status = "synced"
) {
  if (!["trendyol", "hepsiburada", "n11"].includes(platform)) {
    throw new Error(`Invalid platform: ${platform}`);
  }

  this.platformQuantities[platform] = {
    quantity,
    lastSync: new Date(),
    status,
  };

  // Update overall sync status
  const platforms = Object.values(this.platformQuantities);
  const allSynced = platforms.every((p) => p.status === "synced");
  const anyFailed = platforms.some((p) => p.status === "failed");

  if (allSynced) {
    this.syncStatus = "synced";
    this.lastSuccessfulSync = new Date();
  } else if (anyFailed) {
    this.syncStatus = "failed";
  } else {
    this.syncStatus = "partial";
  }

  this.lastSyncAttempt = new Date();
  await this.save();
  return this;
};

InventorySync.prototype.markSyncError = async function (platform, error) {
  if (!this.syncErrors) {
    this.syncErrors = {};
  }

  this.syncErrors[platform] = {
    error: error.message || error,
    timestamp: new Date(),
    attempts: (this.syncErrors[platform]?.attempts || 0) + 1,
  };

  // Update platform status
  if (this.platformQuantities[platform]) {
    this.platformQuantities[platform].status = "failed";
  }

  this.syncStatus = "failed";
  this.lastSyncAttempt = new Date();
  await this.save();
  return this;
};

InventorySync.prototype.isLowStock = function () {
  return this.availableQuantity <= this.lowStockThreshold;
};

InventorySync.prototype.isOutOfStock = function () {
  return this.availableQuantity === 0;
};

InventorySync.prototype.needsSync = function () {
  if (!this.autoSyncEnabled) return false;
  if (this.syncStatus === "pending") return true;

  const lastSync = this.lastSyncAttempt;
  if (!lastSync) return true;

  const now = new Date();
  const timeSinceLastSync = (now - lastSync) / 1000; // seconds

  return timeSinceLastSync >= this.syncFrequency;
};

module.exports = InventorySync;
