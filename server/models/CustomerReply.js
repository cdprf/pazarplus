const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CustomerReply = sequelize.define(
  'CustomerReply',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },

    // Link to the question
    question_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'customer_questions',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },

    // Platform information
    platform: {
      type: DataTypes.ENUM('trendyol', 'hepsiburada', 'n11'),
      allowNull: false
    },

    platform_reply_id: {
      type: DataTypes.STRING, // Platform-specific reply ID
      allowNull: true
    },

    // Reply content
    reply_text: {
      type: DataTypes.TEXT, // The actual reply content
      allowNull: false
    },

    // Reply metadata
    reply_type: {
      type: DataTypes.ENUM('answer', 'reject', 'internal_note'),
      allowNull: false,
      defaultValue: 'answer'
    },

    // Who sent the reply
    from_type: {
      type: DataTypes.ENUM('merchant', 'customer', 'admin'),
      allowNull: false,
      comment: 'HepsiBurada: conversations[x].from (Customer/Merchant)'
    },

    // User who created the reply (for merchant replies)
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },

    // Timestamps
    creation_date: {
      type: DataTypes.DATE, // Platform creation date
      allowNull: false
    },

    sent_date: {
      type: DataTypes.DATE, // When the reply was actually sent to platform
      allowNull: true
    },

    // Platform-specific fields
    has_private_info: {
      type: DataTypes.BOOLEAN, // Trendyol: answer.hasPrivateInfo
      defaultValue: false
    },

    // Customer feedback
    customer_feedback: {
      type: DataTypes.BOOLEAN, // HepsiBurada: conversations[x].customerFeedback
      allowNull: true
    },

    // Rejection information
    reject_reason: {
      type: DataTypes.TEXT, // HepsiBurada: conversations[x].rejectReason
      allowNull: true
    },

    // File attachments
    attachments: {
      type: DataTypes.JSON, // HepsiBurada: conversations[x].files[y]
      defaultValue: [],
      comment:
        'Array of attachment URLs (.jpg, .pdf, .docx, .xlsx, .bmp, .png for HepsiBurada)'
    },

    // Status
    status: {
      type: DataTypes.ENUM('draft', 'sent', 'failed', 'rejected'),
      defaultValue: 'draft'
    },

    // Error information
    error_message: {
      type: DataTypes.TEXT, // If sending failed
      allowNull: true
    },

    // Template information
    template_id: {
      type: DataTypes.INTEGER, // If reply was created from a template
      allowNull: true,
      references: {
        model: 'reply_templates',
        key: 'id'
      }
    },

    // Raw platform data
    raw_data: {
      type: DataTypes.JSON, // Store complete platform response
      allowNull: true
    }
  },
  {
    tableName: 'customer_replies',
    timestamps: true,
    indexes: [
      {
        fields: ['question_id']
      },
      {
        fields: ['platform', 'platform_reply_id']
      },
      {
        fields: ['from_type', 'creation_date']
      },
      {
        fields: ['status']
      },
      {
        fields: ['created_by']
      }
    ]
  }
);

module.exports = CustomerReply;
