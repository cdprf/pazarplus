const { DataTypes, Model } = require("sequelize");
const sequelize = require("../config/database");

class Cart extends Model {}

Cart.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true, // Null for guest carts
      unique: true,
      references: {
        model: "users",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    sessionId: {
      type: DataTypes.STRING,
      allowNull: true, // Null for user carts
      unique: true,
    },
  },
  {
    sequelize,
    modelName: "Cart",
    tableName: "carts",
    timestamps: true,
  }
);

Cart.associate = function (models) {
  Cart.belongsTo(models.User, {
    foreignKey: "userId",
    as: "user",
  });
  Cart.hasMany(models.CartItem, {
    foreignKey: "cartId",
    as: "items",
    onDelete: "CASCADE", // If a cart is deleted, its items are also deleted
  });
};

module.exports = Cart;