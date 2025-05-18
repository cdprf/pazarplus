// services/order-management/src/controllers/platform-controller.js
const express = require("express");
const { PlatformConnection, User } = require("../models"); // Added User model
const PlatformServiceFactory = require("../services/platforms/platformServiceFactory");
const { authenticateToken } = require("../middleware/auth-middleware");
const wsService = require('../services/websocketService');
const logger = require("../utils/logger");

const router = express.Router();

// Apply authentication middleware to all platform routes
router.use(authenticateToken);

// Connection management routes
router.post("/connections", createConnection);
router.get("/connections", getConnections);
router.get("/connections/:id", getConnection);
router.put("/connections/:id", updateConnection);
router.delete("/connections/:id", deleteConnection);
router.post("/connections/:id/test", testConnection);
router.post("/connections/test", testNewConnection);
router.get("/connections/:id/products", getProductsByConnection);

// Add new Trendyol-specific endpoints
router.get("/connections/:id/order/:orderNumber", getOrderById);
router.get("/connections/:id/order/:orderNumber/shipment-packages", getOrderShipmentPackages);
router.post("/connections/:id/order/:orderNumber/shipment-packages", createShipmentPackage);
router.get("/connections/:id/claims", getClaims);
router.get("/connections/:id/shipping-providers", getShippingProviders);
router.get("/connections/:id/settlements", getSettlements);
router.post("/connections/:id/batch-requests", createBatchRequest);
router.get("/connections/:id/batch-requests/:batchRequestId", getBatchRequestStatus);

// Platform type routes
router.get("/types", getPlatformTypes);

// Platform connection management functions
async function createConnection(req, res) {
  try {
    const { platformType, name, credentials } = req.body;

    if (!req.user || !req.user.id) {
      logger.error('User ID not found in request. Cannot create platform connection.');
      return res.status(401).json({ // Unauthorized
        success: false,
        message: 'User authentication error. Cannot create platform connection.',
      });
    }

    // Verify user exists in the database
    const user = await User.findByPk(req.user.id);
    if (!user) {
      logger.error(`User with ID ${req.user.id} not found. Cannot create platform connection.`);
      return res.status(400).json({
        success: false,
        message: `User with ID ${req.user.id} not found. Cannot create platform connection.`,
      });
    }

    const connection = await PlatformConnection.create({
      userId: req.user.id,
      platformType,
      platformName: name, // Add platformName field
      name,
      credentials: credentials, // No need to stringify since model type is JSON
      status: "pending",
    });
    return res.status(201).json({
      success: true,
      message: "Platform connection created successfully",
      data: connection,
    });
  } catch (error) {
    logger.error(`Failed to create platform connection: ${error.message}`, {
      error,
    });
    return res.status(500).json({
      success: false,
      message: "Failed to create platform connection",
      error: error.message,
    });
  }
}

async function getConnections(req, res) {
  try {
    const connections = await PlatformConnection.findAll({
      where: { userId: req.user.id },
    });
    return res.status(200).json({
      success: true,
      data: connections,
    });
  } catch (error) {
    logger.error(`Failed to get platform connections: ${error.message}`, {
      error,
    });
    return res.status(500).json({
      success: false,
      message: "Failed to get platform connections",
      error: error.message,
    });
  }
}

async function getConnection(req, res) {
  try {
    const connection = await PlatformConnection.findOne({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Platform connection not found",
      });
    }
    return res.status(200).json({
      success: true,
      data: connection,
    });
  } catch (error) {
    logger.error(`Failed to get platform connection: ${error.message}`, {
      error,
    });
    return res.status(500).json({
      success: false,
      message: "Failed to get platform connection",
      error: error.message,
    });
  }
}

async function updateConnection(req, res) {
  try {
    const connection = await PlatformConnection.findOne({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Platform connection not found",
      });
    }
    const { name, platformName, credentials, status } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (platformName) updates.platformName = platformName;
    if (credentials) updates.credentials = credentials; // No need to stringify since model type is JSON
    if (status) updates.status = status;
    
    await connection.update(updates);
    return res.status(200).json({
      success: true,
      message: "Platform connection updated successfully",
      data: connection,
    });
  } catch (error) {
    logger.error(`Failed to update platform connection: ${error.message}`, {
      error,
    });
    return res.status(500).json({
      success: false,
      message: "Failed to update platform connection",
      error: error.message,
    });
  }
}

async function deleteConnection(req, res) {
  try {
    const connection = await PlatformConnection.findOne({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Platform connection not found",
      });
    }
    await connection.destroy();
    return res.status(200).json({
      success: true,
      message: "Platform connection deleted successfully",
    });
  } catch (error) {
    logger.error(`Failed to delete platform connection: ${error.message}`, {
      error,
    });
    return res.status(500).json({
      success: false,
      message: "Failed to delete platform connection",
      error: error.message,
    });
  }
}

