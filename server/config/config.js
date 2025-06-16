require("dotenv").config();

const config = {
  // Server configuration
  server: {
    port: process.env.PORT || 5001, // Fixed: Match the actual port used
    env: process.env.NODE_ENV || "development",
    apiUrl: process.env.API_URL || "http://localhost:5001",
    clientUrl: process.env.CLIENT_URL || "http://localhost:3000",
  },

  // Database configuration
  database: {
    name: process.env.DB_NAME || "pazar_plus",
    username: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 3306,
    dialect: process.env.DB_DIALECT || "mysql",
    storage: process.env.DB_STORAGE || "database.sqlite",
    logging: process.env.DB_LOGGING === "true",
    poolMax: parseInt(process.env.DB_POOL_MAX || "5", 10),
    poolMin: parseInt(process.env.DB_POOL_MIN || "0", 10),
    poolAcquire: parseInt(process.env.DB_POOL_ACQUIRE || "30000", 10),
    poolIdle: parseInt(process.env.DB_POOL_IDLE || "10000", 10),
  },

  // JWT configuration
  jwt: {
    secret:
      process.env.JWT_SECRET ||
      (() => {
        if (process.env.NODE_ENV === "production") {
          throw new Error(
            "JWT_SECRET environment variable is required in production"
          );
        }
        console.warn("⚠️ Using default JWT secret - CHANGE IN PRODUCTION!");
        return "dev-secret-change-in-production";
      })(),
    expiresIn: process.env.JWT_EXPIRES_IN || "1d",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  },

  // Platform API configurations
  platforms: {
    trendyol: {
      apiUrl: process.env.TRENDYOL_API_URL || "https://api.trendyol.com/sapigw",
      sandboxUrl:
        process.env.TRENDYOL_SANDBOX_URL ||
        "https://api.trendyol.com/sapigw/sandbox",
    },
    n11: {
      apiUrl: process.env.N11_API_URL || "https://api.n11.com/ws",
      sandboxUrl:
        process.env.N11_SANDBOX_URL || "https://api.n11.com/ws/sandbox",
    },
    hepsiburada: {
      apiUrl: process.env.HEPSIBURADA_API_URL || "https://api.hepsiburada.com",
      sandboxUrl:
        process.env.HEPSIBURADA_SANDBOX_URL ||
        "https://api.hepsiburada.com/sandbox",
    },
  },

  // File uploads
  uploads: {
    directory: process.env.UPLOAD_DIR || "uploads",
    maxSize: parseInt(process.env.UPLOAD_MAX_SIZE || "5242880", 10), // 5MB
  },

  // Rate limiting - More generous limits for development
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10), // 15 minutes
    max:
      process.env.NODE_ENV === "development"
        ? parseInt(process.env.RATE_LIMIT_MAX || "1000", 10) // 1000 requests for dev
        : parseInt(process.env.RATE_LIMIT_MAX || "100", 10), // 100 requests for production
  },

  // CORS configuration for network access
  CORS_ORIGINS: [
    process.env.CLIENT_URL || "http://localhost:3000",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    // Allow connections from any device on the local network
    // These can be overridden by environment variables
    ...(process.env.ADDITIONAL_CORS_ORIGINS
      ? process.env.ADDITIONAL_CORS_ORIGINS.split(",")
      : []),
  ],

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || "info",
    maxFiles: parseInt(process.env.LOG_MAX_FILES || "5", 10),
    maxSize: process.env.LOG_MAX_SIZE || "5m",
  },
};

module.exports = config;
