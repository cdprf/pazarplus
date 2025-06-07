const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class N11Product extends Model {}

N11Product.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    productId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'products',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
    },
    n11ProductId: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
        comment: 'N11 product ID'
    },
    sellerCode: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Unique product code (SKU) for seller'
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Product title'
    },
    subtitle: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Product subtitle'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: 'Product description'
    },
    categoryId: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'N11 category ID'
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Product price'
    },
    currencyType: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'TL',
        comment: 'Currency type (e.g., TL)'
    },
    stockAmount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Stock quantity'
    },
    preparingDay: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Preparing days'
    },
    images: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        comment: 'Product images'
    },
    attributes: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {},
        comment: 'Product attributes'
    },
    shipmentTemplate: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Shipment template name'
    },
    approvalStatus: {
        type: DataTypes.ENUM('Unapproved', 'Approved', 'Rejected', 'Pending'),
        allowNull: false,
        defaultValue: 'Pending',
        comment: 'Product approval status on N11'
    },
    brandId: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Brand ID'
    },
    barcode: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Product barcode'
    },
    status: {
        type: DataTypes.ENUM('active', 'inactive', 'syncing', 'error', 'pending'),
        allowNull: false,
        defaultValue: 'pending',
        comment: 'Product status on N11'
    },
    lastSyncedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Last synchronization timestamp'
    },
    syncErrors: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Synchronization error details'
    }
}, {
    sequelize,
    modelName: 'N11Product',
    tableName: 'n11_products',
    timestamps: true,
    indexes: [
        {
            fields: ['productId'],
            name: 'n11_products_product_id_idx'
        },
        {
            fields: ['n11ProductId'],
            unique: true,
            name: 'n11_products_n11_product_id_unique'
        },
        {
            fields: ['status'],
            name: 'n11_products_status_idx'
        },
        {
            fields: ['lastSyncedAt'],
            name: 'n11_products_last_synced_at_idx'
        }
    ]
});

module.exports = N11Product;
