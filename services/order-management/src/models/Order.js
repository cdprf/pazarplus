// This file configures order management models for the Order Management Service.
// It uses Sequelize ORM to define the Order model with various attributes and validation rules.
// The model includes associations with User, PlatformConnection, ShippingDetail, and OrderItem models.
module.exports = (sequelize, DataTypes) => {
    const Order = sequelize.define('Order', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      externalOrderId: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Order ID from the external platform'
      },
      platformType: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Type of platform (e.g., trendyol, hepsiburada)'
      },
      connectionId: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: 'Reference to the specific platform connection instance'
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false
      },
      customerName: {
        type: DataTypes.STRING,
        allowNull: false
      },
      customerEmail: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          isEmail: true
        }
      },
      customerPhone: {
        type: DataTypes.STRING,
        allowNull: true
      },
      orderDate: {
        type: DataTypes.DATE,
        allowNull: false
      },
      totalAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
      },
      currency: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'USD'
      },
      status: {
        type: DataTypes.ENUM(
          'new', 
          'processing', 
          'awaiting_payment', 
          'awaiting_shipment', 
          'shipped', 
          'delivered', 
          'cancelled', 
          'refunded', 
          'on_hold'
        ),
        allowNull: false,
        defaultValue: 'new'
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      paymentMethod: {
        type: DataTypes.STRING,
        allowNull: true
      },
      paymentStatus: {
        type: DataTypes.ENUM('pending', 'completed', 'failed', 'refunded'),
        allowNull: false,
        defaultValue: 'pending'
      },
      shippingMethod: {
        type: DataTypes.STRING,
        allowNull: true
      },
      rawData: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Raw data from the external platform'
      },
      lastSyncedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      deletedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Used for soft deletes - when set, the order is considered deleted'
      },
      deletedReason: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Reason why this order was deleted'
      },
      cancelledAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      cancellationReason: {
        type: DataTypes.STRING,
        allowNull: true
      }
    }, {
      tableName: 'orders',
      timestamps: true,
      hooks: {
        beforeUpdate: (order) => {
          // If this is a sync-related update and lastSyncedAt isn't explicitly set
          if (!order.changed('lastSyncedAt') && 
              (order.changed('status') || order.changed('rawData'))) {
            order.lastSyncedAt = new Date();
          }
        }
      },
      indexes: [
        {
          unique: true,
          fields: ['externalOrderId', 'connectionId']
        },
        {
          fields: ['userId']
        },
        {
          fields: ['platformType']
        },
        {
          fields: ['status']
        },
        {
          fields: ['orderDate']
        },
        {
          fields: ['paymentStatus']
        },
        {
          fields: ['deletedAt']
        },
        {
          fields: ['lastSyncedAt']
        },
        {
          fields: ['platformType', 'status']
        },
        {
          fields: ['customerEmail']
        },
        {
          fields: ['customerPhone']
        }
      ]
    });
  
    Order.associate = (models) => {
      Order.belongsTo(models.User, { foreignKey: 'userId' });
      Order.belongsTo(models.PlatformConnection, { foreignKey: 'connectionId' });
      Order.hasOne(models.ShippingDetail, { foreignKey: 'orderId' });
      Order.hasMany(models.OrderItem, { foreignKey: 'orderId' });
      Order.hasMany(models.OrderHistory, { foreignKey: 'orderId' });
      
      // Financial transactions association
      if (models.FinancialTransaction) {
        Order.hasMany(models.FinancialTransaction, { foreignKey: 'orderId' });
      }
      
      // Add generic platform associations
      if (models.PlatformData) {
        models.PlatformData.associateWith('Order', models);
      }
      
      if (models.PlatformAttribute) {
        models.PlatformAttribute.associateWith('Order', models);
      }
    };
  
    return Order;
  };