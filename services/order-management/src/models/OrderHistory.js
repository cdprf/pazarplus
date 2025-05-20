// filepath: /Users/Username/Desktop/Soft/pazar+/services/order-management/src/models/OrderHistory.js
// This file defines the OrderHistory model for tracking changes to orders
module.exports = (sequelize, DataTypes) => {
  const OrderHistory = sequelize.define('OrderHistory', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    orderId: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'Reference to the Order model'
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'User who made the change, null for system changes'
    },
    changeType: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Type of change: status, shipping, payment, etc.'
    },
    fieldName: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Specific field that was changed'
    },
    oldValue: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Previous value before the change'
    },
    newValue: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'New value after the change'
    },
    source: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'system',
      comment: 'Source of change: system, api, user, platform'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Additional notes about the change'
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Additional metadata about the change'
    }
  }, {
    tableName: 'order_history',
    timestamps: true,
    indexes: [
      {
        fields: ['orderId']
      },
      {
        fields: ['userId']
      },
      {
        fields: ['changeType']
      },
      {
        fields: ['createdAt']
      }
    ]
  });

  OrderHistory.associate = (models) => {
    OrderHistory.belongsTo(models.Order, { foreignKey: 'orderId' });
    OrderHistory.belongsTo(models.User, { foreignKey: 'userId' });
  };

  return OrderHistory;
};