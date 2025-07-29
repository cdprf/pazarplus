const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { User } = require("../models");
const logger = require("../utils/logger");
const config = require("../config/config");

// Utility function to safely serialize data and prevent circular references
const safeJsonResponse = (data) => {
  try {
    // If data is a Sequelize instance, convert to plain object
    if (data && typeof data.get === "function") {
      data = data.get({ plain: true });
    }

    // If data is an array, process each item
    if (Array.isArray(data)) {
      return data.map((item) => safeJsonResponse(item));
    }

    // If data is an object, process recursively
    if (data && typeof data === "object") {
      const serialized = {};
      for (const [key, value] of Object.entries(data)) {
        // Skip circular reference properties and sensitive data
        if (
          key === "user" ||
          key === "User" ||
          key === "dataValues" ||
          key === "_previousDataValues" ||
          key === "password" ||
          key === "token"
        ) {
          continue;
        }

        if (value && typeof value === "object") {
          if (typeof value.get === "function") {
            // Sequelize instance
            serialized[key] = value.get({ plain: true });
          } else if (Array.isArray(value)) {
            // Array of potentially Sequelize instances
            serialized[key] = value.map((item) =>
              item && typeof item.get === "function"
                ? item.get({ plain: true })
                : item
            );
          } else {
            // Regular object - recursively serialize but limit depth
            serialized[key] = safeJsonResponse(value);
          }
        } else {
          serialized[key] = value;
        }
      }
      return serialized;
    }

    return data;
  } catch (error) {
    logger.error("Error serializing data for JSON response:", error);
    return { error: "Failed to serialize data", type: typeof data };
  }
};

