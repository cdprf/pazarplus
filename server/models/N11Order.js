const { DataTypes, Model } = require("sequelize");
const sequelize = require("../config/database");

class N11Order extends Model {}

N11Order.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    orderId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "orders",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    n11OrderId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      index: true,
      comment: "N11 order ID from API (field: id)",
    },
    orderNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      index: true,
      comment: "N11 order number from API",
    },
    sellerId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      comment: "N11 seller ID from API",
    },
    customerId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      comment: "N11 customer ID from API",
    },
    customerEmail: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Customer email from N11 API",
    },
    customerFullName: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Customer full name from N11 API",
    },
    tcIdentityNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Turkish Identity Number from N11 API",
    },
    taxId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Tax ID from N11 API",
    },
    taxOffice: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Tax office from N11 API",
    },
    orderStatus: {
      type: DataTypes.ENUM,
      values: [
        "Created",
        "Picking",
        "Shipped",
        "Delivered",
        "Cancelled",
        "Returned",
        "Processing",
        "Failed",
      ],
      allowNull: false,
      defaultValue: "Created",
      comment: "Order status matching N11 API values",
    },
    cargoSenderNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Cargo sender number from N11 API",
    },
    cargoTrackingNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      index: true,
      comment: "Cargo tracking number from N11 API",
    },
    cargoTrackingLink: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Cargo tracking link from N11 API",
    },
    shipmentCompanyId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "Shipment company ID from N11 API",
    },
    cargoProviderName: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Cargo provider name from N11 API",
    },
    shipmentMethod: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "Shipment method from N11 API",
    },
    installmentChargeWithVATprice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0.0,
      comment: "Installment charge with VAT from N11 API",
    },
    lastModifiedDate: {
      type: DataTypes.BIGINT,
      allowNull: true,
      comment: "Last modified timestamp from N11 API",
    },
    agreedDeliveryDate: {
      type: DataTypes.BIGINT,
      allowNull: true,
      comment: "Agreed delivery timestamp from N11 API",
    },
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: "Total amount from N11 API",
    },
    totalDiscountAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: "Total discount amount from N11 API",
    },
    packageHistories: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: "Package status history from N11 API",
    },
    shipmentPackageStatus: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Current shipment package status from N11 API",
    },
    lines: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: "Order line items from N11 API",
    },
    shippingAddress: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: "N11 shipping address details from API",
    },
    billingAddress: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: "N11 billing address details from API",
    },
    n11OrderDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "N11 order creation date",
    },
    lastSyncAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "Last synchronization with N11 platform",
    },
    platformFees: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: "N11 platform commission fees",
    },
    platformOrderData: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: "Raw N11 order data for backup and debugging",
    },
  },
  {
    sequelize,
    modelName: "N11Order",
    tableName: "n11_orders",
    timestamps: true,
    indexes: [
      {
        fields: ["orderId"],
      },
      {
        fields: ["n11OrderId"],
        unique: true,
      },
      {
        fields: ["orderNumber"],
      },
      {
        fields: ["sellerId"],
      },
      {
        fields: ["customerId"],
      },
      {
        fields: ["customerEmail"],
      },
      {
        fields: ["orderStatus"],
      },
      {
        fields: ["cargoTrackingNumber"],
      },
      {
        fields: ["shipmentPackageStatus"],
      },
      {
        fields: ["n11OrderDate"],
      },
      {
        fields: ["lastSyncAt"],
      },
      {
        fields: ["lastModifiedDate"],
      },
      {
        fields: ["agreedDeliveryDate"],
      },
    ],
  }
);

module.exports = N11Order;
