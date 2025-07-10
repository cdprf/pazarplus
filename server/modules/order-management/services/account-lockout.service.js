const logger = require('../../../utils/logger');
const { User } = require('../../../models');

class AccountLockoutService {
  constructor() {
    this.failedAttempts = new Map();
    this.lockoutDuration = 15 * 60 * 1000; // 15 minutes
    this.maxAttempts = 5;
    
    // Clean up expired lockouts every hour
    setInterval(() => this.cleanupExpiredLockouts(), 60 * 60 * 1000);
  }

  // Record a failed login attempt
  recordFailedAttempt(identifier) {
    const now = Date.now();
    const attempts = this.failedAttempts.get(identifier) || { count: 0, timestamps: [] };
    
    // Clean up attempts older than lockout duration
    attempts.timestamps = attempts.timestamps.filter(
      timestamp => now - timestamp < this.lockoutDuration
    );
    
    attempts.count = attempts.timestamps.length + 1;
    attempts.timestamps.push(now);
    
    this.failedAttempts.set(identifier, attempts);
    
    return attempts.count;
  }

  // Check if account is locked
  isLocked(identifier) {
    const attempts = this.failedAttempts.get(identifier);
    if (!attempts) {return false;}

    const now = Date.now();
    // Clean up old attempts
    attempts.timestamps = attempts.timestamps.filter(
      timestamp => now - timestamp < this.lockoutDuration
    );
    
    return attempts.timestamps.length >= this.maxAttempts;
  }

  // Get remaining lockout time in milliseconds
  getRemainingLockoutTime(identifier) {
    const attempts = this.failedAttempts.get(identifier);
    if (!attempts || attempts.timestamps.length === 0) {return 0;}

    const now = Date.now();
    const oldestAttempt = Math.min(...attempts.timestamps);
    const timeElapsed = now - oldestAttempt;
    
    return Math.max(0, this.lockoutDuration - timeElapsed);
  }

  // Reset attempts for an identifier
  resetAttempts(identifier) {
    this.failedAttempts.delete(identifier);
  }

  // Clean up expired lockouts
  cleanupExpiredLockouts() {
    const now = Date.now();
    for (const [identifier, attempts] of this.failedAttempts.entries()) {
      attempts.timestamps = attempts.timestamps.filter(
        timestamp => now - timestamp < this.lockoutDuration
      );
      
      if (attempts.timestamps.length === 0) {
        this.failedAttempts.delete(identifier);
      }
    }
  }
}

module.exports = new AccountLockoutService();