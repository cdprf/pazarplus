const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const ReplyTemplate = sequelize.define(
  "ReplyTemplate",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    // Template identification
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "Template name for easy identification",
    },

    // Template content
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: "Template reply text with placeholders",
    },

    // Categorization
    category: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Category like "shipping", "returns", "product_info", etc.',
    },

    // Platform compatibility
    platforms: {
      type: DataTypes.JSON,
      defaultValue: ["trendyol", "hepsiburada", "n11"],
      comment: "Array of platforms this template can be used for",
    },

    // Question keywords for auto-suggestion
    keywords: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: "Keywords that trigger this template suggestion",
    },

    // Template variables/placeholders
    variables: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: "Array of variable names that can be replaced in the template",
    },

    // Usage tracking
    usage_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: "How many times this template has been used",
    },

    last_used: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "When this template was last used",
    },

    // Template metadata
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },

    is_auto_suggest: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: "Whether to auto-suggest this template based on keywords",
    },

    // Creator information
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
    },

    updated_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "users",
        key: "id",
      },
    },

    // Template rating
    rating: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: true,
      comment: "Average rating of this template effectiveness",
    },

    rating_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
  },
  {
    tableName: "reply_templates",
    timestamps: true,
    indexes: [
      {
        fields: ["category"],
      },
      {
        fields: ["is_active"],
      },
      {
        fields: ["is_auto_suggest"],
      },
      {
        fields: ["created_by"],
      },
      {
        fields: ["usage_count"],
      },
    ],
  }
);

module.exports = ReplyTemplate;
