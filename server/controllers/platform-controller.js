const { PlatformConnection } = require('../models');
const logger = require('../utils/logger');

// Try to import platform service modules with proper error handling
let platformServices = {};

try {
  const HepsiburadaService = require('../modules/order-management/services/platforms/hepsiburada/hepsiburada-service');
  platformServices.hepsiburada = HepsiburadaService;
} catch (error) {
  logger.warn('HepsiburadaService not found');
}

try {
  const TrendyolService = require('../modules/order-management/services/platforms/trendyol/trendyol-service');
  platformServices.trendyol = TrendyolService;
} catch (error) {
  logger.warn('TrendyolService not found');
}

try {
  const N11Service = require('../modules/order-management/services/platforms/n11/n11-service');
  platformServices.n11 = N11Service;
} catch (error) {
  logger.warn('N11Service not found');
}

// Get all platform connections for a user
const getConnections = async (req, res) => {
  try {
    const connections = await PlatformConnection.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: connections
    });
  } catch (error) {
    logger.error(`Get connections error: ${error.message}`, { error });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch platform connections'
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
        userId: req.user.id 
      }
    });

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: 'Platform connection not found'
      });
    }

    res.json({
      success: true,
      data: connection
    });
  } catch (error) {
    logger.error(`Get connection error: ${error.message}`, { error });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch platform connection'
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
        message: 'Platform type, name, and credentials are required'
      });
    }

    const connection = await PlatformConnection.create({
      userId: req.user.id,
      platformType,
      name,
      credentials,
      status: 'active',
      isActive
    });

    res.status(201).json({
      success: true,
      message: 'Platform connected successfully',
      data: connection
    });
  } catch (error) {
    logger.error(`Create connection error: ${error.message}`, { error });
    res.status(500).json({
      success: false,
      message: 'Failed to create platform connection'
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
        userId: req.user.id 
      }
    });

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: 'Platform connection not found'
      });
    }

    await connection.update(updates);

    res.json({
      success: true,
      message: 'Platform connection updated successfully',
      data: connection
    });
  } catch (error) {
    logger.error(`Update connection error: ${error.message}`, { error });
    res.status(500).json({
      success: false,
      message: 'Failed to update platform connection'
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
        userId: req.user.id 
      }
    });

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: 'Platform connection not found'
      });
    }

    await connection.destroy();

    res.json({
      success: true,
      message: 'Platform connection deleted successfully'
    });
  } catch (error) {
    logger.error(`Delete connection error: ${error.message}`, { error });
    res.status(500).json({
      success: false,
      message: 'Failed to delete platform connection'
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
        userId: req.user.id 
      }
    });

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: 'Platform connection not found'
      });
    }

    // Test the actual platform connection
    const testResult = await testPlatformConnection(connection);

    // Only update status if the column exists
    try {
      if (testResult.success) {
        await connection.update({ status: 'active' });
      } else {
        await connection.update({ status: 'error' });
      }
    } catch (statusError) {
      // If status column doesn't exist, just log and continue
      logger.warn('Status column not found in platform_connections table', { 
        error: statusError.message,
        connectionId: id 
      });
    }

    res.json({
      success: testResult.success,
      message: testResult.message,
      data: {
        platform: connection.platformType,
        status: testResult.success ? 'connected' : 'failed',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error(`Test connection error: ${error.message}`, { error });
    res.status(500).json({
      success: false,
      message: 'Connection test failed',
      error: error.message
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
        userId: req.user.id 
      }
    });

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: 'Platform connection not found'
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
      updatedAt: connection.updatedAt
    };

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    logger.error(`Get connection settings error: ${error.message}`, { error });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch platform connection settings'
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
      credentials 
    } = req.body;

    const connection = await PlatformConnection.findOne({
      where: { 
        id, 
        userId: req.user.id 
      }
    });

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: 'Platform connection not found'
      });
    }

    // Prepare update object with only allowed fields
    const updates = {};
    
    if (name !== undefined) updates.name = name;
    if (isActive !== undefined) updates.isActive = isActive;
    if (environment !== undefined) updates.environment = environment;
    if (syncSettings !== undefined) updates.syncSettings = syncSettings;
    if (notificationSettings !== undefined) updates.notificationSettings = notificationSettings;
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
      updatedAt: connection.updatedAt
    };

    res.json({
      success: true,
      message: 'Platform connection settings updated successfully',
      data: updatedSettings
    });
  } catch (error) {
    logger.error(`Update connection settings error: ${error.message}`, { error });
    res.status(500).json({
      success: false,
      message: 'Failed to update platform connection settings'
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
        userId: req.user.id 
      }
    });

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: 'Platform connection not found'
      });
    }

    if (!connection.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Platform connection is not active'
      });
    }

    logger.info(`Platform sync initiated`, {
      connectionId: id,
      platformType: connection.platformType,
      userId: req.user.id
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
      syncStatus: 'completed'
    });

    logger.info(`Platform sync completed`, {
      connectionId: id,
      platformType: connection.platformType,
      userId: req.user.id,
      syncedOrders,
      syncedProducts
    });

    res.json({
      success: true,
      message: `Successfully synced ${connection.platformType} platform`,
      data: {
        platform: connection.platformType,
        syncedOrders,
        syncedProducts,
        timestamp: new Date().toISOString(),
        lastSyncAt: connection.lastSyncAt
      }
    });
  } catch (error) {
    logger.error(`Platform sync error: ${error.message}`, { error, connectionId: req.params.id });
    res.status(500).json({
      success: false,
      message: 'Failed to sync platform'
    });
  }
};

