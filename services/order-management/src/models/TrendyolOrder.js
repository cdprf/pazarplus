// This file defines the TrendyolOrder model for platform-specific data
module.exports = (sequelize, DataTypes) => {
  const TrendyolOrder = sequelize.define('TrendyolOrder', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    orderId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    orderNumber: {
      type: DataTypes.STRING,
      allowNull: false
    },
    cargoProviderName: {
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
    customerFirstName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    customerLastName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    customerEmail: {
      type: DataTypes.STRING,
      allowNull: true
    },
    shipmentAddressJson: {
      type: DataTypes.JSON,
      allowNull: true
    },
    invoiceAddressJson: {
      type: DataTypes.JSON,
      allowNull: true
    },
    deliveryAddressJson: {
      type: DataTypes.JSON,
      allowNull: true
    },
    note: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    platformStatus: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    tableName: 'TrendyolOrders',
    timestamps: true,
    indexes: [
      {
        fields: ['orderId']
      },
      {
        fields: ['orderNumber']
      }
    ]
  });

  TrendyolOrder.associate = (models) => {
    TrendyolOrder.belongsTo(models.Order, { foreignKey: 'orderId' });
  };

  return TrendyolOrder;
};