async function testConnection(req, res) {
  try {
    const connection = await PlatformConnection.findOne({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Platform connection not found",
      });
    }
    const platformService = await PlatformServiceFactory.createService(
      connection.id
    );
    const result = await platformService.testConnection();
    return res.status(200).json(result);
  } catch (error) {
    logger.error(`Failed to test platform connection: ${error.message}`, {
      error,
    });
    return res.status(500).json({
      success: false,
      message: "Failed to test platform connection",
      error: error.message,
    });
  }
}

async function testNewConnection(req, res) {
  try {
    const { platformType, credentials } = req.body;
    
    // Create a temporary platform service without saving to database
    const platformService = PlatformServiceFactory.createServiceByType(
      platformType,
      credentials
    );
    
    const result = await platformService.testConnection();
    return res.status(200).json(result);
  } catch (error) {
    logger.error(`Failed to test new platform connection: ${error.message}`, {
      error,
    });
    return res.status(500).json({
      success: false,
      message: "Failed to test platform connection",
      error: error.message,
    });
  }
}

async function getPlatformTypes(req, res) {
  try {
    // List of supported platform types
    const platformTypes = [
      {
        id: "trendyol",
        name: "Trendyol",
        description: "Integration with Trendyol marketplace",
        status: "active",
      },
      {
        id: "hepsiburada",
        name: "Hepsiburada",
        description: "Integration with Hepsiburada marketplace",
        status: "active",
      },
      {
        id: "n11",
        name: "N11",
        description: "Integration with N11 marketplace",
        status: "coming_soon",
      },
      {
        id: "csv",
        name: "CSV Import",
        description: "Import orders from CSV files",
        status: "active",
      },
    ];
    return res.status(200).json({
      success: true,
      data: platformTypes,
    });
  } catch (error) {
    logger.error(`Failed to get platform types: ${error.message}`, { error });
    return res.status(500).json({
      success: false,
      message: "Failed to get platform types",
      error: error.message,
    });
  }
}

// Direct platform access functions - these were added for the root routes
async function getPlatformConnections(req, res) {
  try {
    const connections = await PlatformConnection.findAll({
      where: { userId: req.user.id }
    });
    
    return res.status(200).json({
      success: true,
      data: connections
    });
  } catch (error) {
    logger.error('Error fetching platform connections:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching platform connections',
      error: error.message
    });
  }
}

async function updatePlatformStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const platform = await PlatformConnection.findByPk(id);
    
    if (!platform) {
      return res.status(404).json({
        success: false,
        message: 'Platform connection not found'
      });
    }

    await platform.update({ status });
    
    // Notify connected clients about platform status change
    wsService.notifyPlatformStatusChange(platform);

    return res.status(200).json({
      success: true,
      data: platform
    });
  } catch (error) {
    logger.error('Error updating platform status:', error);
    return res.status(500).json({
      success: false,
      message: 'Error updating platform status',
      error: error.message
    });
  }
}

async function createPlatformConnection(req, res) {
  try {
    if (!req.user || !req.user.id) {
      logger.error('User ID not found in request. Cannot create platform connection.');
      return res.status(401).json({ // Unauthorized
        success: false,
        message: 'User authentication error. Cannot create platform connection.',
      });
    }

    // Verify user exists in the database
    const user = await User.findByPk(req.user.id);
    if (!user) {
      logger.error(`User with ID ${req.user.id} not found. Cannot create platform connection.`);
      return res.status(400).json({
        success: false,
        message: `User with ID ${req.user.id} not found. Cannot create platform connection.`,
      });
    }

    // Make sure platformName is included
    const connectionData = {
      ...req.body,
      userId: req.user.id,
      status: 'active',
      // Use name as platformName if platformName is not provided
      platformName: req.body.platformName || req.body.name
    };

    // If credentials is a string, parse it to ensure it's stored as JSON
    if (connectionData.credentials && typeof connectionData.credentials === 'string') {
      try {
        connectionData.credentials = JSON.parse(connectionData.credentials);
      } catch (e) {
        // If it's not valid JSON, leave it as is
        logger.warn(`Failed to parse credentials as JSON: ${e.message}`);
      }
    }

    const platform = await PlatformConnection.create(connectionData);
    
    // Notify connected clients about new platform connection
    wsService.notifyPlatformStatusChange(platform);

    return res.status(201).json({
      success: true,
      data: platform
    });
  } catch (error) {
    logger.error('Error creating platform connection:', error);
    return res.status(500).json({
      success: false,
      message: 'Error creating platform connection',
      error: error.message
    });
  }
}

