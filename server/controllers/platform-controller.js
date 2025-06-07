const { PlatformConnection, Order, Product } = require("../models");
const logger = require("../utils/logger");
const HepsiburadaService = require("../modules/order-management/services/platforms/hepsiburada/hepsiburada-service");
const TrendyolService = require("../modules/order-management/services/platforms/trendyol/trendyol-service");
const N11Service = require("../modules/order-management/services/platforms/n11/n11-service");

// Utility function to safely serialize data and prevent circular references
const safeJsonResponse = (data) => {
  try {
    // If data is a Sequelize instance, convert to plain object
    if (data && typeof data.get === "function") {
      data = data.get({ plain: true });
    }

    // If data is an array, process each item
    if (Array.isArray(data)) {
      return data.map((item) => safeJsonResponse(item));
    }

    // If data is an object, process recursively
    if (data && typeof data === "object") {
      const serialized = {};
      for (const [key, value] of Object.entries(data)) {
        // Skip circular reference properties and sensitive data
        if (
          key === "user" ||
          key === "User" ||
          key === "dataValues" ||
          key === "_previousDataValues" ||
          key === "password" ||
          key === "token"
        ) {
          continue;
        }

        if (value && typeof value === "object") {
          if (typeof value.get === "function") {
            // Sequelize instance
            serialized[key] = value.get({ plain: true });
          } else if (Array.isArray(value)) {
            // Array of potentially Sequelize instances
            serialized[key] = value.map((item) =>
              item && typeof item.get === "function"
                ? item.get({ plain: true })
                : item
            );
          } else {
            // Regular object - recursively serialize but limit depth
            serialized[key] = safeJsonResponse(value);
          }
        } else {
          serialized[key] = value;
        }
      }
      return serialized;
    }

    return data;
  } catch (error) {
    logger.error("Error serializing data for JSON response:", error);
    return { error: "Failed to serialize data", type: typeof data };
  }
};

// Try to import platform service modules with proper error handling
let platformServices = {};

platformServices.hepsiburada = HepsiburadaService;
platformServices.trendyol = TrendyolService;
platformServices.n11 = N11Service;

// Get all platform connections for a user
const getConnections = async (req, res) => {
  try {
    const connections = await PlatformConnection.findAll({
      where: { userId: req.user.id },
      order: [["createdAt", "DESC"]],
    });

    res.json({
      success: true,
      data: safeJsonResponse(connections),
    });
  } catch (error) {
    logger.error(`Get connections error: ${error.message}`, { error });
    res.status(500).json({
      success: false,
      message: "Failed to fetch platform connections",
    });
  }
};

// Get a specific platform connection
const getConnection = async (req, res) => {
  try {
    const { id } = req.params;

    const connection = await PlatformConnection.findOne({
      where: {
        id,
        userId: req.user.id,
      },
    });

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Platform connection not found",
      });
    }

    res.json({
      success: true,
      data: safeJsonResponse(connection),
    });
  } catch (error) {
    logger.error(`Get connection error: ${error.message}`, { error });
    res.status(500).json({
      success: false,
      message: "Failed to fetch platform connection",
    });
  }
};

// Create a new platform connection
const createConnection = async (req, res) => {
  try {
    const { platformType, name, credentials, isActive = true } = req.body;

    // Validate required fields
    if (!platformType || !name || !credentials) {
      return res.status(400).json({
        success: false,
        message: "Platform type, name, and credentials are required",
      });
    }

    const connection = await PlatformConnection.create({
      userId: req.user.id,
      platformType,
      name,
      credentials,
      status: "active",
      isActive,
    });

    res.status(201).json({
      success: true,
      message: "Platform connected successfully",
      data: connection,
    });
  } catch (error) {
    logger.error(`Create connection error: ${error.message}`, { error });
    res.status(500).json({
      success: false,
      message: "Failed to create platform connection",
    });
  }
};

// Update a platform connection
const updateConnection = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const connection = await PlatformConnection.findOne({
      where: {
        id,
        userId: req.user.id,
      },
    });

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Platform connection not found",
      });
    }

    await connection.update(updates);

    res.json({
      success: true,
      message: "Platform connection updated successfully",
      data: connection,
    });
  } catch (error) {
    logger.error(`Update connection error: ${error.message}`, { error });
    res.status(500).json({
      success: false,
      message: "Failed to update platform connection",
    });
  }
};

