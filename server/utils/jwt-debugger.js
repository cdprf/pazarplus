const jwt = require("jsonwebtoken");
const config = require("../config/config");
const logger = require("../utils/logger");

/**
 * JWT Debug Utility - helps diagnose JWT token issues
 */
class JWTDebugger {
  /**
   * Test JWT configuration
   */
  static testConfig() {
    const results = {
      secretExists: !!config.jwt.secret,
      secretLength: config.jwt.secret?.length || 0,
      secretType: typeof config.jwt.secret,
      expiresIn: config.jwt.expiresIn,
      isValidSecret: false,
    };

    // Test if secret can be used for signing
    try {
      const testToken = jwt.sign({ test: true }, config.jwt.secret, {
        expiresIn: "1m",
      });
      const decoded = jwt.verify(testToken, config.jwt.secret);
      results.isValidSecret = true;
      results.testTokenGenerated = true;
    } catch (error) {
      results.secretError = error.message;
      results.testTokenGenerated = false;
    }

    return results;
  }

  /**
   * Analyze a JWT token
   */
  static analyzeToken(token) {
    const analysis = {
      tokenProvided: !!token,
      tokenLength: token?.length || 0,
      tokenParts: 0,
      isValidFormat: false,
      header: null,
      payload: null,
      signature: null,
      decoded: null,
      errors: [],
    };

    if (!token) {
      analysis.errors.push("No token provided");
      return analysis;
    }

    // Check token format
    const parts = token.split(".");
    analysis.tokenParts = parts.length;
    analysis.isValidFormat = parts.length === 3;

    if (parts.length !== 3) {
      analysis.errors.push("Token must have 3 parts separated by dots");
      return analysis;
    }

    try {
      // Decode without verification first
      const decodedWithoutVerification = jwt.decode(token, { complete: true });
      if (decodedWithoutVerification) {
        analysis.header = decodedWithoutVerification.header;
        analysis.payload = decodedWithoutVerification.payload;
        analysis.signature = decodedWithoutVerification.signature;
      }
    } catch (error) {
      analysis.errors.push(`Decode error: ${error.message}`);
    }

    try {
      // Try to verify the token
      analysis.decoded = jwt.verify(token, config.jwt.secret);
      analysis.isValid = true;
    } catch (error) {
      analysis.isValid = false;
      analysis.verificationError = {
        name: error.name,
        message: error.message,
      };
      analysis.errors.push(
        `Verification error: ${error.name} - ${error.message}`
      );
    }

    return analysis;
  }

  /**
   * Generate test token for debugging
   */
  static generateTestToken(userId = "test-user-123") {
    try {
      const token = jwt.sign(
        {
          id: userId,
          iat: Math.floor(Date.now() / 1000),
        },
        config.jwt.secret,
        {
          expiresIn: "1h",
          issuer: "pazar-plus",
          audience: "pazar-plus-client",
        }
      );

      return {
        success: true,
        token,
        analysis: this.analyzeToken(token),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        stack: error.stack,
      };
    }
  }

  /**
   * Debug authentication flow
   */
  static debugAuth(authHeader) {
    const debug = {
      authHeaderProvided: !!authHeader,
      authHeaderFormat: null,
      token: null,
      tokenAnalysis: null,
      configTest: this.testConfig(),
    };

    if (!authHeader) {
      debug.errors = ["No Authorization header provided"];
      return debug;
    }

    debug.authHeaderFormat = authHeader.startsWith("Bearer ")
      ? "valid"
      : "invalid";

    if (authHeader.startsWith("Bearer ")) {
      debug.token = authHeader.replace("Bearer ", "");
      debug.tokenAnalysis = this.analyzeToken(debug.token);
    } else {
      debug.errors = ['Authorization header must start with "Bearer "'];
    }

    return debug;
  }

  /**
   * Log comprehensive JWT debug information
   */
  static logDebugInfo(context = "manual-debug") {
    const configTest = this.testConfig();
    const testToken = this.generateTestToken();

    logger.info("JWT Debug Information", {
      context,
      timestamp: new Date().toISOString(),
      config: configTest,
      testToken: {
        generated: testToken.success,
        error: testToken.error || null,
      },
      environment: process.env.NODE_ENV,
    });

    return {
      config: configTest,
      testToken,
    };
  }
}

module.exports = JWTDebugger;
