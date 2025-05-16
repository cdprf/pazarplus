// This file configures server settings and middleware for the Order Management Service.
// It sets up the Express server, applies middleware for security and logging,
// and defines basic routes. It also handles error responses and starts the server.

require('dotenv').config();
const App = require('./app');
const logger = require('./utils/logger');

async function startServer() {
  const app = new App();
  
  try {
    // Connect to database
    const dbConnected = await app.connectToDatabase();
    
    if (!dbConnected) {
      logger.error('Failed to connect to database. Exiting application.');
      process.exit(1);
    }
    
    // Start server
    app.listen();
  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`, { error });
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error(`Uncaught Exception: ${error.message}`, { error });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer();