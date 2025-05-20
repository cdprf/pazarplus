// filepath: /Users/Username/Desktop/Soft/pazar+/services/order-management/src/models/HepsiburadaProduct.js
// This file defines the HepsiburadaProduct model for platform-specific product data
module.exports = (sequelize, DataTypes) => {
  const HepsiburadaProduct = sequelize.define('HepsiburadaProduct', {
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
      comment: 'Product ID from Hepsiburada'
    },
    merchantId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    barcode: {
      type: DataTypes.STRING,
      allowNull: true
    },
    stockCode: {
      type: DataTypes.STRING,
      allowNull: true
    },
    hbSku: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Hepsiburada SKU identifier'
    },
    merchantSku: {
      type: DataTypes.STRING,
      allowNull: true
    },
    categoryId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Hepsiburada category ID'
    },
    categoryName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    brandId: {
      type: DataTypes.STRING,
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
    commission: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Commission rate for this product'
    },
    cargoCompany: {
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
    approvalStatus: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Status of the product approval process'
    },
    salesStatus: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Sales status on the platform'
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
      comment: 'Current price on Hepsiburada'
    },
    platformDiscountedPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Discounted price on Hepsiburada'
    },
    platformStockQuantity: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Current stock quantity on Hepsiburada'
    },
    dispatchTime: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Dispatch time in days'
    },
    maxDeliveryDays: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Maximum delivery days'
    },
    lastSyncedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    rawData: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Raw data from Hepsiburada API'
    }
  }, {
    tableName: 'HepsiburadaProducts',
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
      },
      {
        fields: ['hbSku']
      },
      {
        fields: ['merchantSku']
      },
      {
        fields: ['approvalStatus']
      },
      {
        fields: ['salesStatus']
      }
    ]
  });

  HepsiburadaProduct.associate = (models) => {
    HepsiburadaProduct.belongsTo(models.Product, { foreignKey: 'productId' });
  };

  return HepsiburadaProduct;
};