async function deletePlatformConnection(req, res) {
  try {
    const { id } = req.params;
    
    const platform = await PlatformConnection.findByPk(id);
    
    if (!platform) {
      return res.status(404).json({
        success: false,
        message: 'Platform connection not found'
      });
    }

    await platform.destroy();
    
    // Notify connected clients about platform removal
    wsService.notifyPlatformStatusChange({ id, status: 'removed' });

    return res.status(200).json({
      success: true,
      message: 'Platform connection deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting platform connection:', error);
    return res.status(500).json({
      success: false,
      message: 'Error deleting platform connection',
      error: error.message
    });
  }
}

/**
 * Get products from a platform connection
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function getProductsByConnection(req, res) {
  try {
    const connection = await PlatformConnection.findOne({
      where: { id: req.params.id, userId: req.user.id },
    });
    
    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Platform connection not found",
      });
    }

    // Only support Trendyol for now
    if (connection.platformType.toLowerCase() !== 'trendyol') {
      return res.status(400).json({
        success: false,
        message: `Product fetching is not supported for ${connection.platformType} platform`,
      });
    }
    
    // Parse query parameters
    const page = parseInt(req.query.page) || 0;
    const size = parseInt(req.query.size) || 50;
    
    // Create platform service instance
    const platformService = await PlatformServiceFactory.createService(
      connection.id
    );
    
    // Fetch products
    const result = await platformService.fetchProducts({
      page, 
      size
    });
    
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    logger.error(`Failed to fetch platform products: ${error.message}`, {
      error,
    });
    return res.status(500).json({
      success: false,
      message: "Failed to fetch platform products",
      error: error.message,
    });
  }
}

/**
 * Get single order details from Trendyol by order number
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function getOrderById(req, res) {
  try {
    const connection = await PlatformConnection.findOne({
      where: { id: req.params.id, userId: req.user.id },
    });
    
    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Platform connection not found",
      });
    }

    if (connection.platformType.toLowerCase() !== 'trendyol') {
      return res.status(400).json({
        success: false,
        message: `This endpoint is only supported for Trendyol platform`,
      });
    }
    
    const { orderNumber } = req.params;
    
    // Create platform service instance
    const platformService = await PlatformServiceFactory.createService(
      connection.id
    );
    
    // Get order details
    const result = await platformService.getOrderById(orderNumber);
    
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    logger.error(`Failed to fetch order details: ${error.message}`, {
      error,
    });
    return res.status(500).json({
      success: false,
      message: "Failed to fetch order details",
      error: error.message,
    });
  }
}

/**
 * Get shipment packages for an order from Trendyol
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function getOrderShipmentPackages(req, res) {
  try {
    const connection = await PlatformConnection.findOne({
      where: { id: req.params.id, userId: req.user.id },
    });
    
    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Platform connection not found",
      });
    }

    if (connection.platformType.toLowerCase() !== 'trendyol') {
      return res.status(400).json({
        success: false,
        message: `This endpoint is only supported for Trendyol platform`,
      });
    }
    
    const { orderNumber } = req.params;
    
    // Create platform service instance
    const platformService = await PlatformServiceFactory.createService(
      connection.id
    );
    
    // Get shipment packages
    const result = await platformService.getOrderShipmentPackages(orderNumber);
    
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    logger.error(`Failed to fetch shipment packages: ${error.message}`, {
      error,
    });
    return res.status(500).json({
      success: false,
      message: "Failed to fetch shipment packages",
      error: error.message,
    });
  }
}

/**
 * Create a shipment package for a Trendyol order
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function createShipmentPackage(req, res) {
  try {
    const connection = await PlatformConnection.findOne({
      where: { id: req.params.id, userId: req.user.id },
    });
    
    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Platform connection not found",
      });
    }

    if (connection.platformType.toLowerCase() !== 'trendyol') {
      return res.status(400).json({
        success: false,
        message: `This endpoint is only supported for Trendyol platform`,
      });
    }
    
    const { orderNumber } = req.params;
    const packageDetails = req.body;
    
    // Create platform service instance
    const platformService = await PlatformServiceFactory.createService(
      connection.id
    );
    
    // Create shipment package
    const result = await platformService.createShipmentPackage(orderNumber, packageDetails);
    
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    logger.error(`Failed to create shipment package: ${error.message}`, {
      error,
    });
    return res.status(500).json({
      success: false,
      message: "Failed to create shipment package",
      error: error.message,
    });
  }
}

/**
 * Get claims for a Trendyol connection
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function getClaims(req, res) {
  try {
    const connection = await PlatformConnection.findOne({
      where: { id: req.params.id, userId: req.user.id },
    });
    
    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Platform connection not found",
      });
    }

    if (connection.platformType.toLowerCase() !== 'trendyol') {
      return res.status(400).json({
        success: false,
        message: `This endpoint is only supported for Trendyol platform`,
      });
    }
    
    // Parse query parameters
    const page = parseInt(req.query.page) || 0;
    const size = parseInt(req.query.size) || 50;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    
    // Create platform service instance
    const platformService = await PlatformServiceFactory.createService(
      connection.id
    );
    
    // Get claims
    const result = await platformService.getClaims({
      page,
      size,
      startDate,
      endDate
    });
    
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    logger.error(`Failed to fetch claims: ${error.message}`, {
      error,
    });
    return res.status(500).json({
      success: false,
      message: "Failed to fetch claims",
      error: error.message,
    });
  }
}

/**
 * Get shipping providers for a Trendyol connection
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function getShippingProviders(req, res) {
  try {
    const connection = await PlatformConnection.findOne({
      where: { id: req.params.id, userId: req.user.id },
    });
    
    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Platform connection not found",
      });
    }

    if (connection.platformType.toLowerCase() !== 'trendyol') {
      return res.status(400).json({
        success: false,
        message: `This endpoint is only supported for Trendyol platform`,
      });
    }
    
    // Create platform service instance
    const platformService = await PlatformServiceFactory.createService(
      connection.id
    );
    
    // Get shipping providers
    const result = await platformService.getShippingProviders();
    
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    logger.error(`Failed to fetch shipping providers: ${error.message}`, {
      error,
    });
    return res.status(500).json({
      success: false,
      message: "Failed to fetch shipping providers",
      error: error.message,
    });
  }
}

/**
 * Get settlements for a Trendyol connection
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function getSettlements(req, res) {
  try {
    const connection = await PlatformConnection.findOne({
      where: { id: req.params.id, userId: req.user.id },
    });
    
    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Platform connection not found",
      });
    }

    if (connection.platformType.toLowerCase() !== 'trendyol') {
      return res.status(400).json({
        success: false,
        message: `This endpoint is only supported for Trendyol platform`,
      });
    }
    
    // Parse query parameters
    const page = parseInt(req.query.page) || 0;
    const size = parseInt(req.query.size) || 50;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    
    // Create platform service instance
    const platformService = await PlatformServiceFactory.createService(
      connection.id
    );
    
    // Get settlements
    const result = await platformService.getSettlements({
      page,
      size,
      startDate,
      endDate
    });
    
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    logger.error(`Failed to fetch settlements: ${error.message}`, {
      error,
    });
    return res.status(500).json({
      success: false,
      message: "Failed to fetch settlements",
      error: error.message,
    });
  }
}

/**
 * Create a batch request for Trendyol operations
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function createBatchRequest(req, res) {
  try {
    const connection = await PlatformConnection.findOne({
      where: { id: req.params.id, userId: req.user.id },
    });
    
    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Platform connection not found",
      });
    }

    if (connection.platformType.toLowerCase() !== 'trendyol') {
      return res.status(400).json({
        success: false,
        message: `This endpoint is only supported for Trendyol platform`,
      });
    }
    
    const { type, items } = req.body;
    
    if (!type || !items) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameters: type and items",
      });
    }
    
    // Create platform service instance
    const platformService = await PlatformServiceFactory.createService(
      connection.id
    );
    
    // Create batch request
    const result = await platformService.createBatchRequest(type, items);
    
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    logger.error(`Failed to create batch request: ${error.message}`, {
      error,
    });
    return res.status(500).json({
      success: false,
      message: "Failed to create batch request",
      error: error.message,
    });
  }
}

/**
 * Get status of a batch request from Trendyol
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
async function getBatchRequestStatus(req, res) {
  try {
    const connection = await PlatformConnection.findOne({
      where: { id: req.params.id, userId: req.user.id },
    });
    
    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Platform connection not found",
      });
    }

    if (connection.platformType.toLowerCase() !== 'trendyol') {
      return res.status(400).json({
        success: false,
        message: `This endpoint is only supported for Trendyol platform`,
      });
    }
    
    const { batchRequestId } = req.params;
    
    if (!batchRequestId) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameter: batchRequestId",
      });
    }
    
    // Create platform service instance
    const platformService = await PlatformServiceFactory.createService(
      connection.id
    );
    
    // Get batch request status
    const result = await platformService.getBatchRequestStatus(batchRequestId);
    
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    logger.error(`Failed to get batch request status: ${error.message}`, {
      error,
    });
    return res.status(500).json({
      success: false,
      message: "Failed to get batch request status",
      error: error.message,
    });
  }
}

module.exports = {
  createConnection,
  getConnections,
  getConnection, 
  updateConnection,
  deleteConnection,
  testConnection,
  testNewConnection,
  getPlatformTypes,
  getPlatformConnections,
  updatePlatformStatus,
  createPlatformConnection,
  deletePlatformConnection,
  getProductsByConnection,
  getOrderById,
  getOrderShipmentPackages,
  createShipmentPackage,
  getClaims,
  getShippingProviders,
  getSettlements,
  createBatchRequest,
  getBatchRequestStatus
};
