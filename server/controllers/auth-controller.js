const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { User } = require("../models");
const logger = require("../utils/logger");
const config = require("../config/config");

// Generate JWT Token with enhanced debugging
const generateToken = (id) => {
  try {
    // Validate inputs
    if (!id) {
      logger.error("Token generation failed: No user ID provided");
      throw new Error("User ID is required for token generation");
    }

    if (!config.jwt.secret) {
      logger.error("Token generation failed: No JWT secret configured");
      throw new Error("JWT secret is not configured");
    }

    // Log token generation attempt
    logger.debug("Generating JWT token", {
      userId: id,
      secretExists: !!config.jwt.secret,
      secretLength: config.jwt.secret?.length,
      expiresIn: config.jwt.expiresIn,
    });

    const token = jwt.sign(
      {
        id,
        iat: Math.floor(Date.now() / 1000), // Issued at time
      },
      config.jwt.secret,
      {
        expiresIn: config.jwt.expiresIn,
        issuer: "pazar-plus",
        audience: "pazar-plus-client",
      }
    );

    // Verify the token was created correctly
    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      logger.debug("Token generated and verified successfully", {
        userId: id,
        tokenLength: token.length,
        expiresAt: new Date(decoded.exp * 1000).toISOString(),
      });
    } catch (verifyError) {
      logger.error("Generated token failed verification", {
        userId: id,
        error: verifyError.message,
      });
      throw new Error("Generated token is invalid");
    }

    return token;
  } catch (error) {
    logger.error("Token generation error", {
      userId: id,
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

// Register user
const register = async (req, res) => {
  try {
    const { username, email, password, fullName } = req.body;

    // Validate required fields
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Username, email, and password are required",
      });
    }

    // Check if user exists by email
    const userExistsByEmail = await User.findOne({ where: { email } });
    if (userExistsByEmail) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    // Check if user exists by username
    const userExistsByUsername = await User.findOne({ where: { username } });
    if (userExistsByUsername) {
      return res.status(400).json({
        success: false,
        message: "Username already taken",
      });
    }

    // Hash password with stronger salt rounds
    const salt = await bcrypt.genSalt(12); // Increased from 10 to 12 for better security
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      fullName: fullName || "",
    });

    const token = generateToken(user.id);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
      },
    });
  } catch (error) {
    logger.error(`Registration error: ${error.message}`, { error });
    res.status(500).json({
      success: false,
      message: "Server error during registration",
    });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate email and password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
      });
    }

    // Check for user - need to include password for comparison
    const user = await User.scope("withPassword").findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const token = generateToken(user.id);

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
      },
    });
  } catch (error) {
    logger.error(`Login error: ${error.message}`, { error });
    res.status(500).json({
      success: false,
      message: "Server error during login",
    });
  }
};

// Get user profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ["password", "twoFactorSecret"] },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
      },
    });
  } catch (error) {
    logger.error(`Get profile error: ${error.message}`, { error });
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// Logout user
const logout = async (req, res) => {
  res.json({
    success: true,
    message: "Logged out successfully",
  });
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

    // Always return success for security (don't reveal if email exists)
    if (!user) {
      return res.json({
        success: true,
        message:
          "If an account with that email exists, a password reset link has been sent",
      });
    }

    // Generate reset token
    const resetToken = generateResetToken();
    const resetTokenHash = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Set reset token and expiry (10 minutes)
    await user.update({
      passwordResetToken: resetTokenHash,
      passwordResetExpires: new Date(Date.now() + 10 * 60 * 1000),
    });

    // TODO: Send email with reset link
    // For now, we'll log the token (in production, send email)
    logger.info(`Password reset token for ${email}: ${resetToken}`);

    res.json({
      success: true,
      message:
        "If an account with that email exists, a password reset link has been sent",
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
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: "Token and new password are required",
      });
    }

    // Hash the token to compare with stored hash
    const resetTokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    // Find user with valid reset token
    const user = await User.scope("withPassword").findOne({
      where: {
        passwordResetToken: resetTokenHash,
        passwordResetExpires: {
          [require("sequelize").Op.gt]: new Date(),
        },
      },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }

    // Hash new password with stronger salt rounds
    const salt = await bcrypt.genSalt(12); // Increased from 10 to 12 for better security
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update password and clear reset token
    await user.update({
      password: hashedPassword,
      passwordResetToken: null,
      passwordResetExpires: null,
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

    // Hash the token to compare with stored hash
    const verificationTokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    // Find user with valid verification token
    const user = await User.findOne({
      where: {
        emailVerificationToken: verificationTokenHash,
        emailVerificationExpires: {
          [require("sequelize").Op.gt]: new Date(),
        },
      },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification token",
      });
    }

    // Update user as verified and clear verification token
    await user.update({
      emailVerified: true,
      isActive: true,
      emailVerificationToken: null,
      emailVerificationExpires: null,
    });

    // Generate auth token for immediate login
    const authToken = generateToken(user.id);

    res.json({
      success: true,
      message: "Email verified successfully",
      accessToken: authToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
      },
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
    const verificationTokenHash = crypto
      .createHash("sha256")
      .update(verificationToken)
      .digest("hex");

    // Update user with new verification token (24 hours expiry)
    await user.update({
      emailVerificationToken: verificationTokenHash,
      emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    // TODO: Send verification email
    // For now, we'll log the token (in production, send email)
    logger.info(`Email verification token for ${email}: ${verificationToken}`);

    res.json({
      success: true,
      message: "Verification email sent successfully",
    });
  } catch (error) {
    logger.error(`Resend verification error: ${error.message}`, { error });
    res.status(500).json({
      success: false,
      message: "Server error during verification email resend",
    });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    // Get user with password
    const user = await User.scope("withPassword").findByPk(req.user.id);

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

    // Hash new password with stronger salt rounds
    const salt = await bcrypt.genSalt(12); // Increased from 10 to 12 for better security
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    await user.update({
      password: hashedPassword,
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

module.exports = {
  register,
  login,
  getProfile,
  logout,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  changePassword,
};
