const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const BulkOperation = sequelize.define(
    'BulkOperation',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      type: {
        type: DataTypes.ENUM(
          'product_import',
          'product_export',
          'price_update',
          'stock_update',
          'category_update',
          'media_upload',
          'platform_publish',
          'platform_sync',
          'variant_creation',
          'bulk_delete'
        ),
        allowNull: false,
        comment: 'Type of bulk operation'
      },
      status: {
        type: DataTypes.ENUM(
          'pending',
          'processing',
          'completed',
          'failed',
          'cancelled',
          'partial'
        ),
        defaultValue: 'pending',
        comment: 'Operation status'
      },
      totalItems: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Total number of items to process'
      },
      processedItems: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Number of items processed'
      },
      successfulItems: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Number of successful operations'
      },
      failedItems: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Number of failed operations'
      },
      progress: {
        type: DataTypes.DECIMAL(5, 2),
        defaultValue: 0.0,
        comment: 'Progress percentage (0-100)'
      },
      configuration: {
        type: DataTypes.JSON,
        defaultValue: {},
        comment: 'Operation configuration and settings'
      },
      filters: {
        type: DataTypes.JSON,
        defaultValue: {},
        comment: 'Filters applied to the operation'
      },
      results: {
        type: DataTypes.JSON,
        defaultValue: {},
        comment: 'Operation results and summary'
      },
      errors: {
        type: DataTypes.JSON,
        defaultValue: [],
        comment: 'Array of errors encountered'
      },
      warnings: {
        type: DataTypes.JSON,
        defaultValue: [],
        comment: 'Array of warnings encountered'
      },
      metadata: {
        type: DataTypes.JSON,
        defaultValue: {},
        comment: 'Additional operation metadata'
      },
      startedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When the operation started processing'
      },
      completedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When the operation completed'
      },
      estimatedCompletionAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Estimated completion time'
      },
      processingTimeMs: {
        type: DataTypes.BIGINT,
        allowNull: true,
        comment: 'Total processing time in milliseconds'
      },
      fileUrl: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'URL to input file if applicable'
      },
      resultFileUrl: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'URL to result file if applicable'
      }
    },
    {
      tableName: 'BulkOperations',
      timestamps: true,
      indexes: [
        {
          fields: ['userId']
        },
        {
          fields: ['type']
        },
        {
          fields: ['status']
        },
        {
          fields: ['createdAt']
        },
        {
          fields: ['userId', 'status'],
          name: 'bulk_operations_user_status_idx'
        }
      ]
    }
  );

  BulkOperation.associate = function (models) {
    BulkOperation.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  // Instance methods
  BulkOperation.prototype.updateProgress = function (
    processed,
    successful,
    failed,
    errors = []
  ) {
    this.processedItems = processed;
    this.successfulItems = successful;
    this.failedItems = failed;
    this.progress =
      this.totalItems > 0
        ? ((processed / this.totalItems) * 100).toFixed(2)
        : 0;

    if (errors.length > 0) {
      this.errors = [...this.errors, ...errors];
    }

    // Calculate processing time and estimate completion
    if (this.startedAt && processed > 0) {
      const elapsed = Date.now() - new Date(this.startedAt).getTime();
      this.processingTimeMs = elapsed;

      if (processed < this.totalItems) {
        const avgTimePerItem = elapsed / processed;
        const remaining = this.totalItems - processed;
        const estimatedRemainingMs = remaining * avgTimePerItem;
        this.estimatedCompletionAt = new Date(
          Date.now() + estimatedRemainingMs
        );
      }
    }

    return this.save();
  };

  BulkOperation.prototype.markAsStarted = function () {
    this.status = 'processing';
    this.startedAt = new Date();
    return this.save();
  };

  BulkOperation.prototype.markAsCompleted = function () {
    this.status = this.failedCount > 0 ? 'completed' : 'completed';
    this.completedAt = new Date();
    this.progress = 100;
    this.estimatedTimeRemaining = 0;
    return this.save();
  };

  BulkOperation.prototype.markAsFailed = function (error) {
    this.status = 'failed';
    this.completedAt = new Date();
    if (error) {
      this.errors.push({
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
    }
    return this.save();
  };

  BulkOperation.prototype.cancel = function () {
    if (this.status === 'pending' || this.status === 'processing') {
      this.status = 'cancelled';
      this.completedAt = new Date();
      return this.save();
    }
    throw new Error(
      'Cannot cancel operation that is not pending or processing'
    );
  };

  return BulkOperation;
};
