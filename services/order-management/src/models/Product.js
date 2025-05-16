// This file configures product models for the Order Management Service.
// It defines the structure of the Product table in the database using Sequelize ORM.
// The Product model includes various fields such as id, userId, sku, name, description, price, cost, currency, weight, dimensions, inventory quantity, and more.
module.exports = (sequelize, DataTypes) => {
    const Product = sequelize.define('Product', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false
      },
      sku: {
        type: DataTypes.STRING,
        allowNull: false
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
      },
      cost: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
      },
      currency: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'USD'
      },
      weight: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
      },
      weightUnit: {
        type: DataTypes.STRING(10),
        allowNull: true,
        defaultValue: 'kg'
      },
      dimensions: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Length, width, height'
      },
      dimensionsUnit: {
        type: DataTypes.STRING(10),
        allowNull: true,
        defaultValue: 'cm'
      },
      inventoryQuantity: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      lowStockThreshold: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      mainImageUrl: {
        type: DataTypes.STRING,
        allowNull: true
      },
      additionalImages: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Array of image URLs'
      },
      hasVariants: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      barcode: {
        type: DataTypes.STRING,
        allowNull: true
      },
      barcodeType: {
        type: DataTypes.STRING,
        allowNull: true
      },
      categoryId: {
        type: DataTypes.UUID,
        allowNull: true
      },
      tags: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Array of tags'
      },
      attributes: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Custom product attributes'
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: true
      }
    }, {
      tableName: 'products',
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ['userId', 'sku']
        },
        {
          fields: ['userId']
        },
        {
          fields: ['name']
        },
        {
          fields: ['categoryId']
        }
      ]
    });
  
    Product.associate = (models) => {
      Product.belongsTo(models.User, { foreignKey: 'userId' });
      Product.hasMany(models.ProductVariant, { foreignKey: 'productId' });
      Product.hasMany(models.OrderItem, { foreignKey: 'productId' });
      // Add additional associations as needed
    };
  
    return Product;
  };