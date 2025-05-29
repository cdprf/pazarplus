require("dotenv").config();

module.exports = {
  development: {
    dialect: process.env.DB_TYPE || "sqlite",
    storage: process.env.DB_STORAGE || "./database.sqlite",
    host: process.env.DB_HOST || "localhost",
    username: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "pazar_plus",
    logging: process.env.DB_LOGGING === "true" ? console.log : false,
    pool: {
      max: parseInt(process.env.DB_POOL_MAX || "5", 10),
      min: parseInt(process.env.DB_POOL_MIN || "0", 10),
      acquire: parseInt(process.env.DB_POOL_ACQUIRE || "30000", 10),
      idle: parseInt(process.env.DB_POOL_IDLE || "10000", 10),
    },
  },
  test: {
    dialect: "sqlite",
    storage: ":memory:",
    logging: false,
  },
  production: {
    dialect: process.env.DB_TYPE || "postgres",
    host: process.env.DB_HOST,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    logging: false,
    pool: {
      max: parseInt(process.env.DB_POOL_MAX || "20", 10),
      min: parseInt(process.env.DB_POOL_MIN || "0", 10),
      acquire: parseInt(process.env.DB_POOL_ACQUIRE || "30000", 10),
      idle: parseInt(process.env.DB_POOL_IDLE || "10000", 10),
    },
  },
};
