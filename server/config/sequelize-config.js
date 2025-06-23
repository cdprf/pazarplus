require("dotenv").config();

module.exports = {
  development: {
    dialect: "sqlite",
    storage: "database.sqlite",
    logging: console.log,
  },
  test: {
    dialect: "sqlite",
    storage: "database-test.sqlite",
    logging: false,
  },
  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: process.env.DB_DIALECT || "postgresql",
    logging: false,
  },
};
