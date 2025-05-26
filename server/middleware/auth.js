const jwt = require("jsonwebtoken");
const { User } = require("../models");
const logger = require("../utils/logger");
const config = require("../config/config");

/**
 * Authentication middleware to verify JWT tokens
 */
const auth = async (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");

    // Enhanced debugging for token extraction
    logger.debug("Auth middleware called", {
      url: req.url,
      method: req.method,
      authHeader: authHeader
        ? `Bearer ${authHeader.substring(7, 20)}...`
        : "missing",
      userAgent: req.headers["user-agent"]?.substring(0, 50),
    });

    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      logger.warn("Authentication failed: No token provided", {
        url: req.url,
        ip: req.ip,
      });
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    // Enhanced token validation with detailed logging
    logger.debug("Attempting token verification", {
      tokenLength: token.length,
      tokenStart: token.substring(0, 20),
      secretExists: !!config.jwt.secret,
      secretLength: config.jwt.secret?.length,
    });

    // Verify token using centralized config
    const decoded = jwt.verify(token, config.jwt.secret);

    logger.debug("Token decoded successfully", {
      userId: decoded.id,
      tokenExp: decoded.exp,
      tokenIat: decoded.iat,
    });

    // Find user
    const user = await User.findByPk(decoded.id);
    if (!user) {
      logger.warn("Authentication failed: User not found", {
        userId: decoded.id,
        url: req.url,
      });
      return res.status(401).json({
        success: false,
        message: "Invalid token - user not found.",
      });
    }

    if (!user.isActive) {
      logger.warn("Authentication failed: User not active", {
        userId: decoded.id,
        userEmail: user.email,
        url: req.url,
      });
      return res.status(401).json({
        success: false,
        message: "Invalid token - user not active.",
      });
    }

    // Add user to request
    req.user = user;
    logger.debug("Authentication successful", {
      userId: user.id,
      userEmail: user.email,
      url: req.url,
    });

    next();
  } catch (error) {
    // Enhanced error logging with more details
    logger.error("Authentication error occurred", {
      error: error.message,
      errorName: error.name,
      errorStack: error.stack,
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.headers["user-agent"]?.substring(0, 100),
      authHeader: req.header("Authorization") ? "present" : "missing",
      tokenLength:
        req.header("Authorization")?.replace("Bearer ", "")?.length || 0,
    });

    if (error.name === "JsonWebTokenError") {
      // Enhanced logging for JsonWebTokenError with specific handling for invalid signature
      if (error.message === "invalid signature") {
        logger.warn(
          "JWT invalid signature detected - likely old token with different secret",
          {
            url: req.url,
            tokenLength: req.header("Authorization")?.replace("Bearer ", "")
              ?.length
              ? req.header("Authorization")?.replace("Bearer ", "")?.length
              : 0,
            userAgent: req.headers["user-agent"]?.substring(0, 50),
            ip: req.ip,
            suggestion: "User should clear browser storage and re-login",
          }
        );

        return res.status(401).json({
          success: false,
          message: "Authentication token is invalid. Please login again.",
          code: "INVALID_TOKEN_SIGNATURE",
          action: "CLEAR_STORAGE_AND_RELOGIN",
        });
      }

      logger.warn("JWT validation failed", {
        reason: error.message,
        url: req.url,
        tokenProvided: !!req.header("Authorization"),
      });
      return res.status(401).json({
        success: false,
        message: `Invalid token: ${error.message}`,
        code: "INVALID_TOKEN",
      });
    }

    if (error.name === "TokenExpiredError") {
      logger.warn("Token expired", {
        expiredAt: error.expiredAt,
        url: req.url,
      });
      return res.status(401).json({
        success: false,
        message: "Token expired.",
        expiredAt: error.expiredAt,
      });
    }

    if (error.name === "NotBeforeError") {
      logger.warn("Token not yet valid", {
        notBefore: error.date,
        url: req.url,
      });
      return res.status(401).json({
        success: false,
        message: "Token not yet valid.",
      });
    }

    // Generic JWT or other authentication errors
    return res.status(500).json({
      success: false,
      message: "Authentication error.",
      ...(process.env.NODE_ENV === "development" && { error: error.message }),
    });
  }
};

/**
 * Admin-only middleware
 */
const adminAuth = async (req, res, next) => {
  try {
    // First run regular auth
    await auth(req, res, () => {
      // Check if user is admin
      if (req.user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Access denied. Admin privileges required.",
        });
      }
      next();
    });
  } catch (error) {
    logger.error("Admin authentication error:", error);
    return res.status(500).json({
      success: false,
      message: "Authentication error.",
    });
  }
};

/**
 * Optional auth middleware - doesn't fail if no token provided
 */
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, config.jwt.secret);
    const user = await User.findByPk(decoded.id);

    req.user = user && user.isActive ? user : null;
    next();
  } catch (error) {
    // For optional auth, we just continue without user
    req.user = null;
    next();
  }
};

module.exports = auth; // Export auth as default
module.exports.auth = auth; // Named export
module.exports.adminAuth = adminAuth; // Named export
module.exports.optionalAuth = optionalAuth; // Named export
