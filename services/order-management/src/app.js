// src/app.js - FIXED

const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const compression = require("compression");
const logger = require("./utils/logger");

class App {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3000;

    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  initializeMiddlewares() {
    // Security middlewares
    this.app.use(helmet());

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: "Too many requests from this IP, please try again later",
    });
    this.app.use("/api/", limiter);

    // Parse JSON bodies
    this.app.use(express.json());

    // Parse URL-encoded bodies
    this.app.use(express.urlencoded({ extended: true }));

    // Enable CORS
    this.app.use(cors());

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
      // API routes - FIXED to use the router exports from each module
      this.app.use("/api/auth", require("./routes/authRoutes"));
      this.app.use("/api/platforms", require("./controllers/platform-controller"));
      this.app.use("/api/orders", require("./controllers/order-controller"));
      this.app.use("/api/shipping", require("./controllers/shipping-controller"));
      this.app.use("/api/csv", require("./controllers/csv-controller"));
      this.app.use("/api/export", require("./controllers/export-controller"));

      // Health check route
      this.app.get("/health", (req, res) => {
        res.status(200).json({
          status: "healthy",
          service: "order-management-service",
          version: process.env.npm_package_version || "1.0.0",
          timestamp: new Date().toISOString(),
        });
      });

      // Fallback route for SPA - removed duplicate
      this.app.get("*", (req, res) => {
        res.sendFile(path.join(__dirname, "../public/index.html"));
      });
    } catch (error) {
      logger.error("Error initializing routes:", error);
      throw new Error("Failed to initialize routes");
    }
  }

  // Error handling middleware
  initializeErrorHandling() {
    // 404 handler
    this.app.use((req, res, next) => {
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
        error: process.env.NODE_ENV === "production" ? undefined : err.stack,
      });
    });
  }

  async connectToDatabase() {
    try {
      // Use syncDatabase instead
      await require("./models/index").syncDatabase();
      logger.info("Database connection established successfully.");
      return true;
    } catch (error) {
      logger.error("Unable to connect to database:", error);
      return false;
    }
  }

  listen() {
    this.app.listen(this.port, () => {
      logger.info(`Server is running on port ${this.port}`);
    });
  }
}

module.exports = App;