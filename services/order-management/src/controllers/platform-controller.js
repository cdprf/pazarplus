// services/order-management/src/controllers/platform-controller.js
const express = require("express");
const router = express.Router();
const { PlatformConnection } = require("../models/platform-connection.model");
const PlatformServiceFactory = require("../services/platforms/platformServiceFactory");
const { authenticateToken } = require("../middleware/auth-middleware");
const { Platform } = require('../models');
const wsService = require('../services/websocketService');

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

async function getPlatformConnections(req, res) {
  try {
    const connections = await Platform.findAll({
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

    const platform = await Platform.findByPk(id);
    
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
    const connectionData = {
      ...req.body,
      userId: req.user.id,
      status: 'active'
    };

    const platform = await Platform.create(connectionData);
    
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
    
    const platform = await Platform.findByPk(id);
    
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

module.exports = {
  createConnection,
  getConnections,
  getConnection, 
  updateConnection,
  deleteConnection,
  testConnection,
  getPlatformTypes,
  getPlatformConnections,
  updatePlatformStatus,
  createPlatformConnection,
  deletePlatformConnection
};
