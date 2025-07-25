import logger from "../utils/logger.js";
/**
 * Authentication Recovery Utility
 * Helps users resolve common JWT authentication issues
 * Place this file in /client/src/utils/authRecovery.js
 */

// Enhanced authentication recovery utility
export class AuthRecovery {
  constructor() {
    this.storageKeys = [
      "token",
      "auth_token",
      "jwt_token",
      "access_token",
      "refresh_token",
      "refreshToken",
      "user",
      "userData",
      "authData",
    ];
  }

  /**
   * Detect if user has authentication issues
   */
  detectAuthIssues() {
    const issues = [];

    // Check for tokens in storage
    const hasToken = this.storageKeys.some(
      (key) => localStorage.getItem(key) || sessionStorage.getItem(key)
    );

    if (hasToken) {
      // Check if token is valid format
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      if (token) {
        try {
          // Basic JWT format check
          const parts = token.split(".");
          if (parts.length !== 3) {
            issues.push("MALFORMED_TOKEN");
          } else {
            // Try to decode payload
            const payload = JSON.parse(atob(parts[1]));
            const now = Math.floor(Date.now() / 1000);

            if (payload.exp && payload.exp < now) {
              issues.push("EXPIRED_TOKEN");
            }

            // Check if token is suspiciously old
            if (payload.iat && now - payload.iat > 30 * 24 * 60 * 60) {
              issues.push("OLD_TOKEN");
            }
          }
        } catch (error) {
          issues.push("INVALID_TOKEN_FORMAT");
        }
      }
    }

    return issues;
  }

  /**
   * Clear all authentication data
   */
  clearAllAuthData() {
    const clearedItems = [];

    // Clear localStorage
    this.storageKeys.forEach((key) => {
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
        clearedItems.push(`localStorage.${key}`);
      }
    });

    // Clear sessionStorage
    this.storageKeys.forEach((key) => {
      if (sessionStorage.getItem(key)) {
        sessionStorage.removeItem(key);
        clearedItems.push(`sessionStorage.${key}`);
      }
    });

    // Clear any axios authorization headers
    if (window.axios && window.axios.defaults.headers.common) {
      delete window.axios.defaults.headers.common["Authorization"];
    }

    return clearedItems;
  }

  /**
   * Show user-friendly recovery instructions
   */
  showRecoveryInstructions(issues = []) {
    const instructions = [];

    if (
      issues.includes("INVALID_TOKEN_FORMAT") ||
      issues.includes("MALFORMED_TOKEN")
    ) {
      instructions.push(
        "Your authentication token is corrupted. Please log in again."
      );
    }

    if (issues.includes("EXPIRED_TOKEN")) {
      instructions.push("Your session has expired. Please log in again.");
    }

    if (issues.includes("OLD_TOKEN")) {
      instructions.push(
        "Your authentication token is outdated due to security updates. Please log in again."
      );
    }

    if (instructions.length === 0) {
      instructions.push("Please clear your browser data and log in again.");
    }

    return instructions;
  }

  /**
   * Perform automatic recovery
   */
  async performRecovery(options = {}) {
    const {
      redirectToLogin = true,
      showAlert = true,
      clearCaches = true,
    } = options;

    const issues = this.detectAuthIssues();
    const clearedItems = this.clearAllAuthData();

    // Clear browser caches if requested
    if (clearCaches && "caches" in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      } catch (error) {
        logger.warn("Failed to clear caches:", error);
      }
    }

    const recovery = {
      issues,
      clearedItems,
      instructions: this.showRecoveryInstructions(issues),
      timestamp: new Date().toISOString(),
    };

    // Log recovery details
    logger.info("🔧 Authentication Recovery Performed:", recovery);

    // Show user notification if requested
    if (showAlert && issues.length > 0) {
      const message = recovery.instructions.join(" ");
      alert(`Authentication Issue Resolved\n\n${message}`);
    }

    // Redirect to login if requested
    if (redirectToLogin) {
      // Give a moment for any cleanup to complete
      setTimeout(() => {
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
      }, 100);
    }

    return recovery;
  }

  /**
   * Set up automatic recovery on auth errors
   */
  setupAutoRecovery() {
    // Listen for storage events (when user opens multiple tabs)
    window.addEventListener("storage", (event) => {
      if (this.storageKeys.includes(event.key) && !event.newValue) {
        logger.info("Auth data cleared in another tab, syncing...");
        this.clearAllAuthData();
      }
    });

    // Listen for unhandled promise rejections (API errors)
    window.addEventListener("unhandledrejection", (event) => {
      if (event.reason?.response?.status === 401) {
        const errorData = event.reason.response.data;
        if (errorData?.code === "INVALID_TOKEN_SIGNATURE") {
          logger.info("Invalid JWT signature detected, performing recovery...");
          this.performRecovery({ showAlert: false });
        }
      }
    });

    // Set up periodic token validation
    setInterval(() => {
      const issues = this.detectAuthIssues();
      if (issues.length > 0) {
        logger.info("Periodic auth check found issues:", issues);
        this.performRecovery({ showAlert: false });
      }
    }, 5 * 60 * 1000); // Check every 5 minutes
  }
}

// Create singleton instance
export const authRecovery = new AuthRecovery();

// Setup auto-recovery immediately
if (typeof window !== "undefined") {
  authRecovery.setupAutoRecovery();
}

// Make it globally available for debugging
if (typeof window !== "undefined") {
  window.authRecovery = authRecovery;
}

// Export convenience functions
export const clearAuthData = () => authRecovery.clearAllAuthData();
export const recoverAuth = (options) => authRecovery.performRecovery(options);
export const detectAuthIssues = () => authRecovery.detectAuthIssues();

// Enhanced axios error handler for JWT issues
export const handleJWTError = (error) => {
  if (error.response?.status === 401) {
    const errorData = error.response.data;

    if (errorData?.code === "INVALID_TOKEN_SIGNATURE") {
      logger.info("🔐 Invalid JWT signature - performing automatic recovery");
      authRecovery.performRecovery({
        showAlert: true,
        redirectToLogin: true,
      });
      return;
    }

    if (errorData?.message?.includes("expired")) {
      logger.info("🕒 Token expired - performing automatic recovery");
      authRecovery.performRecovery({
        showAlert: false,
        redirectToLogin: true,
      });
      return;
    }
  }

  // For other errors, just re-throw
  throw error;
};

export default authRecovery;
