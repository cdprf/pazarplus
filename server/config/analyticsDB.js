// Analytics-specific database configuration with connection pooling

// Simple logging for analytics database
const logger =
  process.env.NODE_ENV === "development"
    ? require("../utils/logger-simple")
    : null;

const analyticsDBConfig = {
  pool: {
    max: 20, // Maximum number of connections
    min: 5, // Minimum number of connections
    acquire: 30000, // Maximum time to get connection
    idle: 10000, // Time before releasing idle connection
    evict: 30000, // Time interval for evicting stale connections
  },

  // Analytics query optimization
  logging: logger ? (sql) => logger.info(sql) : false,

  // Retry configuration for analytics queries
  retry: {
    max: 3,
    timeout: 5000,
  },

  // Query timeout for analytics operations
  dialectOptions: {
    statement_timeout: 30000, // 30 seconds
    idle_in_transaction_session_timeout: 60000, // 1 minute
  },
};

module.exports = analyticsDBConfig;
