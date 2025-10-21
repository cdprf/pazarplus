const { DataTypes, Model } = require("sequelize");
const sequelize = require("../config/database");

class MountingGroup extends Model {
  static associate(models) {
    this.hasMany(models.Product, {
      foreignKey: "mountingGroupId",
      as: "products",
    });
  }
}

MountingGroup.init(
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
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    images: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: '{"small": "url", "large": "url", "gallery": ["url1", "url2"]}',
    },
  },
  {
    sequelize,
    modelName: "MountingGroup",
    tableName: "mounting_groups",
    timestamps: true,
  }
);

module.exports = MountingGroup;