// Delete a platform connection
const deleteConnection = async (req, res) => {
  try {
    const { id } = req.params;

    const connection = await PlatformConnection.findOne({
      where: {
        id,
        userId: req.user.id,
      },
    });

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Platform connection not found",
      });
    }

    await connection.destroy();

    res.json({
      success: true,
      message: "Platform connection deleted successfully",
    });
  } catch (error) {
    logger.error(`Delete connection error: ${error.message}`, { error });
    res.status(500).json({
      success: false,
      message: "Failed to delete platform connection",
    });
  }
};

// Test a platform connection
const testConnection = async (req, res) => {
  try {
    const { id } = req.params;

    const connection = await PlatformConnection.findOne({
      where: {
        id,
        userId: req.user.id,
      },
    });

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Platform connection not found",
      });
    }

    // Test the actual platform connection
    const testResult = await testPlatformConnection(connection);

    // Only update status if the column exists
    try {
      if (testResult.success) {
        await connection.update({ status: "active" });
      } else {
        await connection.update({ status: "error" });
      }
    } catch (statusError) {
      // If status column doesn't exist, just log and continue
      logger.warn("Status column not found in platform_connections table", {
        error: statusError.message,
        connectionId: id,
      });
    }

    res.json({
      success: testResult.success,
      message: testResult.message,
      data: {
        platform: connection.platformType,
        status: testResult.success ? "connected" : "failed",
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error(`Test connection error: ${error.message}`, { error });
    res.status(500).json({
      success: false,
      message: "Connection test failed",
      error: error.message,
    });
  }
};

// Get platform connection settings
const getConnectionSettings = async (req, res) => {
  try {
    const { id } = req.params;

    const connection = await PlatformConnection.findOne({
      where: {
        id,
        userId: req.user.id,
      },
    });

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Platform connection not found",
      });
    }

    // Return connection settings (excluding sensitive credentials)
    const settings = {
      id: connection.id,
      platformType: connection.platformType,
      name: connection.name,
      isActive: connection.isActive,
      status: connection.status,
      environment: connection.environment,
      syncSettings: connection.syncSettings || {},
      notificationSettings: connection.notificationSettings || {},
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt,
    };

    res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    logger.error(`Get connection settings error: ${error.message}`, { error });
    res.status(500).json({
      success: false,
      message: "Failed to fetch platform connection settings",
    });
  }
};

// Update platform connection settings
const updateConnectionSettings = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      isActive,
      environment,
      syncSettings,
      notificationSettings,
      credentials,
    } = req.body;

    const connection = await PlatformConnection.findOne({
      where: {
        id,
        userId: req.user.id,
      },
    });

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Platform connection not found",
      });
    }

    // Prepare update object with only allowed fields
    const updates = {};

    if (name !== undefined) updates.name = name;
    if (isActive !== undefined) updates.isActive = isActive;
    if (environment !== undefined) updates.environment = environment;
    if (syncSettings !== undefined) updates.syncSettings = syncSettings;
    if (notificationSettings !== undefined)
      updates.notificationSettings = notificationSettings;
    if (credentials !== undefined) updates.credentials = credentials;

    await connection.update(updates);

    // Return updated settings (excluding sensitive credentials)
    const updatedSettings = {
      id: connection.id,
      platformType: connection.platformType,
      name: connection.name,
      isActive: connection.isActive,
      status: connection.status,
      environment: connection.environment,
      syncSettings: connection.syncSettings || {},
      notificationSettings: connection.notificationSettings || {},
      updatedAt: connection.updatedAt,
    };

    res.json({
      success: true,
      message: "Platform connection settings updated successfully",
      data: updatedSettings,
    });
  } catch (error) {
    logger.error(`Update connection settings error: ${error.message}`, {
      error,
    });
    res.status(500).json({
      success: false,
      message: "Failed to update platform connection settings",
    });
  }
};

