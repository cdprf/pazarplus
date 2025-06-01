const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const InventoryMovement = sequelize.define(
    "InventoryMovement",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      productId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: "Products",
          key: "id",
        },
      },
      variantId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: "ProductVariants",
          key: "id",
        },
      },
      sku: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: "SKU at the time of movement",
      },
      movementType: {
        type: DataTypes.ENUM(
          "IN_STOCK", // Initial stock entry
          "PURCHASE", // Stock purchased/received
          "SALE", // Stock sold
          "ADJUSTMENT", // Manual adjustment
          "RETURN", // Product returned
          "DAMAGE", // Damaged/lost stock
          "TRANSFER", // Transferred between locations
          "SYNC_UPDATE", // Updated from platform sync
          "RESERVATION", // Stock reserved for order
          "RELEASE" // Reserved stock released
        ),
        allowNull: false,
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: "Positive for increases, negative for decreases",
      },
      previousQuantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      newQuantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      referenceId: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Reference to order, purchase, etc.",
      },
      referenceType: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Type of reference (order, purchase, etc.)",
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "Users",
          key: "id",
        },
      },
      platformType: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Platform that triggered the movement",
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {},
        comment: "Additional movement metadata",
      },
    },
    {
      tableName: "InventoryMovements",
      indexes: [
        {
          fields: ["productId"],
        },
        {
          fields: ["variantId"],
        },
        {
          fields: ["sku"],
        },
        {
          fields: ["movementType"],
        },
        {
          fields: ["userId"],
        },
        {
          fields: ["createdAt"],
        },
        {
          fields: ["referenceId", "referenceType"],
        },
      ],
    }
  );

  InventoryMovement.associate = function (models) {
    InventoryMovement.belongsTo(models.Product, {
      foreignKey: "productId",
      as: "product",
    });

    InventoryMovement.belongsTo(models.ProductVariant, {
      foreignKey: "variantId",
      as: "variant",
    });

    InventoryMovement.belongsTo(models.User, {
      foreignKey: "userId",
      as: "user",
    });
  };

  return InventoryMovement;
};
