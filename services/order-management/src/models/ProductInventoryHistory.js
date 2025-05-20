// filepath: /Users/Username/Desktop/Soft/pazar+/services/order-management/src/models/ProductInventoryHistory.js
// This file defines the ProductInventoryHistory model for tracking inventory changes
module.exports = (sequelize, DataTypes) => {
  const ProductInventoryHistory = sequelize.define('ProductInventoryHistory', {
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
    changeSource: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Source of change (e.g., manual, trendyol, hepsiburada, order)'
    },
    sourceReferenceId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Reference ID from source (order ID, sync ID, etc.)'
    },
    previousQuantity: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    newQuantity: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    quantityChange: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Change amount (positive for additions, negative for reductions)'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true
    }
  }, {
    tableName: 'product_inventory_history',
    timestamps: true,
    indexes: [
      {
        fields: ['productId']
      },
      {
        fields: ['userId']
      },
      {
        fields: ['changeSource']
      },
      {
        fields: ['sourceReferenceId']
      },
      {
        fields: ['createdAt']
      }
    ]
  });

  ProductInventoryHistory.associate = (models) => {
    ProductInventoryHistory.belongsTo(models.Product, { foreignKey: 'productId' });
    ProductInventoryHistory.belongsTo(models.User, { foreignKey: 'userId' });
  };

  return ProductInventoryHistory;
};