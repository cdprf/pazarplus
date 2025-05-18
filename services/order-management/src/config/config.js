const path = require('path');

module.exports = {
  development: {
    dialect: 'sqlite',
    storage: path.resolve(__dirname, '../../database.sqlite'), // Corrected path
    logging: console.log
  },
  test: {
    dialect: 'sqlite',
    storage: ':memory:',
    logging: false
  },
  production: {
    dialect: 'sqlite',
    storage: path.resolve(__dirname, '../../database.sqlite'), // Corrected path for production as well
    logging: false
  }
};
