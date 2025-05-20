// filepath: /Users/Username/Desktop/Soft/pazar+/services/order-management/src/models/TrendyolProduct.js
// This file defines the TrendyolProduct model for platform-specific product data
module.exports = (sequelize, DataTypes) => {
  const TrendyolProduct = sequelize.define('TrendyolProduct', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    productId: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'Reference to the main Product model'
    },
    externalProductId: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Product ID from Trendyol'
    },
    barcode: {
      type: DataTypes.STRING,
      allowNull: true
    },
    stockCode: {
      type: DataTypes.STRING,
      allowNull: true
    },
    title: {
      type: DataTypes.STRING,
      allowNull: true
    },
    categoryId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Trendyol category ID'
    },
    categoryName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    brandId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    brandName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    vatRate: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    dimensionalWeight: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    stockUnitType: {
      type: DataTypes.STRING,
      allowNull: true
    },
    images: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Array of image URLs'
    },
    attributes: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Platform-specific attributes'
    },
    variants: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Product variants'
    },
    approved: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    },
    hasError: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    platformListingPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Current price on Trendyol'
    },
    platformSalePrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Sale price on Trendyol'
    },
    platformStockQuantity: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Current stock quantity on Trendyol'
    },
    lastSyncedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    rawData: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Raw data from Trendyol API'
    }
  }, {
    tableName: 'TrendyolProducts',
    timestamps: true,
    indexes: [
      {
        fields: ['productId']
      },
      {
        fields: ['externalProductId']
      },
      {
        fields: ['barcode']
      }
    ]
  });

  TrendyolProduct.associate = (models) => {
    TrendyolProduct.belongsTo(models.Product, { foreignKey: 'productId' });
  };

  return TrendyolProduct;
};