// Generate JWT Token with enhanced debugging and tenant support
const generateToken = (user) => {
  try {
    // Validate inputs
    if (!user || !user.id) {
      logger.error("Token generation failed: No user or user ID provided");
      throw new Error("User is required for token generation");
    }

    if (!config.jwt.secret) {
      logger.error("Token generation failed: No JWT secret configured");
      throw new Error("JWT secret is not configured");
    }

    // Log token generation attempt
    logger.info("Generating JWT token", {
      operation: "token_generation",
      userId: user.id,
      secretExists: !!config.jwt.secret,
      secretLength: config.jwt.secret?.length,
      expiresIn: config.jwt.expiresIn,
      tenantId: user.tenantId,
    });

    // Enhanced token payload with tenant information
    const payload = {
      id: user.id,
      iat: Math.floor(Date.now() / 1000), // Issued at time
      // Include tenant ID for multi-tenant support
      tenantId: user.tenantId,
      // Include subscription plan for feature gating
      subscriptionPlan: user.subscriptionPlan,
      // Include user role for authorization
      role: user.role,
    };

    const token = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
      issuer: "pazar-plus",
      audience: "pazar-plus-client",
    });

    // Verify the token was created correctly
    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      logger.info("Token generated and verified successfully", {
        userId: user.id,
        tokenLength: token.length,
        expiresAt: new Date(decoded.exp * 1000).toISOString(),
        tenantId: decoded.tenantId,
        subscriptionPlan: decoded.subscriptionPlan,
      });
    } catch (verifyError) {
      logger.error("Generated token failed verification", {
        userId: user.id,
        error: verifyError.message,
      });
      throw new Error("Generated token is invalid");
    }

    return token;
  } catch (error) {
    logger.error("Token generation error", {
      userId: user?.id,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

// Generate email verification token
const generateVerificationToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

// Generate password reset token
const generateResetToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

// Register user with enhanced multi-tenant support
const register = async (req, res) => {
  const startTime = Date.now();

  // Log registration attempt with comprehensive details
  logger.logOperation("User registration attempt", {
    operation: "user_registration",
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    requestHeaders: {
      "content-type": req.get("Content-Type"),
      origin: req.get("Origin"),
      referer: req.get("Referer"),
    },
    bodyKeys: Object.keys(req.body),
    timestamp: new Date().toISOString(),
  });

  try {
    const {
      username,
      email,
      password,
      firstName,
      lastName,
      fullName,
      companyName,
      businessType,
      monthlyRevenue,
      phone,
      bio,
    } = req.body;

    logger.info("Registration data validation started", {
      hasUsername: !!username,
      hasEmail: !!email,
      hasPassword: !!password,
      emailFormat: email ? email.includes("@") : false,
      passwordLength: password ? password.length : 0,
    });

    // Enhanced input validation
    if (!username || !email || !password) {
      logger.warn("Registration validation failed - missing required fields", {
        missingFields: {
          username: !username,
          email: !email,
          password: !password,
        },
        receivedData: {
          username: !!username,
          email: !!email,
          password: !!password,
        },
      });

      return res.status(400).json({
        success: false,
        message: "Username, email, and password are required",
      });
    }

    // Check if user already exists
    logger.info("Checking for existing user", { email });

    const existingUser = await User.findOne({
      where: { email },
    });

    if (existingUser) {
      logger.warn("Registration failed - user already exists", {
        email,
        existingUserId: existingUser.id,
        existingUserCreatedAt: existingUser.createdAt,
      });

      return res.status(400).json({
        success: false,
        message: "User already exists with this email",
      });
    }

    // Hash password with increased salt rounds for better security
    logger.info("Starting password hashing", {
      saltRounds: 12,
      passwordProvided: !!password,
    });

    const salt = await bcrypt.genSalt(12); // Increased from 10 to 12 for better security
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate unique referral code
    const referralCode = crypto.randomBytes(4).toString("hex").toUpperCase();

    logger.info("Creating new user record", {
      username,
      email,
      hasCompanyName: !!companyName,
      hasBusinessType: !!businessType,
      hasMonthlyRevenue: !!monthlyRevenue,
      referralCode,
    });

    // Create user with enhanced multi-tenant fields
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      fullName: fullName || `${firstName || ""} ${lastName || ""}`.trim(),
      companyName,
      businessType,
      monthlyRevenue,
      phone, // Add phone during registration
      bio, // Add bio during registration
      referralCode,
      // Skip email verification for now (no email hosting)
      emailVerified: true,
      // Trial setup - user starts with trial by default
      subscriptionPlan: "trial",
      subscriptionStatus: "trial",
      onboardingStep: 1, // Start onboarding process
      // Set trial period (14 days)
      trialStartedAt: new Date(),
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      lastActivityAt: new Date(), // Set initial activity timestamp
      // Initial feature access
      featuresEnabled: {
        analytics: true,
        inventory_management: true,
        multi_platform: false,
        ai_insights: false,
        custom_reports: false,
        api_access: false,
      },
    });

    logger.info("User record created successfully", {
      userId: user.id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
    });

    // Generate tenant-aware token
    logger.info("Generating authentication token", {
      userId: user.id,
    });

    const token = generateToken(user);

    // Log successful registration with comprehensive details
    const registrationTime = Date.now() - startTime;
    logger.info("User registered successfully", {
      userId: user.id,
      username: user.username,
      email: user.email,
      subscriptionPlan: user.subscriptionPlan,
      referralCode: user.referralCode,
      registrationTimeMs: registrationTime,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      timestamp: new Date().toISOString(),
    });

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        companyName: user.companyName,
        businessType: user.businessType,
        monthlyRevenue: user.monthlyRevenue,
        phone: user.phone,
        bio: user.bio,
        subscriptionPlan: user.subscriptionPlan,
        subscriptionStatus: user.subscriptionStatus,
        trialEndsAt: user.trialEndsAt,
        lastActivityAt: user.lastActivityAt,
        onboardingStep: user.onboardingStep,
        featuresEnabled: user.featuresEnabled,
        referralCode: user.referralCode,
      },
    });
  } catch (error) {
    const registrationTime = Date.now() - startTime;

    // Enhanced error logging with comprehensive context
    logger.error("Registration error occurred", {
      error: {
        message: error.message,
        name: error.name,
        code: error.code,
        stack: error.stack,
      },
      requestContext: {
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        method: req.method,
        url: req.originalUrl,
        headers: {
          "content-type": req.get("Content-Type"),
          origin: req.get("Origin"),
          referer: req.get("Referer"),
        },
      },
      registrationData: {
        hasUsername: !!req.body.username,
        hasEmail: !!req.body.email,
        hasPassword: !!req.body.password,
        email: req.body.email, // Include email for debugging
        username: req.body.username, // Include username for debugging
      },
      timing: {
        registrationTimeMs: registrationTime,
        timestamp: new Date().toISOString(),
      },
      // Database-specific error details if available
      ...(error.name === "SequelizeValidationError" && {
        validationErrors: error.errors?.map((err) => ({
          field: err.path,
          message: err.message,
          value: err.value,
        })),
      }),
      ...(error.name === "SequelizeUniqueConstraintError" && {
        constraintError: {
          fields: error.fields,
          value: error.value,
        },
      }),
    });

    // Log detailed error for debugging
    logger.error(
      `Registration failed for ${req.body.email || "unknown email"}`,
      {
        operation: "user_registration_failed",
        error: error.message,
        errorCode: error.code,
        stack: error.stack.split("\n").slice(0, 5), // First 5 lines of stack trace
      }
    );

    res.status(500).json({
      success: false,
      message: "Server error during registration",
    });
  }
};

