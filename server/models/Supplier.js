const { DataTypes, Model } = require("sequelize");
const sequelize = require("../config/database");

class Supplier extends Model {}

Supplier.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    apiDetails: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: "API URL, keys, and other connection info",
    },
    priority: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "Lower number means higher priority",
    },
  },
  {
    sequelize,
    modelName: "Supplier",
    tableName: "suppliers",
    timestamps: true,
  }
);

Supplier.associate = function (models) {
  Supplier.hasMany(models.SupplierPrice, {
    foreignKey: "supplierId",
    as: "prices",
  });
};

module.exports = Supplier;