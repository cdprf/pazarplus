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
      then: Joi.default(5432),
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
  SQLITE_PATH: Joi.string().default(
    path.join(__dirname, "../../database.sqlite")
  ),

  // Redis Configuration
  REDIS_URL: Joi.string().default("redis://localhost:6379"),
  REDIS_HOST: Joi.string().default("localhost"),
  REDIS_PORT: Joi.number().port().default(6379),
  REDIS_PASSWORD: Joi.string().optional(),
  CACHE_TTL: Joi.number().default(3600), // 1 hour

  // Rate Limiting
  RATE_LIMIT_WINDOW: Joi.number().default(900000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: Joi.number().default(100),

  // Analytics Configuration
  ANALYTICS_ENABLED: Joi.boolean().default(true),
  ANALYTICS_BATCH_SIZE: Joi.number().default(100),
  ANALYTICS_FLUSH_INTERVAL: Joi.number().default(30000), // 30 seconds

  // Monitoring & Health Checks
  HEALTH_CHECK_INTERVAL: Joi.number().default(60000), // 1 minute
  PERFORMANCE_MONITORING: Joi.boolean().default(true),

  // Email Configuration
  SMTP_HOST: Joi.string().optional(),
  SMTP_PORT: Joi.number().port().default(587),
  SMTP_USER: Joi.string().optional(),
  SMTP_PASSWORD: Joi.string().optional(),
  SMTP_FROM: Joi.string().email().optional(),

  // Notification Settings
  NOTIFICATIONS_ENABLED: Joi.boolean().default(true),
  WEBHOOK_SECRET: Joi.string().optional(),

  // Security
  BCRYPT_ROUNDS: Joi.number().default(12),
  CORS_ORIGIN: Joi.alternatives()
    .try(Joi.string(), Joi.array().items(Joi.string()))
    .default("*"),

  // Platform API Configurations
  TRENDYOL_SUPPLIER_ID: Joi.string().optional(),
  TRENDYOL_API_KEY: Joi.string().optional(),
  TRENDYOL_API_SECRET: Joi.string().optional(),

  HEPSIBURADA_MERCHANT_ID: Joi.string().optional(),
  HEPSIBURADA_USERNAME: Joi.string().optional(),
  HEPSIBURADA_PASSWORD: Joi.string().optional(),

  N11_API_KEY: Joi.string().optional(),
  N11_SECRET_KEY: Joi.string().optional(),

  // Turkish Shipping Integration
  PTT_KARGO_USERNAME: Joi.string().optional(),
  PTT_KARGO_PASSWORD: Joi.string().optional(),
  YURTICI_KARGO_USERNAME: Joi.string().optional(),
  YURTICI_KARGO_PASSWORD: Joi.string().optional(),
  ARAS_KARGO_USERNAME: Joi.string().optional(),
  ARAS_KARGO_PASSWORD: Joi.string().optional(),

  // File Upload
  MAX_FILE_SIZE: Joi.number().default(10485760), // 10MB
  UPLOAD_PATH: Joi.string().default(path.join(__dirname, "../../uploads")),

  // Logging
  LOG_LEVEL: Joi.string()
    .valid("error", "warn", "info", "debug")
    .default("info"),
  LOG_FILE_PATH: Joi.string().default(path.join(__dirname, "../../logs")),
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

  // Parse CORS origins
  value.CORS_ORIGINS = value.CORS_ORIGINS.split(",").map((origin) =>
    origin.trim()
  );

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
      storage: path.resolve(__dirname, config.SQLITE_PATH),
    };
  }
};

module.exports = {
  loadConfig,
  getDatabaseConfig,
  envSchema,
};
