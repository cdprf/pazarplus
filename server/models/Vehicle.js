const { DataTypes, Model } = require("sequelize");
const sequelize = require("../config/database");

class Vehicle extends Model {}

Vehicle.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    brand: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    model: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    yearRange: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "e.g., 2020-2023",
    },
    engineType: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "e.g., 1.6 TDI, 2.0 Petrol",
    },
    transmission: {
      type: DataTypes.ENUM("Manual", "Automatic"),
      allowNull: true,
    },
    fuelType: {
      type: DataTypes.ENUM("Petrol", "Diesel", "Hybrid", "Electric"),
      allowNull: true,
    },
    vinCode: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
  },
  {
    sequelize,
    modelName: "Vehicle",
    tableName: "vehicles",
    timestamps: true,
    indexes: [
      {
        fields: ["brand", "model", "yearRange"],
      },
    ],
  }
);

Vehicle.associate = function (models) {
  Vehicle.belongsToMany(models.Product, {
    through: "part_compatibilities",
    foreignKey: "vehicleId",
    otherKey: "productId",
    as: "compatibleParts",
  });
};

module.exports = Vehicle;