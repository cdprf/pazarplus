const Joi = require("joi");
const path = require("path");

// Environment validation schema
const envSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid("development", "production", "test")
    .default("development"),

  PORT: Joi.number().port().default(5000),

  API_VERSION: Joi.string().default("v1"),

  CLIENT_URL: Joi.string().uri().default("http://localhost:3000"),

  // CORS Configuration
  CORS_ORIGINS: Joi.alternatives()
    .try(Joi.string(), Joi.array().items(Joi.string().uri()))
    .default(["http://localhost:3000", "http://localhost:3001"]),

  // Rate Limiting Configuration
  RATE_LIMIT_WINDOW_MS: Joi.number().default(15 * 60 * 1000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: Joi.number().default(100),

  // Database Configuration
  DB_TYPE: Joi.string().valid("sqlite", "postgresql").default("sqlite"),

  // PostgreSQL Configuration
  DB_HOST: Joi.string().when("DB_TYPE", {
    is: "postgresql",
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),

  DB_PORT: Joi.number()
    .port()
    .when("DB_TYPE", {
      is: "postgresql",
      then: Joi.number().default(5432),
      otherwise: Joi.optional(),
    }),

  DB_NAME: Joi.string().when("DB_TYPE", {
    is: "postgresql",
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),

  DB_USER: Joi.string().when("DB_TYPE", {
    is: "postgresql",
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),

  DB_PASSWORD: Joi.string().when("DB_TYPE", {
    is: "postgresql",
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),

  DB_SSL: Joi.boolean().default(false),

  // SQLite Configuration
  SQLITE_PATH: Joi.string().default(path.join(__dirname, "../database.sqlite")),

  // JWT Configuration
  JWT_SECRET: Joi.string().optional(),
  JWT_EXPIRES_IN: Joi.string().default("1d"),

  // Other environment variables...
  LOG_LEVEL: Joi.string()
    .valid("error", "warn", "info", "debug")
    .default("info"),
});

/**
 * Validates and loads environment configuration
 * @returns {Object} Validated environment configuration
 */
const loadConfig = () => {
  const { error, value } = envSchema.validate(process.env, {
    allowUnknown: true,
    stripUnknown: false,
  });

  if (error) {
    throw new Error(`Environment validation failed: ${error.message}`);
  }

  return value;
};

/**
 * Get database configuration based on environment
 * @param {Object} config - Environment configuration
 * @returns {Object} Database configuration for Sequelize
 */
const getDatabaseConfig = (config) => {
  const baseConfig = {
    logging: config.NODE_ENV === "development" ? console.log : false,
    define: {
      timestamps: true,
      underscored: false,
      freezeTableName: false,
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  };

  if (config.DB_TYPE === "postgresql") {
    return {
      ...baseConfig,
      dialect: "postgres",
      host: config.DB_HOST,
      port: config.DB_PORT,
      database: config.DB_NAME,
      username: config.DB_USER,
      password: config.DB_PASSWORD,
      dialectOptions: {
        ssl: config.DB_SSL
          ? {
              require: true,
              rejectUnauthorized: false,
            }
          : false,
      },
    };
  } else {
    return {
      ...baseConfig,
      dialect: "sqlite",
      storage: config.SQLITE_PATH || path.join(__dirname, "../database.sqlite"),
    };
  }
};

module.exports = {
  loadConfig,
  getDatabaseConfig,
  envSchema,
};
