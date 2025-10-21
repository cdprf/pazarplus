const { DataTypes, Model } = require("sequelize");
const sequelize = require("../config/database");

class AIChatLog extends Model {}

AIChatLog.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true, // Can be null for guest users
      references: {
        model: "users",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    },
    sessionId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    response: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    intent: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    entities: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    timestamp: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: "AIChatLog",
    tableName: "ai_chat_logs",
    timestamps: true,
  }
);

AIChatLog.associate = function (models) {
  AIChatLog.belongsTo(models.User, {
    foreignKey: "userId",
    as: "user",
  });
};

module.exports = AIChatLog;