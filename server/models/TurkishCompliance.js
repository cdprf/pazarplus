const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class TurkishCompliance extends Model {}

TurkishCompliance.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  orderId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'orders',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  // E-Fatura (Electronic Invoice) fields
  eFaturaUuid: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
    comment: 'E-Fatura unique identifier'
  },
  eFaturaNumber: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'E-Fatura serial number'
  },
  eFaturaDate: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'E-Fatura creation date'
  },
  eFaturaStatus: {
    type: DataTypes.ENUM,
    values: ['DRAFT', 'SENT', 'DELIVERED', 'ACCEPTED', 'REJECTED', 'CANCELLED'],
    allowNull: true,
    comment: 'E-Fatura status in GIB system'
  },
  eFaturaXml: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'E-Fatura XML content'
  },
  eFaturaPdf: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'E-Fatura PDF base64 encoded'
  },
  
  // E-Arşiv (Electronic Archive) fields
  eArsivUuid: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'E-Arşiv unique identifier'
  },
  eArsivNumber: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'E-Arşiv document number'
  },
  eArsivDate: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'E-Arşiv creation date'
  },
  eArsivStatus: {
    type: DataTypes.ENUM,
    values: ['CREATED', 'SENT_TO_ARCHIVE', 'ARCHIVED', 'FAILED'],
    allowNull: true,
    comment: 'E-Arşiv status'
  },
  
  // Tax and Legal Information
  taxNumber: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Customer tax number (VKN for companies, TCKN for individuals)'
  },
  taxOffice: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Tax office name for companies'
  },
  customerType: {
    type: DataTypes.ENUM,
    values: ['INDIVIDUAL', 'COMPANY'],
    allowNull: false,
    defaultValue: 'INDIVIDUAL',
    comment: 'Customer type for tax compliance'
  },
  identityNumber: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Turkish identity number (TCKN) for individuals'
  },
  
  // KDV (VAT) Information
  kdvTotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    comment: 'Total KDV amount'
  },
  kdvRate: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 18.00,
    comment: 'KDV rate percentage'
  },
  kdvExempt: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether this order is KDV exempt'
  },
  kdvExemptReason: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Reason for KDV exemption'
  },
  
  // KVKK (Personal Data Protection) Compliance
  kvkkConsent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Customer KVKK consent status'
  },
  kvkkConsentDate: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Date of KVKK consent'
  },
  kvkkConsentMethod: {
    type: DataTypes.ENUM,
    values: ['EXPLICIT', 'IMPLICIT', 'WEBSITE', 'PHONE', 'EMAIL'],
    allowNull: true,
    comment: 'Method of KVKK consent collection'
  },
  
  // İrsaliye (Delivery Note) Information
  irsaliyeNumber: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Delivery note number'
  },
  irsaliyeDate: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Delivery note date'
  },
  
  // TEBLİĞ (Official Notifications)
  gibNotifications: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'GIB (Revenue Administration) notifications and responses'
  },
  
  // Compliance Status
  complianceStatus: {
    type: DataTypes.ENUM,
    values: ['PENDING', 'COMPLIANT', 'NON_COMPLIANT', 'UNDER_REVIEW'],
    allowNull: false,
    defaultValue: 'PENDING',
    comment: 'Overall compliance status'
  },
  complianceNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Notes about compliance issues or requirements'
  },
  lastComplianceCheck: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Last date compliance was checked'
  },
  
  // Integration Data
  gibIntegrationData: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Raw data from GIB integrations'
  },
  errorMessages: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Any error messages from compliance systems'
  }
}, {
  sequelize,
  modelName: 'TurkishCompliance',
  tableName: 'turkish_compliance',
  timestamps: true,
  indexes: [
    {
      fields: ['orderId'],
      unique: true
    },
    {
      fields: ['eFaturaUuid'],
      unique: true,
      where: {
        eFaturaUuid: {
          [require('sequelize').Op.ne]: null
        }
      }
    },
    {
      fields: ['eFaturaNumber']
    },
    {
      fields: ['taxNumber']
    },
    {
      fields: ['complianceStatus']
    },
    {
      fields: ['customerType']
    },
    {
      fields: ['eFaturaStatus']
    },
    {
      fields: ['kvkkConsent']
    }
  ]
});

module.exports = TurkishCompliance;