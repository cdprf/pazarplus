const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");

console.log("🔍 JWT Token Debugger");
console.log("====================");

// Try to find JWT secret from various sources
let jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  try {
    // Try to read from server config
    const configPath = path.join(__dirname, "server", "config", "config.js");
    if (fs.existsSync(configPath)) {
      const config = require(configPath);
      jwtSecret = config.jwtSecret || config.JWT_SECRET;
    }
  } catch (error) {
    console.log("Could not read config file");
  }
}

if (!jwtSecret) {
  console.log(
    "❌ JWT_SECRET not found. Please provide a token to decode manually."
  );
  console.log("\nUsage: node debug-jwt-token.js <your-jwt-token>");
  console.log("\nTo get your token:");
  console.log("1. Open browser developer tools");
  console.log("2. Go to Application/Storage tab");
  console.log("3. Look for localStorage or cookies containing the JWT token");
  process.exit(1);
}

const token = process.argv[2];

if (!token) {
  console.log("❌ No token provided");
  console.log("\nUsage: node debug-jwt-token.js <your-jwt-token>");
  console.log("\nTo get your token:");
  console.log("1. Open browser developer tools (F12)");
  console.log("2. Go to Application/Storage tab");
  console.log("3. Look in localStorage or cookies for the JWT token");
  console.log(
    "4. Copy the token value and run: node debug-jwt-token.js YOUR_TOKEN_HERE"
  );
  process.exit(1);
}

try {
  // Decode without verification first to see the payload
  const decoded = jwt.decode(token);
  console.log("📄 Token payload (decoded):");
  console.log(JSON.stringify(decoded, null, 2));

  // Try to verify with the secret
  if (jwtSecret) {
    try {
      const verified = jwt.verify(token, jwtSecret);
      console.log("\n✅ Token is valid and verified");
      console.log(
        "👤 User ID in token:",
        verified.userId || verified.id || verified.sub
      );
      console.log("👤 Username in token:", verified.username || verified.name);

      // Check if this matches our expected user
      const expectedUserId = "bd7c3736-60bd-44d0-8360-da73cd7ff4ef";
      const tokenUserId = verified.userId || verified.id || verified.sub;

      if (tokenUserId === expectedUserId) {
        console.log(
          "✅ Token user ID matches the user with platform connections!"
        );
      } else {
        console.log(
          "❌ Token user ID does NOT match the user with platform connections"
        );
        console.log(`   Expected: ${expectedUserId}`);
        console.log(`   Got:      ${tokenUserId}`);
        console.log(
          '\n🔧 You need to log in as the "dev" user to access platform connections'
        );
      }
    } catch (verifyError) {
      console.log("\n❌ Token verification failed:", verifyError.message);
    }
  }
} catch (error) {
  console.log("❌ Failed to decode token:", error.message);
}

console.log("\n💡 Expected user details:");
console.log("   User ID: bd7c3736-60bd-44d0-8360-da73cd7ff4ef");
console.log("   Username: dev");
console.log("   Email: dev@example.com");
