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

  // PostgreSQL Connection URL (for Neon, Supabase, etc.)
  DATABASE_URL: Joi.string().uri().optional(),

  // PostgreSQL Configuration (traditional)
  DB_HOST: Joi.string().when("DB_TYPE", {
    is: "postgresql",
    then: Joi.optional(),
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
    then: Joi.optional(),
    otherwise: Joi.optional(),
  }),

  DB_USER: Joi.string().when("DB_TYPE", {
    is: "postgresql",
    then: Joi.optional(),
    otherwise: Joi.optional(),
  }),

  DB_PASSWORD: Joi.string()
    .allow("")
    .when("DB_TYPE", {
      is: "postgresql",
      then: Joi.allow(""), // Allow empty password for local development
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
      max: config.NODE_ENV === "production" ? 5 : 20, // Reduced for serverless
      min: 0,
      acquire: 60000,
      idle: 10000,
      evict: 1000,
    },
  };

  if (config.DB_TYPE === "postgresql") {
    // Use DATABASE_URL if provided (Neon, Supabase, etc.)
    if (config.DATABASE_URL) {
      return {
        ...baseConfig,
        dialect: "postgres",
        dialectOptions: {
          ssl: {
            require: true,
            rejectUnauthorized: false, // For Neon compatibility
          },
          charset: "utf8",
        },
        // Parse DATABASE_URL for connection details
        url: config.DATABASE_URL,
        timezone: "+03:00", // Turkey timezone
        charset: "utf8",
      };
    } else {
      // Traditional connection parameters
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
          charset: "utf8",
          collate: "utf8_unicode_ci",
        },
        timezone: "+03:00", // Turkey timezone
        charset: "utf8",
      };
    }
  } else {
    return {
      ...baseConfig,
      dialect: "sqlite",
      storage: config.SQLITE_PATH || path.join(__dirname, "../database.sqlite"),
      dialectOptions: {
        // SQLite optimizations for better concurrency
        busy_timeout: 30000, // 30 seconds busy timeout
        // Ensure UTF-8 encoding for Turkish characters
        charset: "utf8",
      },
      // Enhanced pool configuration for SQLite
      pool: {
        max: 1, // SQLite works best with single connection
        min: 0,
        acquire: 60000, // Increased acquire timeout for busy databases
        idle: 30000, // Increased idle timeout
      },
      // Ensure proper charset
      charset: "utf8",
      collate: "utf8_unicode_ci",
    };
  }
};

module.exports = {
  loadConfig,
  getDatabaseConfig,
  envSchema,
};
