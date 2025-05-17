const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const compression = require("compression");
const logger = require("./utils/logger");
const config = require("./config/app");

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
        ? ['http://localhost:3000']
        : [process.env.FRONTEND_URL],
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

    // Rate limiting - more permissive in development
    const limiter = rateLimit({
      windowMs: process.env.NODE_ENV === 'development' 
        ? 1 * 60 * 1000 // 1 minute in development
        : 15 * 60 * 1000, // 15 minutes in production
      max: process.env.NODE_ENV === 'development'
        ? 500 // 500 requests per minute in development
        : 100, // 100 requests per 15 minutes in production
      message: "Too many requests from this IP, please try again later",
      standardHeaders: true,
      legacyHeaders: false
    });
    this.app.use("/api/", limiter);

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
  }

  initializeRoutes() {
    try {
      // API routes
      this.app.use("/api/auth", require("./routes/authRoutes"));
      this.app.use("/api/platforms", require("./routes/platformRoutes"));
      this.app.use("/api/orders", require("./routes/orderRoutes"));
      this.app.use("/api/shipping", require("./routes/shippingRoutes"));
      this.app.use("/api/csv", require("./routes/csvRoutes"));
      this.app.use("/api/export", require("./routes/exportRoutes"));

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