// This file configures the database connection for the Order Management Service.
// It uses Sequelize ORM to connect to the database and supports SQLite as the default dialect.
// The database connection settings can be customized using environment variables.
const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config();

const dbDialect = process.env.DB_DIALECT || 'sqlite';
const dbStorage = process.env.DB_STORAGE || './database.sqlite';

const sequelize = new Sequelize({
  dialect: dbDialect,
  storage: path.resolve(__dirname, '../../', dbStorage),
  logging: process.env.NODE_ENV === 'development' ? console.log : false
});

// Test database connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
};

module.exports = {
  sequelize,
  testConnection
};