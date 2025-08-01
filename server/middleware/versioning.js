const logger = require("../utils/logger");
const { AppError } = require("./errorHandler");

/**
 * API versioning middleware
 * Handles version extraction from headers, URL path, or query parameters
 */
const apiVersioning = (req, res, next) => {
  // Initialize version tracking
  req.apiVersion = {
    requested: null,
    resolved: null,
    method: null,
  };

  // Method 1: Check Accept header (preferred method)
  // Example: Accept: application/vnd.pazarplus.v1+json
  const acceptHeader = req.get("Accept");
  if (acceptHeader && acceptHeader.includes("vnd.pazarplus.")) {
    const versionMatch = acceptHeader.match(/vnd\.pazarplus\.v(\d+)/);
    if (versionMatch) {
      req.apiVersion.requested = `v${versionMatch[1]}`;
      req.apiVersion.method = "header";
    }
  }

  // Method 2: Check custom version header
  // Example: X-API-Version: v1
  const versionHeader = req.get("X-API-Version") || req.get("API-Version");
  if (!req.apiVersion.requested && versionHeader) {
    const version = versionHeader.startsWith("v")
      ? versionHeader
      : `v${versionHeader}`;
    req.apiVersion.requested = version;
    req.apiVersion.method = "header";
  }

  // Method 3: Check URL path
  // Example: /api/v1/orders
  const pathVersionMatch = req.path.match(/^\/api\/v(\d+)/);
  if (!req.apiVersion.requested && pathVersionMatch) {
    req.apiVersion.requested = `v${pathVersionMatch[1]}`;
    req.apiVersion.method = "path";
  }

  // Method 4: Check query parameter
  // Example: /api/orders?version=v1
  const queryVersion = req.query.version || req.query.v;
  if (!req.apiVersion.requested && queryVersion) {
    const version = queryVersion.startsWith("v")
      ? queryVersion
      : `v${queryVersion}`;
    req.apiVersion.requested = version;
    req.apiVersion.method = "query";
  }

  // Default to latest version if none specified
  const defaultVersion = process.env.API_VERSION || "v1";
  req.apiVersion.resolved = req.apiVersion.requested || defaultVersion;

  // Validate version
  const supportedVersions = ["v1"]; // Will expand as we add more versions
  if (!supportedVersions.includes(req.apiVersion.resolved)) {
    return next(
      new AppError(
        `API version '${
          req.apiVersion.resolved
        }' is not supported. Supported versions: ${supportedVersions.join(
          ", "
        )}`,
        400,
        "UNSUPPORTED_API_VERSION"
      )
    );
  }

  // Add version info to response headers
  res.set("X-API-Version", req.apiVersion.resolved);
  res.set("X-Supported-Versions", supportedVersions.join(", "));

  // Only log API version requests in debug mode
  if (process.env.DEBUG_API_VERSIONING === "true") {
    logger.debug("API Version Request", {
      operation: "api_versioning",
      requested: req.apiVersion?.requested || null,
      resolved: req.apiVersion?.resolved || "v1",
      path: req.path,
      method: req.method,
      ip: req.ip,
    });
  }
  next();
};

/**
 * Version-specific route handler
 * Allows different implementations for different API versions
 */
const versionHandler = (handlers) => {
  return (req, res, next) => {
    const version = req.apiVersion?.resolved || "v1";
    const handler = handlers[version] || handlers.default;

    if (!handler) {
      return next(
        new AppError(
          `No handler available for API version ${version}`,
          501,
          "VERSION_HANDLER_NOT_IMPLEMENTED"
        )
      );
    }

    // Add version-specific context
    req.versionContext = {
      version,
      isLatest: version === (process.env.API_VERSION || "v1"),
      deprecated: false, // Will be set based on version deprecation policy
    };

    handler(req, res, next);
  };
};

/**
 * Deprecation warning middleware
 * Adds deprecation warnings for older API versions
 */
const deprecationWarning = (deprecatedVersions = []) => {
  return (req, res, next) => {
    const version = req.apiVersion?.resolved;

    if (deprecatedVersions.includes(version)) {
      res.set("X-API-Deprecated", "true");
      res.set("X-API-Deprecation-Date", "2025-12-31"); // Example date
      res.set("X-API-Sunset-Date", "2026-06-30"); // Example date

      logger.warn("Deprecated API Version Used", {
        version,
        path: req.path,
        userAgent: req.get("User-Agent"),
        ip: req.ip,
      });
    }

    next();
  };
};

/**
 * Version-aware response formatter
 * Ensures consistent response format across versions
 */
const formatResponse = (data, version = "v1") => {
  const baseResponse = {
    success: true,
    version,
    timestamp: new Date().toISOString(),
  };

  switch (version) {
    case "v1":
      return {
        ...baseResponse,
        data,
      };
    default:
      return {
        ...baseResponse,
        data,
      };
  }
};

module.exports = {
  apiVersioning,
  versionHandler,
  deprecationWarning,
  formatResponse,
};
