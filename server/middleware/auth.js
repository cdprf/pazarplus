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
      // Include tenant info if present
      tenantId: decoded.tenantId || null,
    });

    // Find user with subscription information
    const user = await User.findByPk(decoded.id, {
      include: [
        {
          association: "subscriptions",
          where: {
            status: ["trial", "active"],
          },
          required: false,
          limit: 1,
          order: [["createdAt", "DESC"]],
        },
      ],
    });

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

    // Add user and subscription info to request
    req.user = user;
    req.subscription = user.subscriptions?.[0] || null;
    req.tenantId = decoded.tenantId || user.tenantId;

    // Update last activity
    user.update({ lastActivityAt: new Date() }).catch((err) => {
      logger.warn("Failed to update last activity:", err.message);
    });

    logger.debug("Authentication successful", {
      userId: user.id,
      userEmail: user.email,
      subscriptionPlan: user.subscriptionPlan,
      tenantId: req.tenantId,
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
 * Feature gating middleware - checks if user has access to specific features
 */
const requireFeature = (featureName) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      // Check if user has access to the feature
      const hasAccess = req.user.hasFeatureAccess(featureName);

      if (!hasAccess) {
        logger.warn("Feature access denied", {
          userId: req.user.id,
          feature: featureName,
          subscriptionPlan: req.user.subscriptionPlan,
          url: req.url,
        });

        return res.status(403).json({
          success: false,
          message: `This feature requires a higher subscription plan`,
          requiredFeature: featureName,
          currentPlan: req.user.subscriptionPlan,
          upgradeRequired: true,
        });
      }

      next();
    } catch (error) {
      logger.error("Feature gate error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to check feature access",
      });
    }
  };
};

/**
 * Usage limit middleware - checks if user has exceeded usage limits
 */
const checkUsageLimit = (metricType) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.subscription) {
        return next(); // Skip if no subscription
      }

      const { trackUsage } = require("../controllers/subscription-controller");

      // Track this API call
      await trackUsage(req.user.id, metricType);

      // Check current usage against limits
      const currentMonth = new Date();
      const usageRecord = await req.user.getUsageRecords({
        where: {
          metricType,
          billingPeriodStart: { [require("sequelize").Op.lte]: currentMonth },
          billingPeriodEnd: { [require("sequelize").Op.gte]: currentMonth },
        },
      });

      if (usageRecord.length > 0 && usageRecord[0].isOverLimit()) {
        logger.warn("Usage limit exceeded", {
          userId: req.user.id,
          metricType,
          currentUsage: usageRecord[0].currentUsage,
          limit: usageRecord[0].limit,
        });

        return res.status(429).json({
          success: false,
          message: `Monthly ${metricType} limit exceeded`,
          usage: {
            current: usageRecord[0].currentUsage,
            limit: usageRecord[0].limit,
            resetDate: usageRecord[0].billingPeriodEnd,
          },
          upgradeRequired: true,
        });
      }

      next();
    } catch (error) {
      logger.error("Usage limit check error:", error);
      next(); // Continue on error to avoid blocking the request
    }
  };
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
    req.tenantId = decoded.tenantId || user?.tenantId;
    next();
  } catch (error) {
    // For optional auth, we just continue without user
    req.user = null;
    next();
  }
};

/**
 * Tenant isolation middleware - ensures users can only access their tenant's data
 */
const requireTenant = async (req, res, next) => {
  try {
    if (!req.user || !req.tenantId) {
      return res.status(403).json({
        success: false,
        message: "Tenant access required",
      });
    }

    // Add tenant filter to all database queries
    req.tenantFilter = { tenantId: req.tenantId };

    next();
  } catch (error) {
    logger.error("Tenant middleware error:", error);
    res.status(500).json({
      success: false,
      message: "Tenant validation error",
    });
  }
};

/**
 * Role-based access control middleware
 */
const requireRole = (roles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      const userRole = req.user.role;
      const allowedRoles = Array.isArray(roles) ? roles : [roles];

      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: "Insufficient permissions",
        });
      }

      next();
    } catch (error) {
      logger.error("Role middleware error:", error);
      res.status(500).json({
        success: false,
        message: "Role validation error",
      });
    }
  };
};

module.exports = {
  auth,
  adminAuth,
  optionalAuth,
  requireFeature,
  checkUsageLimit,
  requireTenant,
  requireRole,
};
