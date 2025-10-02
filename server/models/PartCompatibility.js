const { DataTypes, Model } = require("sequelize");
const sequelize = require("../config/database");

class PartCompatibility extends Model {}

PartCompatibility.init(
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
    vehicleId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "vehicles",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
  },
  {
    sequelize,
    modelName: "PartCompatibility",
    tableName: "part_compatibilities",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["productId", "vehicleId"],
      },
    ],
  }
);

module.exports = PartCompatibility;