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
      platformId: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: 'Reference to the platform this order came from'
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
        allowNull: true
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
      }
    }, {
      tableName: 'orders',
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ['externalOrderId', 'platformId']
        },
        {
          fields: ['userId']
        },
        {
          fields: ['status']
        },
        {
          fields: ['orderDate']
        }
      ]
    });
  
    Order.associate = (models) => {
      Order.belongsTo(models.User, { foreignKey: 'userId' });
      Order.belongsTo(models.PlatformConnection, { foreignKey: 'platformId' });
      Order.hasOne(models.ShippingDetail, { foreignKey: 'orderId' });
      Order.hasMany(models.OrderItem, { foreignKey: 'orderId' });
    };
  
    return Order;
  };