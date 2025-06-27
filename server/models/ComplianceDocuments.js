const { DataTypes, Model } = require("sequelize");
const sequelize = require("../config/database");

class ComplianceDocuments extends Model {}

ComplianceDocuments.init(
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
    },
    documentType: {
      type: DataTypes.ENUM(
        "e-invoice",
        "e-archive",
        "shipping-label",
        "customs-declaration"
      ),
      allowNull: false,
    },
    documentNumber: {
      type: DataTypes.STRING(100),
      unique: true,
    },
    status: {
      type: DataTypes.ENUM(
        "draft",
        "generated",
        "sent",
        "accepted",
        "rejected"
      ),
      defaultValue: "draft",
    },
    customerType: {
      type: DataTypes.ENUM("INDIVIDUAL", "COMPANY"),
      allowNull: false,
    },
    customerInfo: {
      type: DataTypes.TEXT,
      allowNull: false,
      get() {
        const rawValue = this.getDataValue("customerInfo");
        return rawValue ? JSON.parse(rawValue) : null;
      },
      set(value) {
        this.setDataValue("customerInfo", JSON.stringify(value));
      },
    },
    orderData: {
      type: DataTypes.TEXT,
      allowNull: false,
      get() {
        const rawValue = this.getDataValue("orderData");
        return rawValue ? JSON.parse(rawValue) : null;
      },
      set(value) {
        this.setDataValue("orderData", JSON.stringify(value));
      },
    },
    xmlContent: {
      type: DataTypes.TEXT,
    },
    pdfPath: {
      type: DataTypes.STRING(255),
    },
    gibResponse: {
      type: DataTypes.TEXT,
      get() {
        const rawValue = this.getDataValue("gibResponse");
        return rawValue ? JSON.parse(rawValue) : null;
      },
      set(value) {
        this.setDataValue("gibResponse", value ? JSON.stringify(value) : null);
      },
    },
    generatedAt: {
      type: DataTypes.DATE,
    },
    sentAt: {
      type: DataTypes.DATE,
    },
    processedAt: {
      type: DataTypes.DATE,
    },
    errorMessage: {
      type: DataTypes.TEXT,
    },
    retryCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    metadata: {
      type: DataTypes.TEXT,
      get() {
        const rawValue = this.getDataValue("metadata");
        return rawValue ? JSON.parse(rawValue) : {};
      },
      set(value) {
        this.setDataValue("metadata", JSON.stringify(value || {}));
      },
    },
  },
  {
    sequelize,
    modelName: "ComplianceDocuments",
    tableName: "compliance_documents",
    timestamps: true,
    indexes: [
      {
        fields: ["orderId"],
      },
      {
        fields: ["documentType"],
      },
      {
        fields: ["status"],
      },
      {
        fields: ["customerType"],
      },
      {
        fields: ["createdAt"],
      },
      {
        unique: true,
        fields: ["documentNumber"],
        where: {
          documentNumber: {
            [require("sequelize").Op.ne]: null,
          },
        },
      },
    ],
  }
);

module.exports = ComplianceDocuments;
