// This file configures the authentication routes for the Order Management Service.
// It uses Express.js to define routes for user registration, login, profile retrieval, password update, and logout.
// It also uses express-validator for input validation and JWT for token management.
// src/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth-controller');

// Use the controller router directly
router.use('/', authController);

module.exports = router;