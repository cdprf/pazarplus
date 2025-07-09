// Vercel serverless function entry point
// Don't configure dotenv here - let the server handle it
// require("dotenv").config({ path: "../.env.unified" });

// Import the main app from server directory
const { app } = require("../server/app");

// Export the app directly for Vercel serverless functions
// This follows the successful pattern from Stack Overflow solutions
module.exports = app;
