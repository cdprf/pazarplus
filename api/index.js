require("dotenv").config({ path: "../.env.unified" });

// Import the main app from server directory
const { app } = require("../server/app");

// Export the app for Vercel serverless functions
module.exports = app;