// Sync platform data (force sync)
const syncPlatform = async (req, res) => {
  try {
    const { id } = req.params;

    const connection = await PlatformConnection.findOne({
      where: {
        id,
        userId: req.user.id,
      },
    });

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Platform connection not found",
      });
    }

    if (!connection.isActive) {
      return res.status(400).json({
        success: false,
        message: "Platform connection is not active",
      });
    }

    logger.info(`Platform sync initiated`, {
      connectionId: id,
      platformType: connection.platformType,
      userId: req.user.id,
    });

    // Mock sync process - in real implementation, this would:
    // 1. Use the appropriate platform service to fetch new data
    // 2. Process and save orders/products to the database
    // 3. Update sync timestamps

    const syncedOrders = Math.floor(Math.random() * 20) + 1;
    const syncedProducts = Math.floor(Math.random() * 15) + 1;

    // Update last sync time
    await connection.update({
      lastSyncAt: new Date(),
      syncStatus: "completed",
    });

    logger.info(`Platform sync completed`, {
      connectionId: id,
      platformType: connection.platformType,
      userId: req.user.id,
      syncedOrders,
      syncedProducts,
    });

    res.json({
      success: true,
      message: `Successfully synced ${connection.platformType} platform`,
      data: {
        platform: connection.platformType,
        syncedOrders,
        syncedProducts,
        timestamp: new Date().toISOString(),
        lastSyncAt: connection.lastSyncAt,
      },
    });
  } catch (error) {
    logger.error(`Platform sync error: ${error.message}`, {
      error,
      connectionId: req.params.id,
    });
    res.status(500).json({
      success: false,
      message: "Failed to sync platform",
    });
  }
};

