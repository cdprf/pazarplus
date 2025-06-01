const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const StockReservation = sequelize.define(
    "StockReservation",
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
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 1,
        },
      },
      orderNumber: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      orderId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      platformType: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM("active", "confirmed", "released", "expired"),
        allowNull: false,
        defaultValue: "active",
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "When the reservation expires",
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "Users",
          key: "id",
        },
      },
      reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {},
      },
    },
    {
      tableName: "StockReservations",
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
          fields: ["status"],
        },
        {
          fields: ["userId"],
        },
        {
          fields: ["orderNumber"],
        },
        {
          fields: ["expiresAt"],
        },
      ],
      hooks: {
        beforeCreate: (reservation) => {
          // Set default expiration time if not provided (24 hours)
          if (!reservation.expiresAt) {
            reservation.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
          }
        },
      },
    }
  );

  StockReservation.associate = function (models) {
    StockReservation.belongsTo(models.Product, {
      foreignKey: "productId",
      as: "product",
    });

    StockReservation.belongsTo(models.ProductVariant, {
      foreignKey: "variantId",
      as: "variant",
    });

    StockReservation.belongsTo(models.User, {
      foreignKey: "userId",
      as: "user",
    });
  };

  // Instance methods
  StockReservation.prototype.isExpired = function () {
    return this.expiresAt && new Date() > this.expiresAt;
  };

  StockReservation.prototype.extend = function (hours = 24) {
    this.expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
    return this.save();
  };

  // Static methods
  StockReservation.findExpired = function () {
    return this.findAll({
      where: {
        status: "active",
        expiresAt: {
          [sequelize.Sequelize.Op.lt]: new Date(),
        },
      },
    });
  };

  return StockReservation;
};
