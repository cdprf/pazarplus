const express = require("express");
const { body, validationResult } = require("express-validator");
const rateLimit = require("express-rate-limit");

// Create more restrictive rate limiters for sensitive endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === "development" ? 10000 : 5, // Very high for dev, 5 in production
  message: {
    success: false,
    message: "Too many authentication attempts, please try again later.",
  },
  skip: (req) => {
    // Always skip in development
    return process.env.NODE_ENV === "development";
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === "development" ? 50000 : 100, // Much higher limits for development
  message: {
    success: false,
    message: "Too many requests, please try again later.",
  },
  skip: (req) => {
    // Always skip in development
    return process.env.NODE_ENV === "development";
  },
});

// Validation middleware
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

// Validation rules for different endpoints
const registerValidation = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),
  body("username")
    .isLength({ min: 3, max: 30 })
    .trim()
    .withMessage("Username must be 3-30 characters"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  body("fullName").optional().isLength({ max: 100 }).trim(),
];

const loginValidation = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),
  body("password").notEmpty().withMessage("Password is required"),
];

const passwordChangeValidation = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required"),
  body("newPassword")
    .isLength({ min: 6 })
    .withMessage("New password must be at least 6 characters"),
];

module.exports = {
  authLimiter,
  generalLimiter,
  validateRequest,
  registerValidation,
  loginValidation,
  passwordChangeValidation,
};
