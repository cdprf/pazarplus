// This file configures shipping detail models for the Order Management Service.
module.exports = (sequelize, DataTypes) => {
    const ShippingDetail = sequelize.define('ShippingDetail', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      orderId: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true
      },
      recipientName: {
        type: DataTypes.STRING,
        allowNull: false
      },
      address1: {
        type: DataTypes.STRING,
        allowNull: false
      },
      address2: {
        type: DataTypes.STRING,
        allowNull: true
      },
      city: {
        type: DataTypes.STRING,
        allowNull: false
      },
      state: {
        type: DataTypes.STRING,
        allowNull: true
      },
      postalCode: {
        type: DataTypes.STRING,
        allowNull: false
      },
      country: {
        type: DataTypes.STRING,
        allowNull: false
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: true
      },
      email: {
        type: DataTypes.STRING,
        allowNull: true
      },
      shippingMethod: {
        type: DataTypes.STRING,
        allowNull: true
      },
      trackingNumber: {
        type: DataTypes.STRING,
        allowNull: true
      },
      trackingUrl: {
        type: DataTypes.STRING,
        allowNull: true
      },
      carrierName: {
        type: DataTypes.STRING,
        allowNull: true
      },
      shippingCost: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
      },
      taxAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
      },
      estimatedDeliveryDate: {
        type: DataTypes.DATE,
        allowNull: true
      },
      shippedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      deliveredAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      status: {
        type: DataTypes.ENUM(
          'pending', 
          'processing', 
          'ready_to_ship', 
          'shipped', 
          'out_for_delivery', 
          'delivered', 
          'failed_delivery', 
          'returned'
        ),
        allowNull: false,
        defaultValue: 'pending'
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      specialInstructions: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      labelUrl: {
        type: DataTypes.STRING,
        allowNull: true
      },
      packageWeight: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
      },
      packageDimensions: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Length, width, height in cm'
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: true
      }
    }, {
      tableName: 'shipping_details',
      timestamps: true,
      indexes: [
        {
          fields: ['orderId']
        },
        {
          fields: ['trackingNumber']
        },
        {
          fields: ['status']
        }
      ]
    });
  
    ShippingDetail.associate = (models) => {
      ShippingDetail.belongsTo(models.Order, { foreignKey: 'orderId' });
    };
  
    return ShippingDetail;
  };