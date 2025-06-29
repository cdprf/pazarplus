// This file configures the PostgreSQL database connection for the Order Management Service.
// The database connection settings are validated and loaded from environment variables.

require("dotenv").config();

const { Sequelize } = require("sequelize");
const logger = require("../utils/logger");

// PostgreSQL database configuration
const dbConfig = {
  dialect: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "pazar_plus",
  username: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "",
  logging: process.env.NODE_ENV === "development" ? console.log : false,
  dialectOptions: {
    ssl:
      process.env.DB_SSL === "true"
        ? {
            require: true,
            rejectUnauthorized: false,
          }
        : false,
    connectTimeout: 5000,
  },
  pool: {
    max: process.env.NODE_ENV === "production" ? 20 : 5,
    min: 0,
    acquire: 10000,
    idle: 5000,
    evict: 1000,
  },
  define: {
    timestamps: true,
    underscored: false,
    freezeTableName: false,
  },
};

// Use DATABASE_URL if provided (for cloud deployments like Neon, Heroku, etc.)
let sequelize;
if (process.env.DATABASE_URL) {
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    ...dbConfig,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
  });
} else {
  sequelize = new Sequelize(dbConfig);
}

// Function to test the database connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    logger.info("PostgreSQL database connection established successfully");
    return true;
  } catch (error) {
    logger.error("Unable to connect to the PostgreSQL database:", error);
    return false;
  }
};

// Function to sync database (create tables if they don't exist)
const syncDatabase = async (force = false) => {
  try {
    await sequelize.sync({ force });
    logger.info("Database synchronized successfully");
    return true;
  } catch (error) {
    logger.error("Database synchronization failed:", error);
    return false;
  }
};

// Function to close database connection
const closeConnection = async () => {
  try {
    await sequelize.close();
    logger.info("Database connection closed");
  } catch (error) {
    logger.error("Error closing database connection:", error);
  }
};

module.exports = sequelize;
module.exports.testConnection = testConnection;
module.exports.syncDatabase = syncDatabase;
module.exports.closeConnection = closeConnection;
module.exports.config = dbConfig;
