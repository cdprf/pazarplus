// This file defines the HepsiburadaOrder model for platform-specific data
module.exports = (sequelize, DataTypes) => {
  const HepsiburadaOrder = sequelize.define('HepsiburadaOrder', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    orderId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    packageNumber: {
      type: DataTypes.STRING,
      allowNull: false
    },
    merchantId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    customerId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    orderNumber: {
      type: DataTypes.STRING,
      allowNull: true
    },
    referenceNumber: {
      type: DataTypes.STRING,
      allowNull: true
    },
    cargoCompany: {
      type: DataTypes.STRING,
      allowNull: true
    },
    cargoTrackingNumber: {
      type: DataTypes.STRING,
      allowNull: true
    },
    cargoTrackingUrl: {
      type: DataTypes.STRING,
      allowNull: true
    },
    paymentType: {
      type: DataTypes.STRING,
      allowNull: true
    },
    shippingAddressJson: {
      type: DataTypes.JSON,
      allowNull: true
    },
    billingAddressJson: {
      type: DataTypes.JSON,
      allowNull: true
    },
    invoiceAddressJson: {
      type: DataTypes.JSON,
      allowNull: true
    },
    platformStatus: {
      type: DataTypes.STRING,
      allowNull: true
    },
    paymentStatus: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    tableName: 'HepsiburadaOrders',
    timestamps: true,
    indexes: [
      {
        fields: ['orderId']
      },
      {
        fields: ['packageNumber']
      },
      {
        fields: ['orderNumber']
      }
    ]
  });

  HepsiburadaOrder.associate = (models) => {
    HepsiburadaOrder.belongsTo(models.Order, { foreignKey: 'orderId' });
  };

  return HepsiburadaOrder;
};