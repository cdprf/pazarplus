const { DataTypes, Model } = require("sequelize");
const sequelize = require("../config/database");

class Settings extends Model {}

Settings.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
    },
    category: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "company",
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    website: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    taxNumber: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    settings: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: "Settings",
    tableName: "settings",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["userId", "category"],
      },
    ],
  }
);

module.exports = Settings;
