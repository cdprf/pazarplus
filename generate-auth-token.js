/**
 * Helper script to generate a valid JWT token for testing
 *
 * To use:
 * 1. Set EMAIL and PASSWORD environment variables
 * 2. Run this script: node generate-auth-token.js
 * 3. The token will be saved to auth-token.txt
 */

const axios = require("axios");
const fs = require("fs");

// Configuration
const API_URL = "http://localhost:3000/api/auth/login";
const EMAIL = process.env.EMAIL || "admin@example.com"; // Replace with your email
const PASSWORD = process.env.PASSWORD || "password123"; // Replace with your password

console.log("🔑 JWT Token Generator");
console.log("---------------------");
console.log(`API URL: ${API_URL}`);
console.log(`Email: ${EMAIL}`);

const generateToken = async () => {
  try {
    console.log("\n📡 Logging in...");

    const response = await axios.post(API_URL, {
      email: EMAIL,
      password: PASSWORD,
    });

    if (response.data.success && response.data.token) {
      console.log("\n✅ Login successful!");
      const token = response.data.token;

      // Save token to file
      fs.writeFileSync("auth-token.txt", token);
      console.log("\n💾 Token saved to auth-token.txt");

      // Display token (first 20 chars)
      console.log(`\n🔒 Token: ${token.substring(0, 20)}...`);
      return token;
    } else {
      console.error("\n❌ Login failed - no token in response");
      console.error(response.data);
      process.exit(1);
    }
  } catch (error) {
    console.error("\n❌ Error:");
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error("Response:", error.response.data);
    } else {
      console.error(error.message);
    }
    process.exit(1);
  }
};

generateToken();