// Get platform analytics
const getPlatformAnalytics = async (req, res) => {
  try {
    const { id } = req.params;
    const { timeRange = '30d' } = req.query;

    const connection = await PlatformConnection.findOne({
      where: { 
        id, 
        userId: req.user.id 
      }
    });

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: 'Platform connection not found'
      });
    }

    // Generate mock analytics data
    const days = parseInt(timeRange.replace('d', '')) || 30;
    const mockAnalytics = {
      totalOrders: Math.floor(Math.random() * 500) + 100,
      totalRevenue: (Math.random() * 50000 + 10000).toFixed(2),
      averageOrderValue: (Math.random() * 200 + 50).toFixed(2),
      syncCount: Math.floor(Math.random() * 20) + 5,
      ordersOverTime: [],
      statusDistribution: [
        { name: 'Pending', value: Math.floor(Math.random() * 20) + 5 },
        { name: 'Processing', value: Math.floor(Math.random() * 30) + 10 },
        { name: 'Shipped', value: Math.floor(Math.random() * 40) + 20 },
        { name: 'Delivered', value: Math.floor(Math.random() * 50) + 30 },
        { name: 'Cancelled', value: Math.floor(Math.random() * 10) + 2 }
      ],
      syncPerformance: [],
      recentActivity: [
        {
          action: 'Order Sync',
          description: 'Synchronized 25 new orders',
          status: 'success',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
        },
        {
          action: 'Price Update',
          description: 'Updated prices for 150 products',
          status: 'success',
          timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
        },
        {
          action: 'Inventory Sync',
          description: 'Failed to sync inventory data',
          status: 'failed',
          timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
        }
      ],
      performanceMetrics: [
        { name: 'Sync Success Rate', current: '95%', previous: '92%', change: 3 },
        { name: 'Avg Sync Duration', current: '2.5min', previous: '3.1min', change: -19 },
        { name: 'Orders Per Day', current: '45', previous: '38', change: 18 },
        { name: 'Revenue Growth', current: '$1,250', previous: '$1,100', change: 14 }
      ]
    };

    // Generate time series data
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      mockAnalytics.ordersOverTime.push({
        date: date.toISOString().split('T')[0],
        orders: Math.floor(Math.random() * 20) + 5,
        revenue: Math.floor(Math.random() * 2000) + 500
      });
      
      mockAnalytics.syncPerformance.push({
        date: date.toISOString().split('T')[0],
        successful: Math.floor(Math.random() * 5) + 1,
        failed: Math.floor(Math.random() * 2)
      });
    }

    res.json({
      success: true,
      data: mockAnalytics
    });
  } catch (error) {
    logger.error(`Get platform analytics error: ${error.message}`, { error });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch platform analytics'
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
      dateRange = '30d',
      search 
    } = req.query;

    const connection = await PlatformConnection.findOne({
      where: { 
        id, 
        userId: req.user.id 
      }
    });

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: 'Platform connection not found'
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
      const syncStatus = Math.random() > 0.15 ? 'success' : 'failed';
      
      mockHistory.push({
        id: `sync_${Date.now()}_${i}`,
        status: syncStatus,
        type: Math.random() > 0.7 ? 'Automatic' : 'Manual',
        startedAt: syncDate.toISOString(),
        duration: Math.floor(Math.random() * 120000) + 10000, // 10s to 2min
        recordsProcessed: syncStatus === 'success' ? Math.floor(Math.random() * 50) + 5 : 0,
        recordsSkipped: Math.floor(Math.random() * 3),
        errorMessage: syncStatus === 'failed' ? 'API rate limit exceeded' : null,
        initiatedBy: Math.random() > 0.5 ? 'admin@example.com' : 'System'
      });
    }

    res.json({
      success: true,
      data: {
        history: mockHistory,
        total: totalRecords,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalRecords / limitNum)
      }
    });
  } catch (error) {
    logger.error(`Get sync history error: ${error.message}`, { error });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sync history'
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
        userId: req.user.id 
      }
    });

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: 'Platform connection not found'
      });
    }

    // Mock retry process
    const retryResult = {
      syncId: `retry_${Date.now()}`,
      originalSyncId: syncId,
      status: Math.random() > 0.2 ? 'success' : 'failed',
      recordsProcessed: Math.floor(Math.random() * 30) + 5,
      timestamp: new Date().toISOString()
    };

    logger.info(`Sync retry completed for platform ${id}`, {
      platformId: id,
      syncId,
      userId: req.user.id,
      retryResult
    });

    res.json({
      success: true,
      message: `Sync retry ${retryResult.status === 'success' ? 'completed successfully' : 'failed'}`,
      data: retryResult
    });
  } catch (error) {
    logger.error(`Retry sync error: ${error.message}`, { error });
    res.status(500).json({
      success: false,
      message: 'Failed to retry sync'
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
        message: 'No credentials provided for platform connection'
      };
    }

    switch (platformType) {
      case 'hepsiburada':
        return await testHepsiburadaConnection(credentials);
      case 'trendyol':
        return await testTrendyolConnection(credentials);
      case 'n11':
        return await testN11Connection(credentials);
      case 'csv':
        return await testCsvConnection(credentials);
      default:
        return {
          success: false,
          message: `Unsupported platform type: ${platformType}`
        };
    }
  } catch (error) {
    return {
      success: false,
      message: `Connection test failed: ${error.message}`
    };
  }
}