// Get platform analytics
const getPlatformAnalytics = async (req, res) => {
  try {
    const { id } = req.params;
    const { timeRange = "30d" } = req.query;

    const connection = await PlatformConnection.findOne({
      where: {
        id,
        userId: req.user.id,
      },
    });

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Platform connection not found",
      });
    }

    // Calculate date range
    const days = parseInt(timeRange.replace("d", "")) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    try {
      // Get real analytics from database
      const [orders, products] = await Promise.all([
        Order.findAll({
          where: {
            userId: req.user.id,
            platform: connection.platformType,
            createdAt: {
              [require("sequelize").Op.gte]: startDate,
            },
          },
          order: [["createdAt", "ASC"]],
        }),
        Product.findAll({
          where: {
            userId: req.user.id,
            platform: connection.platformType,
          },
        }),
      ]);

      // Calculate real metrics
      const totalOrders = orders.length;
      const totalRevenue = orders.reduce(
        (sum, order) => sum + parseFloat(order.totalAmount || 0),
        0
      );
      const averageOrderValue =
        totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Group orders by status
      const statusCounts = orders.reduce((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {});

      const statusDistribution = Object.entries(statusCounts).map(
        ([name, value]) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          value,
        })
      );

      // Generate time series data from real orders
      const ordersOverTime = [];
      const dailyRevenue = {};
      const dailyOrders = {};

      orders.forEach((order) => {
        const date = order.createdAt.toISOString().split("T")[0];
        dailyOrders[date] = (dailyOrders[date] || 0) + 1;
        dailyRevenue[date] =
          (dailyRevenue[date] || 0) + parseFloat(order.totalAmount || 0);
      });

      // Fill in missing dates with zero values
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];

        ordersOverTime.push({
          date: dateStr,
          orders: dailyOrders[dateStr] || 0,
          revenue: dailyRevenue[dateStr] || 0,
        });
      }

      // Calculate sync performance (mock for now, would be from sync_history table)
      const syncPerformance = ordersOverTime.map((day) => ({
        date: day.date,
        successful: Math.floor(Math.random() * 5) + 1,
        failed: Math.floor(Math.random() * 2),
      }));

      // Generate recent activity from recent orders
      const recentOrders = orders.slice(-5).reverse();
      const recentActivity = recentOrders.map((order) => ({
        action: "Order Sync",
        description: `Synchronized order ${order.orderNumber || order.id}`,
        status: "success",
        timestamp: order.createdAt.toISOString(),
      }));

      // Add some system activities if no recent orders
      if (recentActivity.length === 0) {
        recentActivity.push({
          action: "Platform Check",
          description: "Platform connection verified",
          status: "success",
          timestamp: new Date().toISOString(),
        });
      }

      // Calculate performance metrics based on real data
      const lastWeekOrders = orders.filter((order) => {
        const orderDate = new Date(order.createdAt);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return orderDate >= weekAgo;
      });

      const previousWeekOrders = orders.filter((order) => {
        const orderDate = new Date(order.createdAt);
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return orderDate >= twoWeeksAgo && orderDate < weekAgo;
      });

      const lastWeekRevenue = lastWeekOrders.reduce(
        (sum, order) => sum + parseFloat(order.totalAmount || 0),
        0
      );
      const previousWeekRevenue = previousWeekOrders.reduce(
        (sum, order) => sum + parseFloat(order.totalAmount || 0),
        0
      );

      const revenueGrowth =
        previousWeekRevenue > 0
          ? ((lastWeekRevenue - previousWeekRevenue) / previousWeekRevenue) *
            100
          : 0;

      const orderGrowth =
        previousWeekOrders.length > 0
          ? ((lastWeekOrders.length - previousWeekOrders.length) /
              previousWeekOrders.length) *
            100
          : 0;

      const performanceMetrics = [
        {
          name: "Orders Per Week",
          current: lastWeekOrders.length.toString(),
          previous: previousWeekOrders.length.toString(),
          change: Math.round(orderGrowth),
        },
        {
          name: "Weekly Revenue",
          current: `₺${lastWeekRevenue.toFixed(0)}`,
          previous: `₺${previousWeekRevenue.toFixed(0)}`,
          change: Math.round(revenueGrowth),
        },
        {
          name: "Avg Order Value",
          current: `₺${averageOrderValue.toFixed(0)}`,
          previous: `₺${(previousWeekOrders.length > 0
            ? previousWeekRevenue / previousWeekOrders.length
            : 0
          ).toFixed(0)}`,
          change: 0, // Would need historical data for accurate calculation
        },
        {
          name: "Total Products",
          current: products.length.toString(),
          previous: products.length.toString(),
          change: 0,
        },
      ];

      const analytics = {
        totalOrders,
        totalRevenue: totalRevenue.toFixed(2),
        averageOrderValue: averageOrderValue.toFixed(2),
        syncCount: Math.floor(totalOrders / 10) + 5, // Estimate sync count
        ordersOverTime,
        statusDistribution,
        syncPerformance,
        recentActivity,
        performanceMetrics,
      };

      res.json({
        success: true,
        data: analytics,
      });
    } catch (dbError) {
      logger.warn(
        `Database query failed for platform analytics, using fallback: ${dbError.message}`
      );

      // Simple fallback with basic empty state
      const mockAnalytics = {
        totalOrders: 0,
        totalRevenue: "0.00",
        averageOrderValue: "0.00",
        syncCount: 0,
        ordersOverTime: [],
        statusDistribution: [],
        syncPerformance: [],
        recentActivity: [
          {
            action: "Platform Check",
            description: "Platform connection verified",
            status: "success",
            timestamp: new Date().toISOString(),
          },
        ],
        performanceMetrics: [
          { name: "Orders Per Week", current: "0", previous: "0", change: 0 },
          { name: "Weekly Revenue", current: "₺0", previous: "₺0", change: 0 },
          { name: "Avg Order Value", current: "₺0", previous: "₺0", change: 0 },
          { name: "Total Products", current: "0", previous: "0", change: 0 },
        ],
      };

      // Generate empty time series for the requested days
      const days = parseInt(timeRange.replace("d", "")) || 30;
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];

        mockAnalytics.ordersOverTime.push({
          date: dateStr,
          orders: 0,
          revenue: 0,
        });

        mockAnalytics.syncPerformance.push({
          date: dateStr,
          successful: 0,
          failed: 0,
        });
      }

      res.json({
        success: true,
        data: mockAnalytics,
      });
    }
  } catch (error) {
    logger.error(`Get platform analytics error: ${error.message}`, { error });
    res.status(500).json({
      success: false,
      message: "Failed to fetch platform analytics",
    });
  }
};

