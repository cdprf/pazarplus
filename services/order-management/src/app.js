const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
const helmet = require("helmet");
const compression = require("compression");
const logger = require("./utils/logger");
const config = require("./config/app");
const { apiLimiter, authLimiter, syncLimiter } = require('./middleware/rate-limit');
const authRoutes = require('./routes/authRoutes');
const orderRoutes = require('./routes/orderRoutes');
const platformRoutes = require('./routes/platformRoutes');
const shippingRoutes = require('./routes/shippingRoutes');
const exportRoutes = require('./routes/exportRoutes');
const csvRoutes = require('./routes/csvRoutes');
const { authenticateToken } = require('./middleware/auth-middleware');
const { errorHandler } = require('./middleware/error-handler');
const { sequelize } = require('./models');

class App {
  constructor() {
    this.app = express();
    this.port = config.port;

    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  initializeMiddlewares() {
    // CORS configuration - must be before other middleware
    this.app.use(cors({
      origin: process.env.NODE_ENV === 'development' 
        ? 'http://localhost:3000'  // Allow frontend dev server
        : process.env.FRONTEND_URL,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type', 
        'Authorization', 
        'X-Requested-With',
        'Accept',
        'Origin'
      ],
      exposedHeaders: ['Content-Range', 'X-Content-Range'],
      preflightContinue: false,
      optionsSuccessStatus: 204
    }));

    // Security middlewares
    this.app.use(helmet({
      // Disable CSP to allow frontend development
      contentSecurityPolicy: process.env.NODE_ENV === 'development' ? false : true,
      // Allow cross-origin requests
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" }
    }));

    // Parse JSON bodies
    this.app.use(express.json());

    // Parse URL-encoded bodies
    this.app.use(express.urlencoded({ extended: true }));

    // HTTP request logging
    this.app.use(
      morgan("combined", {
        stream: { write: (message) => logger.info(message.trim()) },
      })
    );

    // Compress responses
    this.app.use(compression());

    // Serve static files
    this.app.use(express.static(path.join(__dirname, "../public")));

    // Apply rate limiting to all routes
    this.app.use(apiLimiter);
  }

  initializeRoutes() {
    try {
      // Public routes with auth rate limiting
      this.app.use('/api/auth', authLimiter, authRoutes);

      // Protected routes
      this.app.use(authenticateToken);
      
      // Apply sync rate limiting to sync endpoints
      this.app.use('/api/orders/sync', syncLimiter);
      
      // Register other routes
      this.app.use('/api/orders', orderRoutes);
      this.app.use('/api/platforms', platformRoutes);
      this.app.use('/api/shipping', shippingRoutes);
      this.app.use('/api/export', exportRoutes);
      this.app.use('/api/csv', csvRoutes);

      // Health check route
      this.app.get("/health", (req, res) => {
        res.status(200).json({
          status: "healthy",
          service: "order-management-service",
          version: process.env.npm_package_version || "1.0.0",
          timestamp: new Date().toISOString(),
        });
      });

      // SPA fallback route
      this.app.get("*", (req, res) => {
        res.sendFile(path.join(__dirname, "../public/index.html"));
      });

    } catch (error) {
      logger.error("Error initializing routes:", error);
      throw new Error("Failed to initialize routes");
    }
  }

  initializeErrorHandling() {
    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        success: false,
        message: "Resource not found",
      });
    });

    // Error handler
    this.app.use((err, req, res, next) => {
      logger.error(`Unhandled error: ${err.message}`, { error: err });

      res.status(err.status || 500).json({
        success: false,
        message: err.message || "Internal server error",
        error: process.env.NODE_ENV === "development" ? err.stack : undefined,
      });
    });

    // Global error handling middleware
    this.app.use(errorHandler);

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (error) => {
      logger.error('Unhandled Rejection:', error);
      process.exit(1);
    });
  }

  async connectToDatabase() {
    try {
      await require("./models/index").syncDatabase();
      logger.info("Database connection established successfully.");
      return true;
    } catch (error) {
      logger.error("Unable to connect to database:", error);
      return false;
    }
  }

  async closeDatabase() {
    try {
      await sequelize.close();
      logger.info('Database connection closed successfully.');
    } catch (error) {
      logger.error('Error closing database connection:', error);
      throw error;
    }
  }

  listen() {
    return new Promise((resolve, reject) => {
      try {
        const server = this.app.listen(this.port, '0.0.0.0', () => {
          logger.info(`Server is running on port ${this.port}`);
          resolve(server);
        });

        server.on('error', (error) => {
          logger.error(`Server error: ${error.message}`);
          reject(error);
        });
      } catch (error) {
        logger.error(`Failed to start server: ${error.message}`);
        reject(error);
      }
    });
  }

  getApp() {
    return this.app;
  }
}

module.exports = App;