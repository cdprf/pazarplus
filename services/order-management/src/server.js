// This file configures server settings and middleware for the Order Management Service.
// It sets up the Express server, applies middleware for security and logging,
// and defines basic routes. It also handles error responses and starts the server.

require('dotenv').config();
const http = require('http');
const { App, initializeApp } = require('./app'); // Modified import
const wsService = require('./services/websocketService');
const logger = require('./utils/logger');
// const ensureTestUser = require('./scripts/ensure-test-user'); // Removed, initializeApp handles this

async function startServer() {
  try {
    logger.info('Starting application...'); // Changed from console.log to logger.info
    logger.info(`Environment: ${process.env.NODE_ENV}`);
    logger.info(`JWT Secret defined: ${!!process.env.JWT_SECRET}`);

    const app = new App(); // Instantiates the App class
    const server = http.createServer(app.getApp());

    // Initialize application (DB connection, sync, dev user creation)
    logger.info('Initializing application components...');
    await initializeApp(); // Added: Call the initializeApp function from app.js

    // Initialize WebSocket service
    wsService.initialize(server);

    const PORT = process.env.PORT || 3001;

    // Start server
    logger.info('Starting server...');
    server.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
    });

    // Graceful shutdown handling
    const shutdown = async (signal) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);

      // Close HTTP server first
      server.close(() => {
        logger.info('HTTP server closed.');
      });

      // Shutdown WebSocket server
      wsService.shutdown();

      // Close database connections
      try {
        await app.closeDatabase();
        logger.info('Database connections closed.');
      } catch (error) {
        logger.error('Error closing database:', error);
      }

      // Exit process
      process.exit(0);
    };

    // Listen for shutdown signals
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`, { error });
    process.exit(1);
  }
}

// Handle uncaught exceptions and rejections
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise);
  logger.error('Reason:', reason);
  process.exit(1);
});

// Start the server
startServer();