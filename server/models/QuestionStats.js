const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const QuestionStats = sequelize.define(
  'QuestionStats',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },

    // Time period
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      index: true
    },

    platform: {
      type: DataTypes.ENUM('trendyol', 'hepsiburada', 'n11', 'all'),
      allowNull: false,
      index: true
    },

    // Question counts by status
    total_questions: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },

    waiting_for_answer: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },

    answered: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },

    rejected: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },

    auto_closed: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },

    // Response time metrics
    avg_response_time_hours: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Average response time in hours'
    },

    max_response_time_hours: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },

    min_response_time_hours: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },

    // Question frequency analysis
    most_frequent_questions: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'Array of {question_hash, count, sample_text}'
    },

    // Popular keywords
    popular_keywords: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'Array of {keyword, count}'
    },

    // Template usage
    template_usage: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'Array of {template_id, usage_count}'
    }
  },
  {
    tableName: 'question_stats',
    timestamps: true,
    indexes: [
      {
        fields: ['date', 'platform'],
        unique: true
      },
      {
        fields: ['date']
      },
      {
        fields: ['platform']
      }
    ]
  }
);

module.exports = QuestionStats;
