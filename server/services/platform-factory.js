const EnhancedTrendyolService = require('./trendyol-service-enhanced');
const logger = require('../utils/logger');
const EventEmitter = require('events');

/**
 * Platform Service Factory
 * Manages creation and lifecycle of platform integrations
 * with circuit breakers, rate limiting, and compliance automation
 */
class PlatformServiceFactory extends EventEmitter {
  constructor() {
    super();

    this.activeServices = new Map();
    this.serviceConfigs = {
      trendyol: {
        serviceClass: EnhancedTrendyolService,
        rateLimits: { max: 100, window: 60000 },
        circuitBreaker: { threshold: 5, timeout: 30000 },
        retryPolicy: { attempts: 3, backoff: 'exponential' }
      },
      // Future platforms can be added here
      hepsiburada: {
        serviceClass: null, // To be implemented
        rateLimits: { max: 50, window: 60000 },
        circuitBreaker: { threshold: 3, timeout: 20000 },
        retryPolicy: { attempts: 2, backoff: 'linear' }
      },
      n11: {
        serviceClass: null, // To be implemented
        rateLimits: { max: 200, window: 60000 },
        circuitBreaker: { threshold: 10, timeout: 45000 },
        retryPolicy: { attempts: 5, backoff: 'exponential' }
      }
    };

    // Global service monitoring
    this.globalStats = {
      totalServices: 0,
      activeServices: 0,
      totalRequests: 0,
      totalErrors: 0,
      circuitBreakerTrips: 0
    };

    logger.info('Platform Service Factory initialized');
  }

  /**
   * Create or retrieve a platform service
   */
  async createService(platformType, connectionData) {
    const serviceKey = `${platformType}-${connectionData.id}`;

    // Return existing service if available
    if (this.activeServices.has(serviceKey)) {
      const existingService = this.activeServices.get(serviceKey);
      if (
        existingService.getHealthStatus().connectionId === connectionData.id
      ) {
        logger.info(`Reusing existing service for ${serviceKey}`);
        return existingService;
      }
    }

    // Create new service
    const config = this.serviceConfigs[platformType];
    if (!config || !config.serviceClass) {
      throw new Error(
        `Enhanced service not available for platform: ${platformType}`
      );
    }

    try {
      const service = new config.serviceClass(connectionData);

      // Setup service monitoring
      this.setupServiceMonitoring(service, serviceKey);

      // Store service
      this.activeServices.set(serviceKey, service);
      this.globalStats.totalServices++;
      this.globalStats.activeServices++;

      logger.info(
        `Created enhanced ${platformType} service for connection ${connectionData.id}`
      );

      this.emit('serviceCreated', {
        platformType,
        connectionId: connectionData.id,
        serviceKey
      });

      return service;
    } catch (error) {
      logger.error(`Failed to create enhanced ${platformType} service:`, error);
      throw error;
    }
  }

  /**
   * Setup monitoring for a service instance
   */
  setupServiceMonitoring(service, serviceKey) {
    // Monitor sync events
    service.on('syncProgress', (data) => {
      this.emit('globalSyncProgress', { serviceKey, ...data });
    });

    service.on('syncComplete', (data) => {
      this.globalStats.totalRequests++;
      this.emit('globalSyncComplete', { serviceKey, ...data });
    });

    service.on('syncError', (data) => {
      this.globalStats.totalErrors++;
      this.emit('globalSyncError', { serviceKey, ...data });
    });

    // Monitor circuit breaker events
    service.on('circuitOpen', (data) => {
      this.globalStats.circuitBreakerTrips++;
      this.emit('globalCircuitOpen', { serviceKey, ...data });

      // Potentially pause other services for the same platform
      this.handleCircuitBreakerTrip(serviceKey, data);
    });

    // Monitor real-time sync events
    service.on('realTimeSyncStarted', (data) => {
      this.emit('globalRealTimeSyncStarted', { serviceKey, ...data });
    });

    service.on('realTimeSyncStopped', (data) => {
      this.emit('globalRealTimeSyncStopped', { serviceKey, ...data });
    });
  }

  /**
   * Handle circuit breaker trips across services
   */
  async handleCircuitBreakerTrip(serviceKey, data) {
    const [platformType] = serviceKey.split('-');

    logger.warn(
      `Circuit breaker tripped for ${serviceKey}, evaluating platform-wide impact`
    );

    // Count active circuits for this platform
    const platformServices = Array.from(this.activeServices.entries()).filter(
      ([key]) => key.startsWith(platformType)
    );

    const trippedCircuits = platformServices.filter(([key, service]) => {
      const health = service.getHealthStatus();
      return Object.values(health.circuitBreakers).some(
        (cb) => cb.state === 'open'
      );
    });

    // If more than 50% of services have tripped circuits, implement platform-wide backoff
    if (trippedCircuits.length / platformServices.length > 0.5) {
      logger.error(
        `Platform-wide circuit breaker issue detected for ${platformType}`
      );

      await this.implementPlatformBackoff(platformType);

      this.emit('platformWideIssue', {
        platformType,
        affectedServices: trippedCircuits.length,
        totalServices: platformServices.length
      });
    }
  }

