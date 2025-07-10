const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ReplyTemplate = sequelize.define(
  'ReplyTemplate',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },

    // Template identification
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Template name for easy identification'
    },

    // Template content
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Template reply text with placeholders'
    },

    // Categorization
    category: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Category like "shipping", "returns", "product_info", etc.'
    },

    // Platform compatibility
    platforms: {
      type: DataTypes.JSON,
      defaultValue: ['trendyol', 'hepsiburada', 'n11'],
      comment: 'Array of platforms this template can be used for'
    },

    // Question keywords for auto-suggestion
    keywords: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'Keywords that trigger this template suggestion'
    },

    // Template variables/placeholders
    variables: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'Array of variable names that can be replaced in the template'
    },

    // Usage tracking
    usageCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'How many times this template has been used'
    },

    lastUsed: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When this template was last used'
    },

    // Template metadata
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },

    isAutoSuggest: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Whether to auto-suggest this template based on keywords'
    },

    // Creator information
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'User who created this template'
    },

    // Template rating
    rating: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: true,
      comment: 'Average rating of this template effectiveness'
    },

    ratingCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  },
  {
    tableName: 'reply_templates',
    timestamps: true,
    indexes: [
      {
        fields: ['category']
      },
      {
        fields: ['isActive']
      },
      {
        fields: ['isAutoSuggest']
      },
      {
        fields: ['userId']
      },
      {
        fields: ['usageCount']
      }
    ]
  }
);

module.exports = ReplyTemplate;
