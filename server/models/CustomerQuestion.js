const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const CustomerQuestion = sequelize.define(
  "CustomerQuestion",
  {
    // Common fields across all platforms
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    // Platform identification
    platform: {
      type: DataTypes.ENUM("trendyol", "hepsiburada", "n11"),
      allowNull: false,
      index: true,
    },

    // Platform-specific question IDs
    platform_question_id: {
      type: DataTypes.STRING,
      allowNull: false,
      index: true,
      comment: "Original question ID from the platform",
    },

    // Customer information
    customer_id: {
      type: DataTypes.STRING, // Trendyol: customerId, HepsiBurada: customerId, N11: customer info
      allowNull: true,
      index: true,
    },

    customer_name: {
      type: DataTypes.STRING, // Trendyol: userName, HepsiBurada: customer name in conversations
      allowNull: true,
    },

    show_customer_name: {
      type: DataTypes.BOOLEAN, // Trendyol: showUserName
      defaultValue: true,
    },

    // Question content and metadata
    question_text: {
      type: DataTypes.TEXT, // Trendyol: text, HepsiBurada: lastContent
      allowNull: false,
    },

    status: {
      type: DataTypes.STRING, // Trendyol: status, HepsiBurada: Status
      allowNull: false,
      index: true,
      comment: "WAITING_FOR_ANSWER, ANSWERED, REJECTED, AUTO_CLOSED, etc.",
    },

    // Product information
    product_name: {
      type: DataTypes.STRING, // Trendyol: productName, HepsiBurada: product.name
      allowNull: true,
    },

    product_main_id: {
      type: DataTypes.STRING, // Trendyol: productMainId
      allowNull: true,
    },

    product_sku: {
      type: DataTypes.STRING, // HepsiBurada: product.sku
      allowNull: true,
    },

    product_stock_code: {
      type: DataTypes.STRING, // HepsiBurada: product.stockCode
      allowNull: true,
    },

    product_image_url: {
      type: DataTypes.TEXT, // Trendyol: imageUrl, HepsiBurada: product.imageUrl
      allowNull: true,
    },

    product_web_url: {
      type: DataTypes.TEXT, // Trendyol: webUrl
      allowNull: true,
    },

    // Order information (if question is related to an order)
    order_number: {
      type: DataTypes.STRING, // HepsiBurada: orderNumber
      allowNull: true,
    },

    line_item_id: {
      type: DataTypes.STRING, // HepsiBurada: lineItemId
      allowNull: true,
    },

    // Question metadata
    public: {
      type: DataTypes.BOOLEAN, // Trendyol: public
      defaultValue: true,
    },

    creation_date: {
      type: DataTypes.DATE, // Platform creation date
      allowNull: false,
      index: true,
    },

    answered_date: {
      type: DataTypes.DATE, // When the question was answered
      allowNull: true,
    },

    answered_date_message: {
      type: DataTypes.STRING, // Trendyol: answeredDateMessage
      allowNull: true,
    },

    expire_date: {
      type: DataTypes.DATE, // HepsiBurada: expireDate (2 business days to answer)
      allowNull: true,
    },

    last_modified_at: {
      type: DataTypes.DATE, // HepsiBurada: lastModifiedAt
      allowNull: true,
    },

    // Subject/Category information
    subject_id: {
      type: DataTypes.STRING, // HepsiBurada: subject.id
      allowNull: true,
    },

    subject_description: {
      type: DataTypes.STRING, // HepsiBurada: subject.Description
      allowNull: true,
    },

    // Merchant information
    merchant_id: {
      type: DataTypes.STRING, // HepsiBurada: merchant.id
      allowNull: true,
    },

    merchant_name: {
      type: DataTypes.STRING, // HepsiBurada: merchant.name
      allowNull: true,
    },

    // Rejection/Report information
    reported_date: {
      type: DataTypes.DATE, // Trendyol: reportedDate
      allowNull: true,
    },

    report_reason: {
      type: DataTypes.TEXT, // Trendyol: reportReason
      allowNull: true,
    },

    rejected_date: {
      type: DataTypes.DATE, // Trendyol: rejectedDate
      allowNull: true,
    },

    reason: {
      type: DataTypes.TEXT, // Trendyol: reason
      allowNull: true,
    },

    // Question frequency tracking
    question_hash: {
      type: DataTypes.STRING, // Hash of normalized question text for similarity detection
      allowNull: true,
      index: true,
    },

    similar_questions_count: {
      type: DataTypes.INTEGER, // Count of similar questions
      defaultValue: 0,
    },

    // Internal management
    assigned_to: {
      type: DataTypes.STRING, // User ID who is handling this question (changed to string to match UUID)
      allowNull: true,
      // Temporarily remove foreign key constraint to allow table creation
      // references: {
      //   model: "users",
      //   key: "id",
      // },
    },

    priority: {
      type: DataTypes.ENUM("low", "medium", "high", "urgent"),
      defaultValue: "medium",
    },

    tags: {
      type: DataTypes.JSON, // Array of tags for categorization
      defaultValue: [],
    },

    internal_notes: {
      type: DataTypes.TEXT, // Internal notes for customer service team
      allowNull: true,
    },

    // Raw platform data
    raw_data: {
      type: DataTypes.JSON, // Store complete platform response for reference
      allowNull: true,
    },
  },
  {
    tableName: "customer_questions",
    timestamps: true,
    indexes: [
      {
        fields: ["platform", "platform_question_id"],
        unique: true,
      },
      {
        fields: ["customer_name"],
      },
      {
        fields: ["status", "creation_date"],
      },
      {
        fields: ["question_hash"],
      },
      {
        fields: ["assigned_to"],
      },
      {
        fields: ["expire_date"],
      },
    ],
  }
);

module.exports = CustomerQuestion;
