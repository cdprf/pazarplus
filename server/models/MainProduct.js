const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

/**
 * Enhanced Main Product Model
 * Acts as the base product containing core information and shared stock
 */
class MainProduct extends Model {}

MainProduct.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 255]
      }
    },
    baseSku: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        len: [1, 100]
      },
      comment: 'Base SKU pattern for generating variants'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    category: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    brand: {
      type: DataTypes.STRING,
      allowNull: true
    },
    productType: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Product type code for SKU generation'
    },

    // Shared Stock Management
    stockQuantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      },
      comment: 'Shared stock across all platform variants'
    },
    minStockLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    reservedStock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      },
      comment: 'Stock reserved for orders/variants'
    },
    availableStock: {
      type: DataTypes.VIRTUAL,
      get() {
        return this.stockQuantity - this.reservedStock;
      }
    },

    // Default Pricing
    basePrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      },
      comment: 'Default price inherited by variants'
    },
    baseCostPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      validate: {
        min: 0
      }
    },

    // Media Management - Now handled by EnhancedProductMedia association
    // media attribute removed to avoid naming collision with mediaAssets association

    // Platform Management
    publishedPlatforms: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: 'Track which platforms this product is published to'
    },
    platformTemplates: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: 'Platform-specific template assignments'
    },

    // Auto-Learning Features
    learnedFields: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: 'Fields learned from platform integrations'
    },
    categoryMappings: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: 'Category mappings per platform'
    },

    // Product Attributes
    attributes: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {}
    },
    tags: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    },
    // Platform-specific extra fields for comprehensive product data
    platformExtras: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment:
        'Platform-specific extra fields (e.g., Trendyol seller info, Hepsiburada merchant details, etc.)'
    },
    // Scraping metadata
    scrapedFrom: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'URL from which product was scraped'
    },
    scrapedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When the product was scraped'
    },
    importedFrom: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Platform from which product was imported'
    },
    importedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When the product was imported'
    },

    weight: {
      type: DataTypes.DECIMAL(8, 3),
      allowNull: true,
      validate: {
        min: 0
      }
    },
    dimensions: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null
    },

    // Status Management
    hasVariants: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether this product has platform variants'
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'draft', 'archived'),
      allowNull: false,
      defaultValue: 'draft'
    },

    // Stock Code Pattern Recognition
    stockCodePattern: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Detected or assigned stock code pattern'
    },
    patternConfidence: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: true,
      validate: {
        min: 0,
        max: 1
      },
      comment: 'Confidence score for pattern detection'
    },

    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },

    // Timestamps
    lastStockUpdate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Last time stock was updated'
    },
    lastSyncedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Last time this product was synced with platforms'
    }
  },
  {
    sequelize,
    modelName: 'MainProduct',
    tableName: 'main_products',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['baseSku']
      },
      {
        fields: ['userId']
      },
      {
        fields: ['category']
      },
      {
        fields: ['brand']
      },
      {
        fields: ['productType']
      },
      {
        fields: ['status']
      },
      {
        fields: ['stockQuantity']
      },
      {
        fields: ['stockCodePattern']
      },
      {
        fields: ['hasVariants']
      }
    ],
    hooks: {
      beforeUpdate: async (mainProduct) => {
        // Update lastStockUpdate when stock changes
        if (
          mainProduct.changed('stockQuantity') ||
          mainProduct.changed('reservedStock')
        ) {
          mainProduct.lastStockUpdate = new Date();
        }
      }
    }
  }
);

// MainProduct associations
MainProduct.associate = function (models) {
  MainProduct.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'user'
  });

  MainProduct.hasMany(models.PlatformVariant, {
    foreignKey: 'mainProductId',
    as: 'platformVariants'
  });

  MainProduct.hasMany(models.InventoryMovement, {
    foreignKey: 'mainProductId',
    as: 'inventoryMovements'
  });

  MainProduct.hasMany(models.StockReservation, {
    foreignKey: 'mainProductId',
    as: 'stockReservations'
  });

  MainProduct.hasMany(models.PlatformData, {
    foreignKey: 'entityId',
    constraints: false,
    scope: {
      entityType: 'main_product'
    },
    as: 'platformData'
  });
};

module.exports = MainProduct;