// Login user with enhanced multi-tenant support and detailed error logging
const login = async (req, res) => {
  const loginStartTime = Date.now();
  const loginAttemptId = crypto.randomBytes(4).toString("hex");
  
  try {
    const { email, password } = req.body;

    // Enhanced login attempt logging with unique attempt ID
    logger.logOperation("User login attempt", {
      operation: "user_login",
      loginAttemptId,
      email,
      emailProvided: !!email,
      passwordProvided: !!password,
      passwordLength: password ? password.length : 0,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      timestamp: new Date().toISOString(),
    });

    // Validate email and password with detailed feedback
    if (!email || !password) {
      const missingFields = [];
      if (!email) missingFields.push('email');
      if (!password) missingFields.push('password');
      
      logger.warn("Login failed - missing credentials", {
        operation: "user_login_failed",
        reason: "missing_credentials",
        loginAttemptId,
        missingFields,
        email: email || "not_provided",
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        duration: Date.now() - loginStartTime,
      });
      
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
        details: {
          missingFields,
          code: "MISSING_CREDENTIALS"
        }
      });
    }

    // Enhanced email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      logger.warn("Login failed - invalid email format", {
        operation: "user_login_failed",
        reason: "invalid_email_format",
        loginAttemptId,
        email,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        duration: Date.now() - loginStartTime,
      });
      
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
        details: {
          code: "INVALID_EMAIL_FORMAT"
        }
      });
    }

    // Find user with password (using scope to include password field)
    logger.info("Searching for user in database", {
      loginAttemptId,
      email,
      searchStartTime: new Date().toISOString(),
    });

    const user = await User.scope("withPassword").findOne({
      where: { email },
    });

    // Enhanced user not found logging with security considerations
    if (!user) {
      logger.warn("Login failed - user not found", {
        operation: "user_login_failed",
        reason: "user_not_found",
        loginAttemptId,
        email,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        duration: Date.now() - loginStartTime,
        // Security note: email domain for pattern analysis
        emailDomain: email.split('@')[1],
        timestamp: new Date().toISOString(),
      });

      // Check if there are any users with similar email (for debugging purposes)
      try {
        const similarEmails = await User.findAll({
          where: {
            email: {
              [require("sequelize").Op.like]: `%${email.split('@')[1]}%`
            }
          },
          attributes: ['email'],
          limit: 3
        });

        logger.info("Similar email domains found", {
          loginAttemptId,
          attemptedEmail: email,
          similarEmailsCount: similarEmails.length,
          similarDomains: similarEmails.map(u => u.email.split('@')[1]),
        });
      } catch (similarEmailError) {
        logger.warn("Could not check for similar emails", {
          loginAttemptId,
          error: similarEmailError.message,
        });
      }

      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
        details: {
          code: "INVALID_CREDENTIALS",
          hint: "Please check your email address and password"
        }
      });
    }

    logger.info("User found, verifying password", {
      loginAttemptId,
      userId: user.id,
      email: user.email,
      userCreatedAt: user.createdAt,
      lastLogin: user.lastLogin,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
    });

    // Check if password matches with enhanced logging
    const passwordCheckStart = Date.now();
    const isMatch = await bcrypt.compare(password, user.password);
    const passwordCheckDuration = Date.now() - passwordCheckStart;

    if (!isMatch) {
      logger.warn("Login failed - invalid password", {
        operation: "user_login_failed",
        reason: "invalid_password",
        loginAttemptId,
        email,
        userId: user.id,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        passwordCheckDuration,
        duration: Date.now() - loginStartTime,
        lastSuccessfulLogin: user.lastLogin,
        accountCreated: user.createdAt,
        timestamp: new Date().toISOString(),
      });

      // Additional security logging for repeated failed attempts
      logger.error("Password mismatch detected", {
        operation: "security_event",
        event: "password_mismatch",
        loginAttemptId,
        userId: user.id,
        email: user.email,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        providedPasswordLength: password.length,
        storedPasswordHashLength: user.password.length,
      });

      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
        details: {
          code: "INVALID_CREDENTIALS",
          hint: "Please check your password"
        }
      });
    }

    logger.info("Password verification successful", {
      loginAttemptId,
      userId: user.id,
      passwordCheckDuration,
    });

    // Check if user is active
    if (!user.isActive) {
      logger.warn("Login failed - account deactivated", {
        operation: "user_login_failed",
        reason: "account_deactivated",
        loginAttemptId,
        email,
        userId: user.id,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        duration: Date.now() - loginStartTime,
        deactivatedAt: user.updatedAt,
      });
      
      return res.status(401).json({
        success: false,
        message: "Account is deactivated. Please contact support.",
        details: {
          code: "ACCOUNT_DEACTIVATED",
          supportEmail: "support@pazarplus.com"
        }
      });
    }

    // Check email verification status
    if (!user.emailVerified) {
      logger.warn("Login attempt with unverified email", {
        operation: "user_login_warning",
        reason: "email_not_verified",
        loginAttemptId,
        userId: user.id,
        email: user.email,
        ip: req.ip,
      });
    }

    // Update last login time and activity
    const updateStart = Date.now();
    await user.update({
      lastLogin: new Date(),
      lastActivityAt: new Date(),
    });
    const updateDuration = Date.now() - updateStart;

    logger.info("User record updated with login time", {
      loginAttemptId,
      userId: user.id,
      updateDuration,
    });

    // Generate tenant-aware token
    const tokenStart = Date.now();
    const token = generateToken(user);
    const tokenDuration = Date.now() - tokenStart;

    logger.info("Authentication token generated", {
      loginAttemptId,
      userId: user.id,
      tokenDuration,
      tokenLength: token.length,
    });

    const totalLoginDuration = Date.now() - loginStartTime;

    logger.info("User login successful", {
      operation: "user_login_success",
      loginAttemptId,
      email,
      userId: user.id,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      totalDuration: totalLoginDuration,
      timestamp: new Date().toISOString(),
    });

    // Remove password from response
    const userResponse = { ...user.toJSON() };
    delete userResponse.password;

    // Log successful login with comprehensive details
    logger.info("User logged in successfully", {
      userId: user.id,
      email: user.email,
      subscriptionPlan: user.subscriptionPlan,
      tenantId: user.tenantId,
      lastLogin: user.lastLogin,
      loginAttemptId,
      sessionStartTime: new Date().toISOString(),
      performanceMetrics: {
        totalDuration: totalLoginDuration,
        passwordCheckDuration,
        tokenDuration,
        updateDuration,
      }
    });

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        ...userResponse,
        // Include subscription status for frontend
        isTrialExpired: user.trialEndsAt && new Date() > user.trialEndsAt,
        trialDaysRemaining: user.getTrialDaysRemaining(),
        needsOnboarding: !user.onboardingCompleted,
      },
    });
  } catch (error) {
    const totalDuration = Date.now() - loginStartTime;
    
    // Enhanced error logging with comprehensive context
    logger.error("Login error occurred", {
      operation: "user_login_error",
      loginAttemptId,
      error: {
        message: error.message,
        name: error.name,
        code: error.code,
        stack: error.stack,
      },
      requestContext: {
        email: req.body.email,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        method: req.method,
        url: req.originalUrl,
      },
      timing: {
        totalDuration,
        timestamp: new Date().toISOString(),
      },
    });

    res.status(500).json({
      success: false,
      message: "Server error during login",
      details: {
        code: "SERVER_ERROR",
        timestamp: new Date().toISOString()
      }
    });
  }
};

