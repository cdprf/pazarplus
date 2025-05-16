// This file configures the database connection for the Order Management Service.
// It uses Sequelize ORM to connect to the database and supports SQLite as the default dialect.
// The database connection settings can be customized using environment variables.
require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  environment: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'default_jwt_secret_dev_only',
  jwtExpiration: process.env.JWT_EXPIRATION || '24h',
  logLevel: process.env.LOG_LEVEL || 'info'
};