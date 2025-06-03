const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth-controller");
const { auth } = require("../middleware/auth");
const {
  authLimiter,
  registerValidation,
  loginValidation,
  passwordChangeValidation,
} = require("../middleware/validation");
const { validationResult } = require("express-validator");
const logger = require("../utils/logger");

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

// Debug middleware
router.use((req, res, next) => {
  logger.debug(`Auth route accessed: ${req.method} ${req.url}`);
  next();
});

// Apply auth rate limiter to all auth routes
router.use(authLimiter);

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

module.exports = router;
