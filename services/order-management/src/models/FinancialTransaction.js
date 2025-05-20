// filepath: /Users/Username/Desktop/Soft/pazar+/services/order-management/src/models/FinancialTransaction.js
// This file defines the FinancialTransaction model for tracking financial transactions
module.exports = (sequelize, DataTypes) => {
  const FinancialTransaction = sequelize.define('FinancialTransaction', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    orderId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'Reference to the Order model (can be null for non-order transactions)'
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'User who owns this transaction'
    },
    platformConnectionId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'Reference to the platform connection'
    },
    externalTransactionId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Transaction ID from external platform'
    },
    transactionType: {
      type: DataTypes.ENUM(
        'order_payment',
        'platform_commission',
        'refund',
        'shipping_cost',
        'tax',
        'adjustment',
        'payout',
        'other'
      ),
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Amount of the transaction (negative for expenses)'
    },
    currency: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'TRY'
    },
    status: {
      type: DataTypes.ENUM(
        'pending', 
        'completed', 
        'failed', 
        'cancelled'
      ),
      allowNull: false,
      defaultValue: 'pending'
    },
    transactionDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Additional transaction data'
    },
    platformType: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Type of platform (e.g., trendyol, hepsiburada)'
    }
  }, {
    tableName: 'financial_transactions',
    timestamps: true,
    indexes: [
      {
        fields: ['orderId']
      },
      {
        fields: ['userId']
      },
      {
        fields: ['platformConnectionId']
      },
      {
        fields: ['externalTransactionId']
      },
      {
        fields: ['transactionType']
      },
      {
        fields: ['status']
      },
      {
        fields: ['transactionDate']
      },
      {
        fields: ['platformType']
      }
    ]
  });

  FinancialTransaction.associate = (models) => {
    FinancialTransaction.belongsTo(models.Order, { foreignKey: 'orderId' });
    FinancialTransaction.belongsTo(models.User, { foreignKey: 'userId' });
    FinancialTransaction.belongsTo(models.PlatformConnection, { foreignKey: 'platformConnectionId' });
  };

  return FinancialTransaction;
};