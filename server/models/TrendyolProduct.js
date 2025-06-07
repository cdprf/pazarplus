const { DataTypes, Model } = require("sequelize");
const sequelize = require("../config/database");

class TrendyolProduct extends Model {}

TrendyolProduct.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        productId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: "products",
                key: "id",
            },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
        },
        trendyolProductId: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            comment: "Trendyol product ID",
        },
        barcode: {
            type: DataTypes.STRING,
            allowNull: true,
            comment: "Product barcode for Trendyol",
        },
        title: {
            type: DataTypes.STRING,
            allowNull: false,
            comment: "Product name/title on Trendyol",
        },
        brand: {
            type: DataTypes.STRING,
            allowNull: true,
            comment: "Trendyol brand name",
        },
        brandId: {
            type: DataTypes.STRING,
            allowNull: true,
            comment: "Trendyol brand ID",
        },
        categoryName: {
            type: DataTypes.STRING,
            allowNull: true,
            comment: "Trendyol category name",
        },
        categoryId: {
            type: DataTypes.STRING,
            allowNull: true,
            comment: "Trendyol category ID",
        },
        quantity: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            comment: "Available quantity on Trendyol",
        },
        stockCode: {
            type: DataTypes.STRING,
            allowNull: true,
            comment: "Stock code (merchant SKU)",
        },
        dimensionalWeight: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            comment: "Dimensional weight",
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: "Product description on Trendyol",
        },
        currencyType: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: "TRY",
            comment: "Currency type",
        },
        listPrice: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            comment: "List price",
        },
        salePrice: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            comment: "Sale price",
        },
        vatRate: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: "VAT rate",
        },
        images: {
            type: DataTypes.TEXT,
            allowNull: true,
            defaultValue: "[]",
            get() {
                const rawValue = this.getDataValue('images');
                return rawValue ? JSON.parse(rawValue) : [];
            },
            set(value) {
                this.setDataValue('images', JSON.stringify(value));
            },
            comment: "Product images for Trendyol",
        },
        attributes: {
            type: DataTypes.TEXT,
            allowNull: true,
            defaultValue: "[]",
            get() {
                const rawValue = this.getDataValue('attributes');
                return rawValue ? JSON.parse(rawValue) : [];
            },
            set(value) {
                this.setDataValue('attributes', JSON.stringify(value));
            },
            comment: "Trendyol-specific product attributes",
        },
        approved: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            comment: "Product approval status on Trendyol",
        },
        rejected: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            comment: "Product rejection status on Trendyol",
        },
        blockedByPartner: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            comment: "Blocked by partner status",
        },
        hasActiveCampaign: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            comment: "Active campaign status",
        },
        archived: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            comment: "Product archived status",
        },
        blacklisted: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            comment: "Product blacklisted status",
        },
        locked: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            comment: "Product locked status",
        },
        onSale: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            comment: "Product on sale status",
        },
        hasHtmlContent: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            comment: "Product has HTML content",
        },
        productUrl: {
            type: DataTypes.STRING,
            allowNull: true,
            comment: "Trendyol product URL",
        },
        productCode: {
            type: DataTypes.STRING,
            allowNull: true,
            comment: "Trendyol product code",
        },
        productContentId: {
            type: DataTypes.STRING,
            allowNull: true,
            comment: "Trendyol product content ID",
        },
        productMainId: {
            type: DataTypes.STRING,
            allowNull: true,
            comment: "Trendyol product main ID",
        },
        pimCategoryId: {
            type: DataTypes.STRING,
            allowNull: true,
            comment: "Trendyol PIM category ID",
        },
        supplierId: {
            type: DataTypes.STRING,
            allowNull: true,
            comment: "Trendyol supplier ID",
        },
        platformListingId: {
            type: DataTypes.STRING,
            allowNull: true,
            comment: "Trendyol platform listing ID",
        },
        status: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: "pending",
            comment: "Product status on Trendyol",
        },
        lastSyncedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: "Last synchronization timestamp",
        },
        syncErrors: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: "Synchronization error details",
        },
        createDateTime: {
            type: DataTypes.BIGINT,
            allowNull: true,
            comment: "Product creation datetime (ms)",
        },
        lastUpdateDate: {
            type: DataTypes.BIGINT,
            allowNull: true,
            comment: "Product last update datetime (ms)",
        },
        rejectReasonDetails: {
            type: DataTypes.TEXT,
            allowNull: true,
            defaultValue: "[]",
            get() {
                const rawValue = this.getDataValue('rejectReasonDetails');
                return rawValue ? JSON.parse(rawValue) : [];
            },
            set(value) {
                this.setDataValue('rejectReasonDetails', JSON.stringify(value));
            },
            comment: "Product reject reason details",
        },
        stockUnitType: {
            type: DataTypes.STRING,
            allowNull: true,
            comment: "Stock unit type",
        },
    },
    {
        sequelize,
        modelName: "TrendyolProduct",
        tableName: "trendyol_products",
        timestamps: true,
        indexes: [
            {
                fields: ["productId"],
                name: "trendyol_products_product_id_idx",
            },
            {
                fields: ["trendyolProductId"],
                unique: true,
                name: "trendyol_products_trendyol_product_id_unique",
            },
            {
                fields: ["status"],
                name: "trendyol_products_status_idx",
            },
            {
                fields: ["lastSyncedAt"],
                name: "trendyol_products_last_synced_at_idx",
            },
        ],
    }
);

module.exports = TrendyolProduct;
