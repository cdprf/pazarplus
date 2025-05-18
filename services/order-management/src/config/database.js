// This file configures the database connection for the Order Management Service.
// It uses Sequelize ORM to connect to the database and supports SQLite as the default dialect.
// The database connection settings can be customized using environment variables.
const path = require('path');
require('dotenv').config();

const dbDialect = process.env.DB_DIALECT || 'sqlite';
const dbStorage = process.env.DB_STORAGE || './database.sqlite';

// Configuration for Sequelize CLI
const config = {
  development: {
    dialect: dbDialect,
    storage: path.resolve(__dirname, '../../', dbStorage),
    logging: console.log
  },
  test: {
    dialect: dbDialect,
    storage: ':memory:',
    logging: false
  },
  production: {
    dialect: dbDialect,
    storage: path.resolve(__dirname, '../../', dbStorage),
    logging: false
  }
};

// Export config for Sequelize CLI
module.exports = config;

// For use in the application
const { Sequelize } = require('sequelize');
const env = process.env.NODE_ENV || 'development';
const sequelize = new Sequelize(config[env]);

// Test database connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
};

// Retain the original exports
module.exports.sequelize = sequelize;
module.exports.testConnection = testConnection;