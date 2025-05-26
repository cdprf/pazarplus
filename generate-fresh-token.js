#!/usr/bin/env node

const config = require("./server/config/config");
const jwt = require("jsonwebtoken");

console.log("🔧 JWT Token Generator for Testing");
console.log("==================================");

// Generate a fresh token for testing
const generateFreshToken = (userId = 1) => {
  try {
    const token = jwt.sign(
      {
        id: userId,
        iat: Math.floor(Date.now() / 1000),
      },
      config.jwt.secret,
      {
        expiresIn: config.jwt.expiresIn,
        issuer: "pazar-plus",
        audience: "pazar-plus-client",
      }
    );

    console.log("✅ Fresh JWT token generated:");
    console.log("Token:", token);
    console.log("Length:", token.length);
    console.log("User ID:", userId);
    console.log("Expires in:", config.jwt.expiresIn);

    // Verify the token works
    const decoded = jwt.verify(token, config.jwt.secret);
    console.log("✅ Token verification successful");
    console.log("Decoded:", decoded);

    console.log("\n📋 To use this token:");
    console.log("1. Open browser Developer Tools (F12)");
    console.log("2. Go to Application > Local Storage");
    console.log('3. Set key "token" to the value above');
    console.log("4. Refresh the page");

    return token;
  } catch (error) {
    console.error("❌ Error generating token:", error.message);
    return null;
  }
};

// Check if user ID was provided as argument
const userId = process.argv[2] || 1;
generateFreshToken(userId);
