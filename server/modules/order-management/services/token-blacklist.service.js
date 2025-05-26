const logger = require('../../../utils/logger');

// Token blacklist service for managing invalidated tokens
class TokenBlacklistService {
  constructor() {
    this.blacklist = new Map();
    // Clean up expired tokens every hour
    setInterval(() => this.cleanupExpiredTokens(), 60 * 60 * 1000);
  }

  // Add token to blacklist
  addToBlacklist(token, exp) {
    this.blacklist.set(token, exp);
  }

  // Check if token is blacklisted
  isBlacklisted(token) {
    return this.blacklist.has(token);
  }

  // Remove expired tokens from blacklist
  cleanupExpiredTokens() {
    const now = Math.floor(Date.now() / 1000);
    for (const [token, exp] of this.blacklist.entries()) {
      if (exp < now) {
        this.blacklist.delete(token);
      }
    }
  }
}

// Export singleton instance
module.exports = new TokenBlacklistService();