  /**
   * Implement platform-wide backoff strategy
   */
  async implementPlatformBackoff(platformType) {
    const platformServices = Array.from(this.activeServices.entries())
      .filter(([key]) => key.startsWith(platformType))
      .map(([key, service]) => service);

    // Temporarily stop real-time sync for all services
    for (const service of platformServices) {
      service.stopRealTimeSync();
    }

    // Wait 5 minutes before allowing restart
    setTimeout(() => {
      logger.info(
        `Platform backoff period ended for ${platformType}, allowing service restart`
      );
      this.emit('platformBackoffEnded', { platformType });
    }, 5 * 60 * 1000);
  }

  /**
   * Start real-time sync for a service
   */
  async startRealTimeSync(platformType, connectionId, options = {}) {
    const serviceKey = `${platformType}-${connectionId}`;
    const service = this.activeServices.get(serviceKey);

    if (!service) {
      throw new Error(`Service not found: ${serviceKey}`);
    }

    await service.startRealTimeSync(options);

    logger.info(`Real-time sync started for ${serviceKey}`);

    return {
      success: true,
      serviceKey,
      interval: options.interval || 5 * 60 * 1000
    };
  }

  /**
   * Stop real-time sync for a service
   */
  async stopRealTimeSync(platformType, connectionId) {
    const serviceKey = `${platformType}-${connectionId}`;
    const service = this.activeServices.get(serviceKey);

    if (!service) {
      throw new Error(`Service not found: ${serviceKey}`);
    }

    service.stopRealTimeSync();

    logger.info(`Real-time sync stopped for ${serviceKey}`);

    return { success: true, serviceKey };
  }

  /**
   * Perform manual sync for a service
   */
  async performSync(platformType, connectionId, options = {}) {
    const serviceKey = `${platformType}-${connectionId}`;
    const service = this.activeServices.get(serviceKey);

    if (!service) {
      throw new Error(`Service not found: ${serviceKey}`);
    }

    try {
      const result = await service.syncOrders(options);

      logger.info(`Manual sync completed for ${serviceKey}:`, {
        ordersProcessed: result.ordersProcessed,
        created: result.created,
        updated: result.updated,
        errors: result.errors?.length || 0
      });

      return result;
    } catch (error) {
      logger.error(`Manual sync failed for ${serviceKey}:`, error);
      throw error;
    }
  }

  /**
   * Get health status for all services
   */
  getGlobalHealthStatus() {
    const serviceHealths = {};

    for (const [serviceKey, service] of this.activeServices) {
      try {
        serviceHealths[serviceKey] = service.getHealthStatus();
      } catch (error) {
        serviceHealths[serviceKey] = {
          error: error.message,
          status: 'unhealthy'
        };
      }
    }

    return {
      globalStats: this.globalStats,
      services: serviceHealths,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get service by key
   */
  getService(platformType, connectionId) {
    const serviceKey = `${platformType}-${connectionId}`;
    return this.activeServices.get(serviceKey);
  }

  /**
   * Destroy a service and clean up resources
   */
  async destroyService(platformType, connectionId) {
    const serviceKey = `${platformType}-${connectionId}`;
    const service = this.activeServices.get(serviceKey);

    if (service) {
      try {
        await service.destroy();
        this.activeServices.delete(serviceKey);
        this.globalStats.activeServices--;

        logger.info(`Destroyed service ${serviceKey}`);

        this.emit('serviceDestroyed', {
          platformType,
          connectionId,
          serviceKey
        });

        return { success: true };
      } catch (error) {
        logger.error(`Failed to destroy service ${serviceKey}:`, error);
        throw error;
      }
    }

    return { success: false, reason: 'Service not found' };
  }

  /**
   * Destroy all services and clean up
   */
  async destroyAll() {
    const destroyPromises = [];

    for (const [serviceKey, service] of this.activeServices) {
      destroyPromises.push(
        service.destroy().catch((error) => {
          logger.error(`Failed to destroy service ${serviceKey}:`, error);
        })
      );
    }

    await Promise.all(destroyPromises);

    this.activeServices.clear();
    this.globalStats.activeServices = 0;

    this.removeAllListeners();

    logger.info('All enhanced platform services destroyed');
  }

  /**
   * Get available platforms
   */
  getAvailablePlatforms() {
    return Object.keys(this.serviceConfigs).map((platform) => ({
      name: platform,
      available: !!this.serviceConfigs[platform].serviceClass,
      config: {
        rateLimits: this.serviceConfigs[platform].rateLimits,
        circuitBreaker: this.serviceConfigs[platform].circuitBreaker,
        retryPolicy: this.serviceConfigs[platform].retryPolicy
      }
    }));
  }
}

// Create singleton instance
const platformServiceFactory = new PlatformServiceFactory();

module.exports = {
  PlatformServiceFactory,
  platformServiceFactory
};