// Platform-specific test functions using existing services
async function testHepsiburadaConnection(credentials) {
  // Parse credentials if they're stored as JSON string
  let parsedCredentials = credentials;
  if (typeof credentials === 'string') {
    try {
      parsedCredentials = JSON.parse(credentials);
    } catch (e) {
      parsedCredentials = credentials;
    }
  }

  const { username, merchantId, apiKey, environment } = parsedCredentials;
  
  if (!username || !merchantId || !apiKey) {
    return {
      success: false,
      message: 'Missing required Hepsiburada credentials: username, merchantId, apiKey'
    };
  }

  try {
    const ServiceClass = platformServices.hepsiburada;
    if (!ServiceClass) {
      return {
        success: false,
        message: 'Hepsiburada service not available'
      };
    }

    // Create service instance with a placeholder connection ID
    const service = new ServiceClass('test');
    
    // Override the findConnection method to return mock connection for testing
    service.findConnection = async () => ({
      id: 'test',
      credentials: parsedCredentials,
      userId: 1,
      platformType: 'hepsiburada'
    });
    
    // Initialize the service to set up axios instance
    await service.initialize();
    
    // Test connection by making a simple API call
    const testResult = await service.fetchCompletedOrders({ limit: 1 });
    
    return {
      success: testResult.success,
      message: testResult.success ? 'Successfully connected to Hepsiburada' : testResult.message
    };
  } catch (error) {
    logger.error('Hepsiburada connection test failed:', error);
    return {
      success: false,
      message: `Failed to connect to Hepsiburada: ${error.message}`
    };
  }
}

async function testTrendyolConnection(credentials) {
  // Parse credentials if they're stored as JSON string
  let parsedCredentials = credentials;
  if (typeof credentials === 'string') {
    try {
      parsedCredentials = JSON.parse(credentials);
    } catch (e) {
      parsedCredentials = credentials;
    }
  }

  const { apiKey, apiSecret, supplierId } = parsedCredentials;
  
  if (!apiKey || !apiSecret || !supplierId) {
    return {
      success: false,
      message: 'Missing required Trendyol credentials: apiKey, apiSecret, supplierId'
    };
  }

  try {
    const ServiceClass = platformServices.trendyol;
    if (!ServiceClass) {
      return {
        success: false,
        message: 'Trendyol service not available'
      };
    }

    // Create service instance with connection ID and direct credentials
    const service = new ServiceClass(1, parsedCredentials);
    
    // Test connection using the service's testConnection method
    // Now this will work because BasePlatformService has getLogger()
    const testResult = await service.testConnection();
    
    return {
      success: testResult.success,
      message: testResult.message || 'Trendyol connection test completed'
    };
  } catch (error) {
    logger.error('Trendyol connection test failed:', error);
    return {
      success: false,
      message: `Trendyol connection failed: ${error.message}`
    };
  }
}

async function testN11Connection(credentials) {
  // Parse credentials if they're stored as JSON string
  let parsedCredentials = credentials;
  if (typeof credentials === 'string') {
    try {
      parsedCredentials = JSON.parse(credentials);
    } catch (e) {
      parsedCredentials = credentials;
    }
  }

  const { appKey, appSecret } = parsedCredentials;
  
  if (!appKey || !appSecret) {
    return {
      success: false,
      message: 'Missing required N11 credentials: appKey, appSecret'
    };
  }

  try {
    const ServiceClass = platformServices.n11;
    if (!ServiceClass) {
      return {
        success: false,
        message: 'N11 service not available'
      };
    }

    // Create service instance with connection ID and credentials
    const service = new ServiceClass(1, parsedCredentials);
    
    // Test connection using the service's testConnection method
    const testResult = await service.testConnection();
    
    return {
      success: testResult.success,
      message: testResult.message || 'N11 connection test completed'
    };
  } catch (error) {
    logger.error('N11 connection test failed:', error);
    return {
      success: false,
      message: `N11 connection failed: ${error.message}`
    };
  }
}

async function testCsvConnection(credentials) {
  // CSV connections don't require external API validation
  return {
    success: true,
    message: 'CSV connection is always available'
  };
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
  retrySyncHistory
};