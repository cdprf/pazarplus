let speakeasy, QRCode;
let twoFactorEnabled = true;

try {
  speakeasy = require("speakeasy");
  QRCode = require("qrcode");
} catch (error) {
  console.warn(
    "Two-factor authentication dependencies not available:",
    error.message
  );
  twoFactorEnabled = false;

  // Create fallback implementations
  speakeasy = {
    generateSecret: () => ({ base32: "disabled", otpauth_url: "disabled" }),
    totp: {
      verify: () => false,
    },
  };

  QRCode = {
    toDataURL: () => Promise.resolve("data:image/png;base64,disabled"),
  };
}

const logger = require("../../../utils/logger");
const { User } = require("../../../models");

class TwoFactorService {
  /**
   * Generate secret for 2FA
   * @param {string} email - User's email
   * @returns {Object} - Secret and QR code URL
   */
  async generateSecret(email) {
    if (!twoFactorEnabled) {
      throw new Error(
        "Two-factor authentication is disabled - dependencies not available"
      );
    }

    try {
      const secret = speakeasy.generateSecret({
        name: `Pazar+ (${email})`,
      });

      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

      return {
        secret: secret.base32,
        qrCode: qrCodeUrl,
      };
    } catch (error) {
      logger.error("Error generating 2FA secret:", error);
      throw error;
    }
  }

  /**
   * Verify 2FA token
   * @param {string} secret - User's 2FA secret
   * @param {string} token - Token to verify
   * @returns {boolean} - Whether token is valid
   */
  verifyToken(secret, token) {
    try {
      return speakeasy.totp.verify({
        secret: secret,
        encoding: "base32",
        token: token,
        window: 1, // Allow 30 seconds clock skew
      });
    } catch (error) {
      logger.error("Error verifying 2FA token:", error);
      return false;
    }
  }

  /**
   * Enable 2FA for a user
   * @param {number} userId - User ID
   * @param {string} secret - Generated secret
   * @param {string} token - Verification token
   * @returns {boolean} - Whether 2FA was enabled successfully
   */
  async enable2FA(userId, secret, token) {
    try {
      // Verify token first
      const isValid = this.verifyToken(secret, token);
      if (!isValid) {
        return false;
      }

      // Update user with 2FA secret
      await User.update(
        {
          twoFactorSecret: secret,
          twoFactorEnabled: true,
        },
        {
          where: { id: userId },
        }
      );

      return true;
    } catch (error) {
      logger.error("Error enabling 2FA:", error);
      throw error;
    }
  }

  /**
   * Disable 2FA for a user
   * @param {number} userId - User ID
   * @returns {boolean} - Whether 2FA was disabled successfully
   */
  async disable2FA(userId) {
    try {
      await User.update(
        {
          twoFactorSecret: null,
          twoFactorEnabled: false,
        },
        {
          where: { id: userId },
        }
      );

      return true;
    } catch (error) {
      logger.error("Error disabling 2FA:", error);
      throw error;
    }
  }

  /**
   * Generate backup codes for 2FA recovery
   * @returns {Array<string>} - Array of backup codes
   */
  generateBackupCodes() {
    const codes = [];
    for (let i = 0; i < 10; i++) {
      codes.push(speakeasy.generateSecret({ length: 10 }).base32);
    }
    return codes;
  }

  /**
   * Verify backup code
   * @param {number} userId - User ID
   * @param {string} code - Backup code to verify
   * @returns {boolean} - Whether code is valid
   */
  async verifyBackupCode(userId, code) {
    try {
      const user = await User.findByPk(userId);
      if (!user || !user.backupCodes) {
        return false;
      }

      const codes = JSON.parse(user.backupCodes);
      const index = codes.indexOf(code);

      if (index === -1) {
        return false;
      }

      // Remove used backup code
      codes.splice(index, 1);
      await user.update({ backupCodes: JSON.stringify(codes) });

      return true;
    } catch (error) {
      logger.error("Error verifying backup code:", error);
      return false;
    }
  }
}

module.exports = new TwoFactorService();
