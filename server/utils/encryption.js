const crypto = require("crypto");
const logger = require("./logger");

/**
 * Encryption utility for sensitive data like platform credentials
 * Uses AES-256-GCM encryption for security
 */
class EncryptionService {
  constructor() {
    // Use environment variable for encryption key, fallback to default for development
    this.encryptionKey =
      process.env.ENCRYPTION_KEY || "pazar-default-32-char-encryption-key";

    // Ensure key is exactly 32 bytes for AES-256
    if (this.encryptionKey.length !== 32) {
      // Pad or truncate to 32 bytes
      this.encryptionKey = this.encryptionKey.padEnd(32, "0").substring(0, 32);
    }

    this.algorithm = "aes-256-gcm";

    logger.info("Encryption service initialized", {
      algorithm: this.algorithm,
      keyLength: this.encryptionKey.length,
    });
  }

  /**
   * Encrypt sensitive data
   * @param {string} text - Text to encrypt
   * @returns {string} - Encrypted text with IV and auth tag
   */
  encrypt(text) {
    try {
      if (!text || typeof text !== "string") {
        throw new Error("Text to encrypt must be a non-empty string");
      }

      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher(this.algorithm, this.encryptionKey);
      cipher.setAAD(Buffer.from("pazar-plus-aad", "utf8"));

      let encrypted = cipher.update(text, "utf8", "hex");
      encrypted += cipher.final("hex");

      const authTag = cipher.getAuthTag();

      // Combine IV, auth tag, and encrypted data
      const result =
        iv.toString("hex") + ":" + authTag.toString("hex") + ":" + encrypted;

      logger.debug("Data encrypted successfully", {
        originalLength: text.length,
        encryptedLength: result.length,
      });

      return result;
    } catch (error) {
      logger.error("Encryption failed", {
        error: error.message,
        textLength: text?.length || 0,
      });
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt sensitive data
   * @param {string} encryptedText - Encrypted text with IV and auth tag
   * @returns {string} - Decrypted text
   */
  decrypt(encryptedText) {
    try {
      if (!encryptedText || typeof encryptedText !== "string") {
        throw new Error("Encrypted text must be a non-empty string");
      }

      const parts = encryptedText.split(":");
      if (parts.length !== 3) {
        throw new Error("Invalid encrypted data format");
      }

      const iv = Buffer.from(parts[0], "hex");
      const authTag = Buffer.from(parts[1], "hex");
      const encrypted = parts[2];

      const decipher = crypto.createDecipher(
        this.algorithm,
        this.encryptionKey
      );
      decipher.setAAD(Buffer.from("pazar-plus-aad", "utf8"));
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, "hex", "utf8");
      decrypted += decipher.final("utf8");

      logger.debug("Data decrypted successfully", {
        encryptedLength: encryptedText.length,
        decryptedLength: decrypted.length,
      });

      return decrypted;
    } catch (error) {
      logger.error("Decryption failed", {
        error: error.message,
        encryptedTextLength: encryptedText?.length || 0,
      });
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Simple encryption for development/fallback
   * @param {string} text - Text to encrypt
   * @returns {string} - Base64 encoded text
   */
  simpleEncrypt(text) {
    try {
      return Buffer.from(text, "utf8").toString("base64");
    } catch (error) {
      logger.error("Simple encryption failed", { error: error.message });
      throw new Error(`Simple encryption failed: ${error.message}`);
    }
  }

  /**
   * Simple decryption for development/fallback
   * @param {string} encryptedText - Base64 encoded text
   * @returns {string} - Decrypted text
   */
  simpleDecrypt(encryptedText) {
    try {
      return Buffer.from(encryptedText, "base64").toString("utf8");
    } catch (error) {
      logger.error("Simple decryption failed", { error: error.message });
      throw new Error(`Simple decryption failed: ${error.message}`);
    }
  }

  /**
   * Hash a string for comparison purposes
   * @param {string} text - Text to hash
   * @returns {string} - SHA-256 hash
   */
  hash(text) {
    try {
      return crypto.createHash("sha256").update(text).digest("hex");
    } catch (error) {
      logger.error("Hashing failed", { error: error.message });
      throw new Error(`Hashing failed: ${error.message}`);
    }
  }

  /**
   * Generate a random encryption key
   * @param {number} length - Key length in bytes (default 32 for AES-256)
   * @returns {string} - Random key
   */
  generateKey(length = 32) {
    return crypto.randomBytes(length).toString("hex");
  }

  /**
   * Verify if text can be decrypted (for testing encrypted data)
   * @param {string} encryptedText - Encrypted text to verify
   * @returns {boolean} - True if can be decrypted
   */
  canDecrypt(encryptedText) {
    try {
      this.decrypt(encryptedText);
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Export as singleton
module.exports = new EncryptionService();
