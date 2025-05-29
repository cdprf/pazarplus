const logger = require("./logger");

/**
 * Utility function to safely serialize data and prevent circular references
 * This function handles Sequelize instances, nested objects, and arrays while
 * filtering out sensitive data and circular reference properties.
 */
const safeJsonResponse = (data, maxDepth = 5, currentDepth = 0) => {
  try {
    // Prevent infinite recursion
    if (currentDepth >= maxDepth) {
      return "[Max depth reached]";
    }

    // If data is null or undefined, return as is
    if (data === null || data === undefined) {
      return data;
    }

    // If data is a Sequelize instance, convert to plain object
    if (data && typeof data.get === "function") {
      data = data.get({ plain: true });
    }

    // If data is an array, process each item
    if (Array.isArray(data)) {
      return data.map((item) =>
        safeJsonResponse(item, maxDepth, currentDepth + 1)
      );
    }

    // If data is an object, process recursively
    if (data && typeof data === "object") {
      // Handle Date objects
      if (data instanceof Date) {
        return data.toISOString();
      }

      // Handle Buffer objects
      if (Buffer.isBuffer(data)) {
        return data.toString("base64");
      }

      const serialized = {};
      for (const [key, value] of Object.entries(data)) {
        // Skip circular reference properties and sensitive data
        if (
          key === "user" ||
          key === "User" ||
          key === "dataValues" ||
          key === "_previousDataValues" ||
          key === "_changed" ||
          key === "_options" ||
          key === "password" ||
          key === "token" ||
          key === "passwordResetToken" ||
          key === "emailVerificationToken" ||
          key === "refreshToken" ||
          key === "apiKey" ||
          key === "apiSecret" ||
          key === "credentials" ||
          key.toLowerCase().includes("password") ||
          key.toLowerCase().includes("secret") ||
          key.toLowerCase().includes("token")
        ) {
          continue;
        }

        if (value && typeof value === "object") {
          if (typeof value.get === "function") {
            // Sequelize instance
            serialized[key] = safeJsonResponse(
              value.get({ plain: true }),
              maxDepth,
              currentDepth + 1
            );
          } else if (Array.isArray(value)) {
            // Array of potentially Sequelize instances
            serialized[key] = value.map((item) =>
              item && typeof item.get === "function"
                ? safeJsonResponse(
                    item.get({ plain: true }),
                    maxDepth,
                    currentDepth + 1
                  )
                : safeJsonResponse(item, maxDepth, currentDepth + 1)
            );
          } else {
            // Regular object - recursively serialize
            serialized[key] = safeJsonResponse(
              value,
              maxDepth,
              currentDepth + 1
            );
          }
        } else {
          serialized[key] = value;
        }
      }
      return serialized;
    }

    return data;
  } catch (error) {
    logger.error("Error serializing data for JSON response:", {
      error: error.message,
      dataType: typeof data,
      currentDepth,
      stack: error.stack,
    });
    return {
      error: "Failed to serialize data",
      type: typeof data,
      originalError: error.message,
    };
  }
};

/**
 * Middleware function to wrap res.json to automatically use safeJsonResponse
 */
const jsonResponseMiddleware = (req, res, next) => {
  const originalJson = res.json;

  res.json = function (data) {
    try {
      const safeData = safeJsonResponse(data);
      return originalJson.call(this, safeData);
    } catch (error) {
      logger.error("JSON response middleware error:", error);
      return originalJson.call(this, {
        success: false,
        message: "Internal server error",
        error: "Failed to serialize response data",
      });
    }
  };

  next();
};

/**
 * Helper function to sanitize user data for responses
 */
const sanitizeUserData = (user) => {
  if (!user) return null;

  const sanitized = safeJsonResponse(user);

  // Additional sanitization for user-specific sensitive fields
  if (sanitized && typeof sanitized === "object") {
    delete sanitized.password;
    delete sanitized.passwordResetToken;
    delete sanitized.emailVerificationToken;
    delete sanitized.refreshToken;
    delete sanitized.twoFactorSecret;
  }

  return sanitized;
};

/**
 * Helper function to sanitize platform connection data
 */
const sanitizePlatformData = (connection) => {
  if (!connection) return null;

  const sanitized = safeJsonResponse(connection);

  // Remove or mask credentials
  if (sanitized && sanitized.credentials) {
    if (typeof sanitized.credentials === "object") {
      const maskedCredentials = {};
      for (const [key, value] of Object.entries(sanitized.credentials)) {
        if (typeof value === "string" && value.length > 4) {
          maskedCredentials[key] =
            value.substring(0, 4) + "*".repeat(value.length - 4);
        } else {
          maskedCredentials[key] = "****";
        }
      }
      sanitized.credentials = maskedCredentials;
    } else {
      sanitized.credentials = "****";
    }
  }

  return sanitized;
};

module.exports = {
  safeJsonResponse,
  jsonResponseMiddleware,
  sanitizeUserData,
  sanitizePlatformData,
};