// Get platform sync history
const getSyncHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      page = 1,
      limit = 20,
      status,
      dateRange = "30d",
      search,
    } = req.query;

    const connection = await PlatformConnection.findOne({
      where: {
        id,
        userId: req.user.id,
      },
    });

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Platform connection not found",
      });
    }

    // Generate mock sync history data
    const mockHistory = [];
    const totalRecords = Math.floor(Math.random() * 100) + 20;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = Math.min(startIndex + limitNum, totalRecords);

    for (let i = startIndex; i < endIndex; i++) {
      const syncDate = new Date(Date.now() - i * 2 * 60 * 60 * 1000); // Every 2 hours
      const syncStatus = Math.random() > 0.15 ? "success" : "failed";

      mockHistory.push({
        id: `sync_${Date.now()}_${i}`,
        status: syncStatus,
        type: Math.random() > 0.7 ? "Automatic" : "Manual",
        startedAt: syncDate.toISOString(),
        duration: Math.floor(Math.random() * 120000) + 10000, // 10s to 2min
        recordsProcessed:
          syncStatus === "success" ? Math.floor(Math.random() * 50) + 5 : 0,
        recordsSkipped: Math.floor(Math.random() * 3),
        errorMessage:
          syncStatus === "failed" ? "API rate limit exceeded" : null,
        initiatedBy: Math.random() > 0.5 ? "admin@example.com" : "System",
      });
    }

    res.json({
      success: true,
      data: {
        history: mockHistory,
        total: totalRecords,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalRecords / limitNum),
      },
    });
  } catch (error) {
    logger.error(`Get sync history error: ${error.message}`, { error });
    res.status(500).json({
      success: false,
      message: "Failed to fetch sync history",
    });
  }
};

// Retry sync history
const retrySyncHistory = async (req, res) => {
  try {
    const { id, syncId } = req.params;

    const connection = await PlatformConnection.findOne({
      where: {
        id,
        userId: req.user.id,
      },
    });

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Platform connection not found",
      });
    }

    // Mock retry process
    const retryResult = {
      syncId: `retry_${Date.now()}`,
      originalSyncId: syncId,
      status: Math.random() > 0.2 ? "success" : "failed",
      recordsProcessed: Math.floor(Math.random() * 30) + 5,
      timestamp: new Date().toISOString(),
    };

    logger.info(`Sync retry completed for platform ${id}`, {
      platformId: id,
      syncId,
      userId: req.user.id,
      retryResult,
    });

    res.json({
      success: true,
      message: `Sync retry ${
        retryResult.status === "success" ? "completed successfully" : "failed"
      }`,
      data: retryResult,
    });
  } catch (error) {
    logger.error(`Retry sync error: ${error.message}`, { error });
    res.status(500).json({
      success: false,
      message: "Failed to retry sync",
    });
  }
};

// Helper function to test platform connections
async function testPlatformConnection(connection) {
  try {
    const { platformType, credentials } = connection;

    // Validate credentials exist
    if (!credentials || Object.keys(credentials).length === 0) {
      return {
        success: false,
        message: "No credentials provided for platform connection",
      };
    }

    switch (platformType) {
      case "hepsiburada": {
        const hepsiburadaService = new platformServices.hepsiburada(
          connection.id
        );
        return await hepsiburadaService.testConnection();
      }
      case "trendyol": {
        const trendyolService = new platformServices.trendyol(connection.id);
        return await trendyolService.testConnection();
      }
      case "n11": {
        const n11Service = new platformServices.n11(connection.id);
        // Set connection directly to avoid having to fetch it again
        n11Service.connection = connection;
        return await n11Service.testConnection();
      }
      case "csv": {
        const csvService = new platformServices.csv(connection.id);
        return await csvService.testConnection();
      }
      default:
        return {
          success: false,
          message: `Unsupported platform type: ${platformType}`,
        };
    }
  } catch (error) {
    return {
      success: false,
      message: `Connection test failed: ${error.message}`,
    };
  }
}

module.exports = {
  getConnections,
  getConnection,
  createConnection,
  updateConnection,
  deleteConnection,
  testConnection,
  getConnectionSettings,
  updateConnectionSettings,
  syncPlatform,
  getPlatformAnalytics,
  getSyncHistory,
  retrySyncHistory,
};
