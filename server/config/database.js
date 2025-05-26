// This file configures the database connection for the Order Management Service.
// It uses Sequelize ORM to connect to the database and supports SQLite as the default dialect.
// The database connection settings can be customized using environment variables.
require('dotenv').config();

const { Sequelize } = require('sequelize');
const path = require('path');
const logger = require('../utils/logger');

// Configure Sequelize with the database connection
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '../../database.sqlite'),
  logging: process.env.NODE_ENV === 'development' ? (msg) => logger.debug(msg) : false,
  define: {
    timestamps: true,
    underscored: false,
    freezeTableName: false
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

// Function to test the database connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    logger.info('Database connection has been established successfully.');
    return true;
  } catch (error) {
    logger.error('Unable to connect to the database:', error);
    return false;
  }
};

module.exports = sequelize;
module.exports.testConnection = testConnection;