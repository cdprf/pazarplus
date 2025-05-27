// This file configures the database connection for the Order Management Service.
// It supports both SQLite and PostgreSQL based on environment configuration.
// The database connection settings are validated and loaded from environment variables.

require("dotenv").config();

const { Sequelize } = require("sequelize");
const { loadConfig, getDatabaseConfig } = require("./env");
const logger = require("../utils/logger");

// Load and validate environment configuration
const config = loadConfig();

// Get database configuration based on environment
const dbConfig = getDatabaseConfig(config);

// Configure Sequelize with the database connection
const sequelize = new Sequelize(dbConfig);

// Function to test the database connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    logger.info(
      `Database connection established successfully (${config.DB_TYPE.toUpperCase()})`
    );
    return true;
  } catch (error) {
    logger.error("Unable to connect to the database:", error);
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
module.exports.config = config;
