const logger = require('../../../utils/logger');

class SessionManager {
  constructor() {
    this.sessions = new Map();
    // Clean up expired sessions every hour
    setInterval(() => this.cleanupExpiredSessions(), 60 * 60 * 1000);
  }

  // Create a new session
  createSession(userId, rememberMe = false) {
    const sessionId = this.generateSessionId();
    const expiresAt = this.calculateExpiration(rememberMe);
    
    this.sessions.set(sessionId, {
      userId,
      createdAt: Date.now(),
      expiresAt,
      lastActivity: Date.now()
    });

    return {
      sessionId,
      expiresAt
    };
  }

  // Update session activity
  updateActivity(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = Date.now();
      return true;
    }
    return false;
  }

  // Validate session
  validateSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {return false;}

    const now = Date.now();
    if (now > session.expiresAt) {
      this.sessions.delete(sessionId);
      return false;
    }

    this.updateActivity(sessionId);
    return true;
  }

  // Invalidate session
  invalidateSession(sessionId) {
    return this.sessions.delete(sessionId);
  }

  // Invalidate all sessions for a user
  invalidateUserSessions(userId) {
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.userId === userId) {
        this.sessions.delete(sessionId);
      }
    }
  }

  // Clean up expired sessions
  cleanupExpiredSessions() {
    const now = Date.now();
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(sessionId);
      }
    }
  }

  // Helper method to generate session ID
  generateSessionId() {
    return `sess_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
  }

  // Helper method to calculate session expiration
  calculateExpiration(rememberMe) {
    const now = Date.now();
    // Remember Me extends session to 30 days, otherwise 24 hours
    const duration = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    return now + duration;
  }
}

// Export singleton instance
module.exports = new SessionManager();