// Get current user profile with subscription info
const getProfile = async (req, res) => {
  try {
    const user = req.user;

    // Get user with basic information - simplified to avoid serialization issues
    const userData = await User.findByPk(user.id);

    if (!userData) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Create a clean user object with properly formatted dates
    const cleanUser = {
      id: userData.id,
      username: userData.username,
      email: userData.email,
      fullName: userData.fullName,
      phone: userData.phone,
      bio: userData.bio,
      companyName: userData.companyName,
      businessType: userData.businessType,
      monthlyRevenue: userData.monthlyRevenue,
      role: userData.role,
      isActive: userData.isActive,
      emailVerified: userData.emailVerified,
      subscriptionPlan: userData.subscriptionPlan,
      subscriptionStatus: userData.subscriptionStatus,
      trialStartedAt: userData.trialStartedAt
        ? userData.trialStartedAt.toISOString()
        : null,
      trialEndsAt: userData.trialEndsAt
        ? userData.trialEndsAt.toISOString()
        : null,
      lastActivityAt: userData.lastActivityAt
        ? userData.lastActivityAt.toISOString()
        : null,
      onboardingCompleted: userData.onboardingCompleted,
      onboardingStep: userData.onboardingStep,
      featuresEnabled: userData.featuresEnabled,
      referralCode: userData.referralCode,
      createdAt: userData.createdAt ? userData.createdAt.toISOString() : null,
      updatedAt: userData.updatedAt ? userData.updatedAt.toISOString() : null,
      // Enhanced profile information
      isTrialExpired: userData.trialEndsAt && new Date() > userData.trialEndsAt,
      trialDaysRemaining: userData.getTrialDaysRemaining(),
      needsOnboarding: !userData.onboardingCompleted,
    };

    res.json({
      success: true,
      user: cleanUser,
    });
  } catch (error) {
    logger.error(`Get profile error: ${error.message}`, { error });
    res.status(500).json({
      success: false,
      message: "Failed to get user profile",
    });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      fullName,
      email,
      username,
      phone,
      company,
      bio,
      businessType,
      monthlyRevenue,
    } = req.body;

    const updateData = {};
    if (fullName !== undefined) {
      updateData.fullName = fullName;
    }
    if (email !== undefined) {
      updateData.email = email;
    }
    if (username !== undefined) {
      updateData.username = username;
    }
    if (phone !== undefined) {
      updateData.phone = phone;
    }
    if (company !== undefined) {
      updateData.companyName = company;
    }
    if (bio !== undefined) {
      updateData.bio = bio;
    }
    if (businessType !== undefined) {
      updateData.businessType = businessType;
    }
    if (monthlyRevenue !== undefined) {
      updateData.monthlyRevenue = monthlyRevenue;
    }

    // Update last activity
    updateData.lastActivityAt = new Date();

    const [updatedCount] = await User.update(updateData, {
      where: { id: userId },
    });

    if (updatedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const updatedUser = await User.findByPk(userId);

    res.json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    logger.error(`Update profile error: ${error.message}`, { error });
    res.status(500).json({
      success: false,
      message: "Failed to update profile",
    });
  }
};

