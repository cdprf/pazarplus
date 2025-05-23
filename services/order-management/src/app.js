const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
const helmet = require("helmet");
const compression = require("compression");
const bcrypt = require('bcryptjs'); // Add bcrypt import
const logger = require("./utils/logger");
const config = require("./config/app");
const { initializeSwagger } = require('./config/swagger');
// Remove old auth middleware
// const applyTestToken = require('./middleware/dev-test-auth');
// Keeping API rate limiter but removing auth limiter
const { apiLimiter, syncLimiter } = require('./middleware/rate-limit');
// Remove old auth routes
// const authRoutes = require('./routes/authRoutes');
const orderRoutes = require('./routes/orderRoutes');
const platformRoutes = require('./routes/platformRoutes');
const platformTemplatesRoutes = require('./routes/platform-templates-routes');
const shippingRoutes = require('./routes/shippingRoutes');
const exportRoutes = require('./routes/exportRoutes');
const csvRoutes = require('./routes/csvRoutes');
const proxyRoutes = require('./routes/proxyRoutes');
const settingsRoutes = require('./routes/settings-routes');
// Remove old auth middleware
// const { authenticateToken } = require('./middleware/auth-middleware');
const { errorHandler } = require('./middleware/error-handler');
const { sequelize, User, PlatformSchema } = require('./models');
const validationController = require('./controllers/validation-controller');

// Import new auth middleware
const { protect, authorize, refreshAuth } = require('./middleware/auth');

// Import cookie parser
const cookieParser = require('cookie-parser');

// Import routes
const authRoutes = require('./routes/auth');
const connectionRoutes = require('./routes/connections');
const devRoutes = require('./routes/dev');

class App {
  constructor() {
    this.app = express();
    this.port = config.port;
    this.corsOptions = {
      origin: process.env.NODE_ENV === 'development' 
        ? ['http://localhost:3000', 'http://127.0.0.1:3000']  // Allow frontend dev server with multiple origins
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
    };

    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  initializeMiddlewares() {
    // CORS configuration - must be before other middleware

    // Apply CORS middleware
    this.app.use(cors(this.corsOptions));
    
    // Handle OPTIONS preflight requests explicitly
    this.app.options('*', cors(this.corsOptions));

    // Security middlewares with appropriate settings for development
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

    // Add cookie parser middleware
    this.app.use(cookieParser());
  }

  initializeRoutes() {
    try {
      // Handle OPTIONS requests for CORS preflight
      this.app.options('*', cors(this.corsOptions));
      
      // API Documentation - Initialize Swagger UI
      initializeSwagger(this.app);
      
      // Health check route - keep this public
      this.app.get("/health", (req, res) => {
        res.status(200).json({
          status: "healthy",
          service: "order-management-service",
          version: process.env.npm_package_version || "1.0.0",
          timestamp: new Date().toISOString(),
        });
      });

      // Public auth routes (no authentication required)
      this.app.use('/api/auth', authRoutes);
      this.app.use('/api/dev', devRoutes);

      // Protected routes - all other API routes require authentication
      this.app.use('/api', protect);
      
      // Apply refresh token middleware after protect
      this.app.use('/api', refreshAuth);
      
      // Apply sync rate limiting to sync endpoints
      this.app.use('/api/orders/sync', syncLimiter);
      
      // Register protected routes
      this.app.use('/api/orders', orderRoutes);
      this.app.use('/api/platforms', platformRoutes);
      this.app.use('/api/platform-templates', platformTemplatesRoutes);
      this.app.use('/api/shipping', shippingRoutes);
      this.app.use('/api/export', exportRoutes);
      this.app.use('/api/csv', csvRoutes);
      this.app.use('/api/proxy', proxyRoutes);
      this.app.use('/api/settings', settingsRoutes);
      this.app.use('/api/validate', validationController);
      this.app.use('/api/connections', connectionRoutes);

      // SPA fallback route - only catch routes that aren't handled by the API or other specific routes
      this.app.get("*", (req, res, next) => {
        // Skip API routes and API documentation routes
        if (req.path.startsWith('/api') || req.path.startsWith('/api-docs')) {
          return next();
        }
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

// Updated initializeApp function to handle database sync better
const initializeApp = async () => {
  try {
    logger.info('Starting application initialization...');

    // First authenticate to check database connection
    await sequelize.authenticate();
    logger.info('Database connection established successfully.');
    
    // Remove automatic sync - use migrations instead
    // await sequelize.sync({ force: false, alter: true }); 
    
    // For development environment, ensure platform schemas exist
    if (process.env.NODE_ENV === 'development') {
      // Check for existing platform schemas to avoid duplicates
      const existingSchemas = await PlatformSchema.findAll();
      const existingSchemaKeys = existingSchemas.map(
        schema => `${schema.platformType}_${schema.entityType}_${schema.version}`
      );
      
      // Only create schemas if they don't already exist
      const platformTypes = ['trendyol', 'hepsiburada'];
      const entityTypes = ['product', 'order'];
      
      for (const platformType of platformTypes) {
        for (const entityType of entityTypes) {
          const schemaKey = `${platformType}_${entityType}_1.0.0`;
          if (!existingSchemaKeys.includes(schemaKey)) {
            logger.info(`Creating missing schema: ${schemaKey}`);
            await PlatformSchema.create({
              platformType,
              entityType,
              version: '1.0.0',
              schema: { type: 'object', properties: {} }, // Basic schema
              mappings: {},
              isActive: true,
              description: `Schema for ${platformType} ${entityType}s`
            });
          }
        }
      }
    }

    // For development environment, ensure dev user exists
    if (process.env.NODE_ENV === 'development') {
      const devUserEmail = 'dev@example.com';
      let devUser = await User.findOne({ where: { email: devUserEmail } });
      if (!devUser) {
        // Hash the password before creating the user
        const hashedPassword = await bcrypt.hash('devpassword123', 12);
        
        devUser = await User.create({
          email: devUserEmail,
          password: hashedPassword, // Use hashed password
          fullName: 'Development User',
          companyName: 'Dev Co',
          role: 'admin', // Ensure this role is valid
          isActive: true,
          emailVerified: true // Skip email verification for dev user
        });
        logger.info(`Development user created: ${devUser.email} with ID ${devUser.id}`);
      } else {
        // Check if password needs to be updated to hashed version
        const isPasswordValid = await bcrypt.compare('devpassword123', devUser.password);
        if (!isPasswordValid) {
          logger.warn(`Development user password needs updating. Updating to hashed version.`);
          const hashedPassword = await bcrypt.hash('devpassword123', 12);
          await devUser.update({ password: hashedPassword });
          logger.info(`Development user password updated.`);
        } else {
          logger.info(`Development user password is already properly hashed.`);
        }
        logger.info(`Development user found: ${devUser.email} with ID ${devUser.id}`);
      }
    }

    logger.info('Application initialization completed successfully');
    return true;

  } catch (error) {
    logger.error('Failed to initialize the application:', error);
    process.exit(1); // Exit if essential initialization fails
  }
};

module.exports = { App, initializeApp };