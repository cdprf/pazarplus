const { DataTypes, Model } = require("sequelize");
const sequelize = require("../config/database");

class SupplierPrice extends Model {}

SupplierPrice.init(
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
    supplierId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "suppliers",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    priceTl: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0,
      },
    },
    priceUsd: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      validate: {
        min: 0,
      },
    },
    activeCurrency: {
      type: DataTypes.ENUM("TL", "USD"),
      allowNull: false,
      defaultValue: "TL",
    },
    stockStatus: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    deliveryTime: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "e.g., '1-3 days'",
    },
    lastUpdated: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: "SupplierPrice",
    tableName: "supplier_prices",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["productId", "supplierId"],
      },
    ],
  }
);

SupplierPrice.associate = function (models) {
  SupplierPrice.belongsTo(models.Product, {
    foreignKey: "productId",
    as: "product",
  });
  SupplierPrice.belongsTo(models.Supplier, {
    foreignKey: "supplierId",
    as: "supplier",
  });
};

module.exports = SupplierPrice;