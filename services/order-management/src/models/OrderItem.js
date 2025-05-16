// This file configures order item models for the Order Management Service.
module.exports = (sequelize, DataTypes) => {
    const OrderItem = sequelize.define('OrderItem', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      orderId: {
        type: DataTypes.UUID,
        allowNull: false
      },
      productId: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'Reference to product in our system if available'
      },
      externalProductId: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Product ID from the external platform'
      },
      sku: {
        type: DataTypes.STRING,
        allowNull: true
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      variantName: {
        type: DataTypes.STRING,
        allowNull: true
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1
      },
      unitPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
      },
      totalPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
      },
      discount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      weight: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
      },
      weightUnit: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: 'kg'
      },
      imageUrl: {
        type: DataTypes.STRING,
        allowNull: true
      },
      taxAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
      },
      taxRate: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true
      },
      options: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Product options/attributes'
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: true
      }
    }, {
      tableName: 'order_items',
      timestamps: true,
      indexes: [
        {
          fields: ['orderId']
        },
        {
          fields: ['externalProductId']
        },
        {
          fields: ['sku']
        }
      ]
    });
  
    OrderItem.associate = (models) => {
      OrderItem.belongsTo(models.Order, { foreignKey: 'orderId' });
      OrderItem.belongsTo(models.Product, { foreignKey: 'productId' });
    };
  
    return OrderItem;
  };