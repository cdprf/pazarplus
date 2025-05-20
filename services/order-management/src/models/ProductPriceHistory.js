// filepath: /Users/Username/Desktop/Soft/pazar+/services/order-management/src/models/ProductPriceHistory.js
// This file defines the ProductPriceHistory model for tracking price changes
module.exports = (sequelize, DataTypes) => {
  const ProductPriceHistory = sequelize.define('ProductPriceHistory', {
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
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'User who made the change (null for system changes)'
    },
    platformType: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Platform where price change occurred (null for base price)'
    },
    changeSource: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Source of change (e.g., manual, api, sync)'
    },
    previousPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    newPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    priceChange: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Price difference (can be positive or negative)'
    },
    currency: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'TRY'
    },
    priceType: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'regular',
      comment: 'Type of price (regular, sale, special, etc.)'
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Reason for the price change'
    },
    effectiveDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When the price change becomes effective (null for immediate)'
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true
    }
  }, {
    tableName: 'product_price_history',
    timestamps: true,
    indexes: [
      {
        fields: ['productId']
      },
      {
        fields: ['userId']
      },
      {
        fields: ['platformType']
      },
      {
        fields: ['priceType']
      },
      {
        fields: ['changeSource']
      },
      {
        fields: ['createdAt']
      },
      {
        fields: ['effectiveDate']
      }
    ]
  });

  ProductPriceHistory.associate = (models) => {
    ProductPriceHistory.belongsTo(models.Product, { foreignKey: 'productId' });
    ProductPriceHistory.belongsTo(models.User, { foreignKey: 'userId' });
  };

  return ProductPriceHistory;
};