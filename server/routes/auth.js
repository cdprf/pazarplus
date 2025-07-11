const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth-controller");
const { auth } = require("../middleware/auth");
const {
  registerValidation,
  loginValidation,
  passwordChangeValidation,
} = require("../middleware/validation");
const { validationResult } = require("express-validator");
const logger = require("../utils/logger");
const rateLimit = require("express-rate-limit");

// Define validateRequest locally to avoid import issues
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array(),
    });
  }
  next();
};

// Production-safe rate limiter for auth routes
const productionSafeAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === "production" ? 50 : 1000, // Higher limit for production to avoid issues
  message: {
    success: false,
    message:
      "Too many authentication attempts. Please try again in 15 minutes.",
    code: "RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Use IP-based limiting only (simpler and more reliable)
  keyGenerator: (req) => req.ip,
  // Skip rate limiting in development or if disabled
  skip: (req) => {
    return (
      process.env.NODE_ENV === "development" ||
      process.env.DISABLE_RATE_LIMITING === "true"
    );
  },
  handler: (req, res) => {
    logger.warn(`Auth rate limit exceeded`, {
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      path: req.path,
    });
    res.status(429).json({
      success: false,
      message:
        "Too many authentication attempts. Please try again in 15 minutes.",
      code: "RATE_LIMIT_EXCEEDED",
    });
  },
});

// Debug middleware
router.use((req, res, next) => {
  logger.debug(`Auth route accessed: ${req.method} ${req.url}`);
  console.log(`🔐 Auth route hit: ${req.method} ${req.url}`);
  next();
});

// Apply production-safe rate limiter to all auth routes
router.use(productionSafeAuthLimiter);

// Public routes with validation
router.post(
  "/register",
  registerValidation,
  validateRequest,
  authController.register
);
router.post("/login", loginValidation, validateRequest, authController.login);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);
router.post("/verify-email", authController.verifyEmail);
router.post("/resend-verification", authController.resendVerification);

// Development route - only works in development mode
router.post("/dev-token", authController.generateDevToken);

// Protected routes
router.get("/me", auth, authController.getProfile); // Added missing /me endpoint
router.get("/profile", auth, authController.getProfile);
router.put("/profile", auth, authController.updateProfile);
router.post(
  "/change-password",
  auth,
  passwordChangeValidation,
  validateRequest,
  authController.changePassword
);
router.get("/logout", auth, authController.logout);

// Add a base route for /api/auth that shows available endpoints
router.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Authentication API",
    version: "1.0",
    endpoints: {
      "POST /register": "Register a new user",
      "POST /login": "Login with email and password",
      "POST /forgot-password": "Request password reset",
      "POST /reset-password": "Reset password with token",
      "POST /verify-email": "Verify email address",
      "POST /resend-verification": "Resend verification email",
      "POST /dev-token": "Generate development token (dev only)",
      "GET /me": "Get current user profile (auth required)",
      "GET /profile": "Get user profile (auth required)",
      "PUT /profile": "Update user profile (auth required)",
      "POST /change-password": "Change password (auth required)",
      "GET /logout": "Logout user (auth required)",
    },
    note: "Most endpoints require POST method. GET is only for profile endpoints.",
  });
});

// Add method not allowed handler for common mistakes
router.get("/login", (req, res) => {
  res.status(405).json({
    success: false,
    message: "Method Not Allowed",
    error: "LOGIN_METHOD_NOT_ALLOWED",
    details: "Login endpoint requires POST method, not GET",
    correctUsage: {
      method: "POST",
      url: "/api/auth/login",
      contentType: "application/json",
      body: {
        email: "user@example.com",
        password: "yourpassword",
      },
    },
    availableGETEndpoints: [
      "/api/auth",
      "/api/auth/me",
      "/api/auth/profile",
      "/api/auth/logout",
    ],
  });
});

router.get("/register", (req, res) => {
  res.status(405).json({
    success: false,
    message: "Method Not Allowed",
    error: "REGISTER_METHOD_NOT_ALLOWED",
    details: "Register endpoint requires POST method, not GET",
    correctUsage: {
      method: "POST",
      url: "/api/auth/register",
      contentType: "application/json",
      body: {
        email: "user@example.com",
        password: "yourpassword",
        name: "Your Name",
      },
    },
  });
});

// Catch-all for undefined routes with detailed error information
router.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Auth endpoint not found",
    error: "AUTH_ENDPOINT_NOT_FOUND",
    requestedPath: req.originalUrl,
    requestedMethod: req.method,
    availableEndpoints: {
      "GET /api/auth": "API information",
      "POST /api/auth/register": "User registration",
      "POST /api/auth/login": "User login",
      "POST /api/auth/forgot-password": "Password reset request",
      "POST /api/auth/reset-password": "Password reset",
      "POST /api/auth/verify-email": "Email verification",
      "POST /api/auth/resend-verification": "Resend verification",
      "GET /api/auth/me": "Current user (auth required)",
      "GET /api/auth/profile": "User profile (auth required)",
      "PUT /api/auth/profile": "Update profile (auth required)",
      "POST /api/auth/change-password": "Change password (auth required)",
      "GET /api/auth/logout": "Logout (auth required)",
    },
    tips: [
      "Make sure you are using the correct HTTP method (GET vs POST)",
      "Check that the endpoint path is spelled correctly",
      "POST endpoints require Content-Type: application/json header",
      "Some endpoints require authentication token in Authorization header",
    ],
  });
});

module.exports = router;
