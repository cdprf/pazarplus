// services/order-management/src/controllers/platform-controller.js
const express = require("express");
const router = express.Router();
const { PlatformConnection } = require("../models/platform-connection.model");
const PlatformServiceFactory = require("../services/platforms/platformServiceFactory");
const { authenticateToken } = require("../middleware/auth-middleware");

const logger = require("../utils/logger");


// Apply authentication middleware to all platform routes
router.use(authenticateToken);

// Connection management routes
router.post("/connections", createConnection);
router.get("/connections", getConnections);
router.get("/connections/:id", getConnection);
router.put("/connections/:id", updateConnection);
router.delete("/connections/:id", deleteConnection);
router.post("/connections/:id/test", testConnection);

// Platform type routes
router.get("/types", getPlatformTypes);


async function createConnection(req, res) {
  try {
    const { platformType, name, credentials } = req.body;
    const connection = await PlatformConnection.create({
      userId: req.user.id,
      platformType,
      name,
      credentials: JSON.stringify(credentials),
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
    const { name, credentials } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (credentials) updates.credentials = JSON.stringify(credentials);
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


module.exports = router;
