// Alternative approach - more direct serverless function
const { app } = require("../server/app");

// Export the app directly as suggested in Stack Overflow solutions
module.exports = app;
