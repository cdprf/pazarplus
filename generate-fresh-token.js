#!/usr/bin/env node

/**
 * Generate Fresh JWT Token
 * Creates a new JWT token for the existing user
 */

const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");

// JWT secret from environment (should match server)
const JWT_SECRET =
  process.env.JWT_SECRET || "your-super-secret-jwt-key-for-development-only";

// User ID from the existing token (we'll use the same user)
const USER_ID = "8bd737ab-8a3f-4f50-ab2c-d310d43e867a";

function generateFreshToken() {
  try {
    console.log("🔑 Generating fresh JWT token...");

    // Create a new token with extended expiration
    const payload = {
      id: USER_ID,
      iat: Math.floor(Date.now() / 1000),
      tenantId: null,
      subscriptionPlan: "enterprise",
      role: "admin",
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
      aud: "pazar-plus-client",
      iss: "pazar-plus",
    };

    const token = jwt.sign(payload, JWT_SECRET);

    const tokenData = {
      token: token,
      user: {
        id: USER_ID,
        role: "admin",
      },
      createdAt: new Date().toISOString(),
      expiresAt: new Date(payload.exp * 1000).toISOString(),
    };

    // Save token to file
    const tokenPath = path.join(__dirname, "dev-token.json");
    fs.writeFileSync(tokenPath, JSON.stringify(tokenData, null, 2));

    console.log(`✓ Token saved to: ${tokenPath}`);
    console.log(`📅 Token expires: ${tokenData.expiresAt}`);
    console.log("🎉 Fresh development token created successfully!");

    return true;
  } catch (error) {
    console.error("❌ Failed to generate token:", error.message);
    return false;
  }
}

// Run the token generation
if (generateFreshToken()) {
  console.log("\n🚀 Ready to test field sync system!");
  console.log("Run: node test-field-sync-local.js");
} else {
  console.log("\n💔 Token generation failed.");
}