// Forgot password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const user = await User.findOne({ where: { email } });

    if (!user) {
      // Don't reveal if email exists or not
      return res.json({
        success: true,
        message: "If the email exists, a reset link has been sent",
      });
    }

    // Generate reset token
    const resetToken = generateResetToken();
    const resetExpires = new Date(Date.now() + 3600000); // 1 hour

    await user.update({
      passwordResetToken: resetToken,
      passwordResetExpires: resetExpires,
    });

    // Send email with reset link
    try {
      const emailService = require("../services/emailService");
      await emailService.sendPasswordResetEmail(
        user.email,
        resetToken,
        user.firstName || user.username || ""
      );
      logger.info("Password reset email sent successfully", {
        userId: user.id,
        email: user.email,
        resetToken: resetToken.substring(0, 8) + "...",
      });
    } catch (emailError) {
      logger.error("Failed to send password reset email", {
        userId: user.id,
        email: user.email,
        error: emailError.message,
      });
      // Don't fail the request if email sending fails
    }

    logger.info("Password reset requested", {
      userId: user.id,
      email: user.email,
      resetToken: resetToken.substring(0, 8) + "...",
    });

    res.json({
      success: true,
      message: "If the email exists, a reset link has been sent",
    });
  } catch (error) {
    logger.error(`Forgot password error: ${error.message}`, { error });
    res.status(500).json({
      success: false,
      message: "Server error during password reset request",
    });
  }
};

// Reset password
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Token and new password are required",
      });
    }

    const user = await User.findOne({
      where: {
        passwordResetToken: token,
        passwordResetExpires: { [require("sequelize").Op.gt]: new Date() },
      },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await user.update({
      password: hashedPassword,
      passwordResetToken: null,
      passwordResetExpires: null,
    });

    logger.info("Password reset successful", {
      userId: user.id,
      email: user.email,
    });

    res.json({
      success: true,
      message: "Password reset successful",
    });
  } catch (error) {
    logger.error(`Reset password error: ${error.message}`, { error });
    res.status(500).json({
      success: false,
      message: "Server error during password reset",
    });
  }
};

