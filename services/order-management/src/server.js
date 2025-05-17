// This file configures server settings and middleware for the Order Management Service.
// It sets up the Express server, applies middleware for security and logging,
// and defines basic routes. It also handles error responses and starts the server.

require('dotenv').config();
const App = require('./app');
const logger = require('./utils/logger');

async function startServer() {
  try {
    console.log('Starting application...');
    console.log('Environment:', process.env.NODE_ENV);
    console.log('JWT Secret defined:', !!process.env.JWT_SECRET);

    const app = new App();

    // Connect to database
    console.log('Connecting to database...');
    const dbConnected = await app.connectToDatabase();
    
    if (!dbConnected) {
      logger.error('Failed to connect to database. Exiting application.');
      process.exit(1);
    }
    
    // Start server
    console.log('Starting server...');
    app.listen();
  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`, { error });
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (reason, promise) => {
  logger.error(`Uncaught Rejection at:` , promise);
  logger.error(`Reason: ${reason}`);
  process.exit(1);
});


// Start the server
startServer();