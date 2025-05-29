#!/usr/bin/env node

const config = require("./server/config/config");
const jwt = require("jsonwebtoken");
const { User } = require("./server/models");
const sequelize = require("./server/config/database");

console.log("🔧 Authentication Issue Fixer");
console.log("==============================");

async function fixAuthIssue() {
  try {
    // Connect to database
    await sequelize.authenticate();
    console.log("✅ Database connection successful");

    // Check JWT configuration
    console.log("🔑 JWT Configuration:");
    console.log("- Secret length:", config.jwt.secret.length);
    console.log("- Expires in:", config.jwt.expiresIn);
    console.log(
      "- Secret preview:",
      config.jwt.secret.substring(0, 10) + "..."
    );

    // Find or create a test user
    let user = await User.findOne({ where: { email: "test@example.com" } });

    if (!user) {
      console.log("👤 Creating test user...");
      user = await User.create({
        username: "testuser",
        email: "test@example.com",
        password: "password123", // This should be hashed in production
        firstName: "Test",
        lastName: "User",
        fullName: "Test User",
        isActive: true,
        subscriptionPlan: "premium",
        role: "user",
      });
      console.log("✅ Test user created with ID:", user.id);
    } else {
      console.log("✅ Test user found with ID:", user.id);

      // Ensure user is active
      if (!user.isActive) {
        await user.update({ isActive: true });
        console.log("✅ Test user activated");
      }
    }

    // Generate a fresh token using the exact same secret as the server
    const tokenPayload = {
      id: user.id,
      iat: Math.floor(Date.now() / 1000),
    };

    const token = jwt.sign(tokenPayload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
      issuer: "pazar-plus",
      audience: "pazar-plus-client",
    });

    console.log("\n🎫 Fresh Authentication Token Generated:");
    console.log("Token:", token);
    console.log("Length:", token.length);
    console.log("User ID:", user.id);
    console.log("User Email:", user.email);

    // Verify the token works with the same secret
    const decoded = jwt.verify(token, config.jwt.secret);
    console.log("✅ Token verification successful");
    console.log("Decoded payload:", decoded);

    console.log("\n📋 To fix the authentication issue:");
    console.log("1. Open your browser and go to the application");
    console.log("2. Open Developer Tools (F12)");
    console.log("3. Go to Application > Local Storage > http://localhost:3000");
    console.log("4. Delete any existing 'token' or 'authToken' entries");
    console.log("5. Add a new entry with key 'token' and the value above");
    console.log("6. Refresh the page");

    console.log("\n🧪 Testing API endpoint...");

    // Test the token with a curl command
    const curlCommand = `curl -s -H "Authorization: Bearer ${token}" "http://localhost:3000/api/orders?page=0&size=10"`;
    console.log("\n🔬 Test command:");
    console.log(curlCommand);

    return token;
  } catch (error) {
    console.error("❌ Error fixing authentication:", error.message);
    console.error("Stack:", error.stack);
    return null;
  } finally {
    await sequelize.close();
  }
}

fixAuthIssue();