// Verify email
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Verification token is required",
      });
    }

    const user = await User.findOne({
      where: {
        emailVerificationToken: token,
      },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid verification token",
      });
    }

    await user.update({
      emailVerified: true,
      emailVerificationToken: null,
      emailVerifiedAt: new Date(),
    });

    logger.info("Email verified successfully", {
      userId: user.id,
      email: user.email,
    });

    res.json({
      success: true,
      message: "Email verified successfully",
    });
  } catch (error) {
    logger.error(`Email verification error: ${error.message}`, { error });
    res.status(500).json({
      success: false,
      message: "Server error during email verification",
    });
  }
};

// Resend verification email
const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        message: "Email is already verified",
      });
    }

    // Generate new verification token
    const verificationToken = generateVerificationToken();

    await user.update({
      emailVerificationToken: verificationToken,
    });

    // Send verification email
    try {
      const emailService = require("../services/emailService");
      await emailService.sendVerificationEmail(
        user.email,
        verificationToken,
        user.firstName || user.username || ""
      );
      logger.info("Verification email sent successfully", {
        userId: user.id,
        email: user.email,
        token: verificationToken.substring(0, 8) + "...",
      });
    } catch (emailError) {
      logger.error("Failed to send verification email", {
        userId: user.id,
        email: user.email,
        error: emailError.message,
      });
      // Don't fail the request if email sending fails
    }

    logger.info("Verification email resent", {
      userId: user.id,
      email: user.email,
      token: verificationToken.substring(0, 8) + "...",
    });

    res.json({
      success: true,
      message: "Verification email sent",
    });
  } catch (error) {
    logger.error(`Resend verification error: ${error.message}`, { error });
    res.status(500).json({
      success: false,
      message: "Server error during verification resend",
    });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    // Get user with password
    const user = await User.scope("withPassword").findByPk(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await user.update({
      password: hashedPassword,
    });

    logger.info("Password changed successfully", {
      userId: user.id,
      email: user.email,
    });

    res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    logger.error(`Change password error: ${error.message}`, { error });
    res.status(500).json({
      success: false,
      message: "Server error during password change",
    });
  }
};

// Logout
const logout = async (req, res) => {
  try {
    const userId = req.user.id;

    // Update last activity
    await User.update(
      {
        lastActivityAt: new Date(),
      },
      {
        where: { id: userId },
      }
    );

    logger.info("User logged out", {
      userId: userId,
    });

    res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    logger.error(`Logout error: ${error.message}`, { error });
    res.status(500).json({
      success: false,
      message: "Server error during logout",
    });
  }
};

// Development token endpoint - only works in development mode
const generateDevToken = async (req, res) => {
  try {
    // Only allow in development mode
    if (process.env.NODE_ENV !== "development" && !req.headers["x-dev-mode"]) {
      return res.status(403).json({
        success: false,
        message: "Development endpoint not available in production",
      });
    }

    logger.info("🔧 Development token requested");

    // Create or find a development user
    let devUser = await User.findOne({
      where: { email: "dev@example.com" },
    });

    if (!devUser) {
      // Create development user
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash("dev123456", salt);

      devUser = await User.create({
        username: "devuser",
        email: "dev@example.com",
        password: hashedPassword,
        fullName: "Development User",
        companyName: "Dev Company",
        businessType: "small_business",
        role: "admin",
        subscriptionPlan: "enterprise",
        subscriptionStatus: "active",
        emailVerified: true,
        isActive: true,
        onboardingCompleted: true,
        featuresEnabled: {
          analytics: true,
          inventory_management: true,
          multi_platform: true,
          ai_insights: true,
          custom_reports: true,
          api_access: true,
        },
      });

      logger.info("✅ Development user created", { userId: devUser.id });
    }

    // Generate token for development user
    const token = generateToken(devUser);

    // Update last login
    await devUser.update({
      lastLogin: new Date(),
      lastActivityAt: new Date(),
    });

    // Remove password from response
    const userResponse = { ...devUser.toJSON() };
    delete userResponse.password;

    logger.info("✅ Development token generated successfully", {
      userId: devUser.id,
      tokenLength: token.length,
    });

    res.json({
      success: true,
      message: "Development token generated",
      token,
      user: {
        ...userResponse,
        devMode: true,
        isTrialExpired: false,
        trialDaysRemaining: 999,
        needsOnboarding: false,
      },
    });
  } catch (error) {
    logger.error(`Development token error: ${error.message}`, { error });
    res.status(500).json({
      success: false,
      message: "Failed to generate development token",
    });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  changePassword,
  logout,
  generateDevToken, // Add this new function
  generateToken,
  generateVerificationToken,
  generateResetToken,
  safeJsonResponse,
};
