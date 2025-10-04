const { DataTypes, Model } = require("sequelize");
const sequelize = require("../config/database");

class CartItem extends Model {}

CartItem.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    cartId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "carts",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
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
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: 1,
      },
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: "Price of the item at the time it was added to the cart.",
    },
  },
  {
    sequelize,
    modelName: "CartItem",
    tableName: "cart_items",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["cartId", "productId", "supplierId"],
      },
    ],
  }
);

CartItem.associate = function (models) {
  CartItem.belongsTo(models.Cart, {
    foreignKey: "cartId",
    as: "cart",
  });
  CartItem.belongsTo(models.Product, {
    foreignKey: "productId",
    as: "product",
  });
  CartItem.belongsTo(models.Supplier, {
    foreignKey: "supplierId",
    as: "supplier",
  });
};

module.exports = CartItem;