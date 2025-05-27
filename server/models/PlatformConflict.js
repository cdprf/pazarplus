const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

/**
 * PlatformConflict Model
 * Tracks conflicts and discrepancies between platform data during synchronization
 */
const PlatformConflict = sequelize.define(
  "PlatformConflict",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    conflictType: {
      type: DataTypes.ENUM(
        "order_mismatch",
        "inventory_discrepancy",
        "price_difference",
        "status_conflict",
        "product_missing",
        "duplicate_order"
      ),
      allowNull: false,
      comment: "Type of conflict detected",
    },
    platform: {
      type: DataTypes.ENUM("trendyol", "hepsiburada", "n11"),
      allowNull: false,
      comment: "Platform where conflict was detected",
    },
    entityType: {
      type: DataTypes.ENUM("order", "product", "inventory", "price"),
      allowNull: false,
      comment: "Type of entity involved in conflict",
    },
    entityId: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "ID of the entity on the platform",
    },
    localEntityId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "ID of the corresponding local entity",
    },
    conflictData: {
      type: DataTypes.JSONB,
      allowNull: false,
      comment:
        "Detailed conflict information including platform and local data",
    },
    severity: {
      type: DataTypes.ENUM("low", "medium", "high", "critical"),
      defaultValue: "medium",
      comment: "Severity level of the conflict",
    },
    status: {
      type: DataTypes.ENUM("pending", "in_review", "resolved", "ignored"),
      defaultValue: "pending",
      comment: "Current status of conflict resolution",
    },
    autoResolvable: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: "Whether conflict can be automatically resolved",
    },
    resolutionStrategy: {
      type: DataTypes.ENUM(
        "accept_platform",
        "keep_local",
        "manual_merge",
        "ignore"
      ),
      allowNull: true,
      comment: "Strategy used or to be used for resolution",
    },
    resolutionData: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: "Data used for resolution or resolution result",
    },
    resolvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "When the conflict was resolved",
    },
    resolvedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: "User who resolved the conflict",
    },
    resolutionNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Notes about the resolution process",
    },
    syncSessionId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: "ID of sync session when conflict was detected",
    },
    detectedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      comment: "When the conflict was first detected",
    },
    lastUpdated: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      comment: "Last time conflict data was updated",
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: "Additional metadata about the conflict",
    },
  },
  {
    tableName: "platform_conflicts",
    timestamps: true,
    indexes: [
      {
        fields: ["platform", "status"],
      },
      {
        fields: ["conflictType", "severity"],
      },
      {
        fields: ["entityType", "entityId"],
      },
      {
        fields: ["syncSessionId"],
      },
      {
        fields: ["detectedAt"],
      },
      {
        fields: ["resolvedBy"],
      },
    ],
    hooks: {
      beforeUpdate: (conflict) => {
        conflict.lastUpdated = new Date();
      },
    },
  }
);

// Class methods
PlatformConflict.getActiveConflicts = async function (
  platform = null,
  severity = null
) {
  const where = {
    status: ["pending", "in_review"],
  };

  if (platform) {
    where.platform = platform;
  }

  if (severity) {
    where.severity = severity;
  }

  return await this.findAll({
    where,
    order: [
      ["severity", "DESC"],
      ["detectedAt", "ASC"],
    ],
  });
};

PlatformConflict.getConflictStats = async function (timeRange = 24) {
  const since = new Date();
  since.setHours(since.getHours() - timeRange);

  const stats = await sequelize.query(
    `
    SELECT 
      platform,
      conflict_type,
      severity,
      status,
      COUNT(*) as count
    FROM platform_conflicts 
    WHERE detected_at >= :since
    GROUP BY platform, conflict_type, severity, status
    ORDER BY platform, conflict_type
  `,
    {
      replacements: { since },
      type: sequelize.QueryTypes.SELECT,
    }
  );

  return stats;
};

PlatformConflict.createConflict = async function (conflictData) {
  const conflict = await this.create({
    ...conflictData,
    detectedAt: new Date(),
    lastUpdated: new Date(),
  });

  return conflict;
};

// Instance methods
PlatformConflict.prototype.resolve = async function (
  resolutionData,
  resolvedBy,
  notes = null
) {
  this.status = "resolved";
  this.resolutionData = resolutionData;
  this.resolvedAt = new Date();
  this.resolvedBy = resolvedBy;
  this.resolutionNotes = notes;
  this.lastUpdated = new Date();

  await this.save();
  return this;
};

PlatformConflict.prototype.markForReview = async function (
  userId,
  notes = null
) {
  this.status = "in_review";
  this.resolutionNotes = notes;
  this.lastUpdated = new Date();
  this.metadata = {
    ...this.metadata,
    reviewStartedBy: userId,
    reviewStartedAt: new Date(),
  };

  await this.save();
  return this;
};

PlatformConflict.prototype.ignore = async function (userId, reason = null) {
  this.status = "ignored";
  this.resolvedAt = new Date();
  this.resolvedBy = userId;
  this.resolutionNotes = reason;
  this.lastUpdated = new Date();

  await this.save();
  return this;
};

module.exports = PlatformConflict;
