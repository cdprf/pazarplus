// This file configures server settings and middleware for the Order Management Service.
// It sets up the Express server, applies middleware for security and logging,
// and defines basic routes. It also handles error responses and starts the server.

require('dotenv').config();
const express = require('express');
const http = require('http');
const App = require('./app');
const wsService = require('./services/websocketService');
const logger = require('./utils/logger');

async function startServer() {
  try {
    console.log('Starting application...');
    console.log('Environment:', process.env.NODE_ENV);
    console.log('JWT Secret defined:', !!process.env.JWT_SECRET);

    const app = new App();
    const server = http.createServer(app.getApp());

    // Connect to database
    console.log('Connecting to database...');
    const dbConnected = await app.connectToDatabase();
    
    if (!dbConnected) {
      logger.error('Failed to connect to database. Exiting application.');
      process.exit(1);
    }
    
    // Initialize WebSocket service
    wsService.initialize(server);

    const PORT = process.env.PORT || 3001;

    // Start server
    console.log('Starting server...');
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