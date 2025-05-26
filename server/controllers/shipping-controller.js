/**
 * Shipping Controller
 * Handles shipping-related API endpoints for Turkish carriers
 */

const shippingFactory = require('../modules/public/shipping/ShippingServiceFactory');
const logger = require('../utils/logger');

class ShippingController {
  /**
   * Get all supported shipping carriers
   */
  async getSupportedCarriers(req, res) {
    try {
      const carriers = shippingFactory.getSupportedCarriers();
      
      res.json({
        success: true,
        data: carriers,
        message: 'Supported carriers retrieved successfully'
      });
    } catch (error) {
      logger.error(`Failed to get supported carriers: ${error.message}`, { error });
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to retrieve supported carriers',
          code: 'CARRIERS_FETCH_ERROR'
        }
      });
    }
  }

  /**
   * Get shipping rates from carriers
   */
  async getShippingRates(req, res) {
    try {
      const { packageInfo, fromAddress, toAddress, carriers } = req.body;
      
      // Validate required fields
      if (!packageInfo || !fromAddress || !toAddress) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Package info, from address, and to address are required',
            code: 'MISSING_REQUIRED_FIELDS'
          }
        });
      }

      // Get carrier credentials from user settings or request
      const carrierCredentials = req.user?.carrierCredentials || req.body.credentials || {};
      
      // Compare rates across carriers
      const comparison = await shippingFactory.compareRates(
        packageInfo,
        fromAddress,
        toAddress,
        carrierCredentials,
        carriers
      );

      res.json({
        success: true,
        data: comparison,
        message: 'Shipping rates calculated successfully'
      });
    } catch (error) {
      logger.error(`Failed to get shipping rates: ${error.message}`, { error });
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to calculate shipping rates',
          code: 'RATE_CALCULATION_ERROR'
        }
      });
    }
  }

  /**
   * Create shipping label
   */
  async createShippingLabel(req, res) {
    try {
      const { shipmentData, carrier } = req.body;
      
      // Validate required fields
      if (!shipmentData || !carrier) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Shipment data and carrier are required',
            code: 'MISSING_REQUIRED_FIELDS'
          }
        });
      }

      // Get carrier credentials
      const carrierCredentials = req.user?.carrierCredentials || req.body.credentials || {};
      
      if (!carrierCredentials[carrier]) {
        return res.status(400).json({
          success: false,
          error: {
            message: `No credentials found for carrier: ${carrier}`,
            code: 'MISSING_CARRIER_CREDENTIALS'
          }
        });
      }

      // Create shipping label
      const result = await shippingFactory.createShippingLabel(
        shipmentData,
        carrierCredentials,
        carrier
      );

      res.json({
        success: true,
        data: result.data,
        message: 'Shipping label created successfully'
      });
    } catch (error) {
      logger.error(`Failed to create shipping label: ${error.message}`, { error });
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to create shipping label',
          code: 'LABEL_CREATION_ERROR'
        }
      });
    }
  }

  /**
   * Track package
   */
  async trackPackage(req, res) {
    try {
      const { trackingNumber, carrier } = req.params;
      
      // Validate required fields
      if (!trackingNumber || !carrier) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Tracking number and carrier are required',
            code: 'MISSING_REQUIRED_FIELDS'
          }
        });
      }

      // Get carrier credentials
      const carrierCredentials = req.user?.carrierCredentials || req.query.credentials || {};
      
      if (!carrierCredentials[carrier]) {
        return res.status(400).json({
          success: false,
          error: {
            message: `No credentials found for carrier: ${carrier}`,
            code: 'MISSING_CARRIER_CREDENTIALS'
          }
        });
      }

      // Track package
      const result = await shippingFactory.trackPackage(
        trackingNumber,
        carrier,
        carrierCredentials[carrier]
      );

      res.json({
        success: true,
        data: result.data,
        message: 'Package tracking retrieved successfully'
      });
    } catch (error) {
      logger.error(`Failed to track package: ${error.message}`, { error });
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to track package',
          code: 'TRACKING_ERROR'
        }
      });
    }
  }

  /**
   * Cancel shipment
   */
  async cancelShipment(req, res) {
    try {
      const { trackingNumber, carrier } = req.params;
      
      // Validate required fields
      if (!trackingNumber || !carrier) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Tracking number and carrier are required',
            code: 'MISSING_REQUIRED_FIELDS'
          }
        });
      }

      // Get carrier credentials
      const carrierCredentials = req.user?.carrierCredentials || req.body.credentials || {};
      
      if (!carrierCredentials[carrier]) {
        return res.status(400).json({
          success: false,
          error: {
            message: `No credentials found for carrier: ${carrier}`,
            code: 'MISSING_CARRIER_CREDENTIALS'
          }
        });
      }

      // Cancel shipment
      const result = await shippingFactory.cancelShipment(
        trackingNumber,
        carrier,
        carrierCredentials[carrier]
      );

      res.json({
        success: true,
        data: result.data,
        message: 'Shipment cancelled successfully'
      });
    } catch (error) {
      logger.error(`Failed to cancel shipment: ${error.message}`, { error });
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to cancel shipment',
          code: 'CANCELLATION_ERROR'
        }
      });
    }
  }

  /**
   * Check delivery availability
   */
  async checkDeliveryAvailability(req, res) {
    try {
      const { address, carriers } = req.body;
      
      // Validate required fields
      if (!address) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Address is required',
            code: 'MISSING_REQUIRED_FIELDS'
          }
        });
      }

      // Get carrier credentials
      const carrierCredentials = req.user?.carrierCredentials || req.body.credentials || {};

      // Check delivery availability
      const result = await shippingFactory.checkDeliveryAvailability(
        address,
        carrierCredentials,
        carriers
      );

      res.json({
        success: true,
        data: result,
        message: 'Delivery availability checked successfully'
      });
    } catch (error) {
      logger.error(`Failed to check delivery availability: ${error.message}`, { error });
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to check delivery availability',
          code: 'AVAILABILITY_CHECK_ERROR'
        }
      });
    }
  }

  /**
   * Get carrier service types
   */
  async getCarrierServices(req, res) {
    try {
      const { carrier } = req.params;
      
      // Validate required fields
      if (!carrier) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Carrier is required',
            code: 'MISSING_REQUIRED_FIELDS'
          }
        });
      }

      // Get carrier credentials (optional for this endpoint)
      const carrierCredentials = req.user?.carrierCredentials || {};
      const credentials = carrierCredentials[carrier] || {};

      // Get carrier services
      const services = shippingFactory.getCarrierServices(carrier, credentials);

      res.json({
        success: true,
        data: services,
        message: 'Carrier services retrieved successfully'
      });
    } catch (error) {
      logger.error(`Failed to get carrier services: ${error.message}`, { error });
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to retrieve carrier services',
          code: 'SERVICES_FETCH_ERROR'
        }
      });
    }
  }

  /**
   * Validate carrier credentials
   */
  async validateCredentials(req, res) {
    try {
      const { carrier, credentials } = req.body;
      
      // Validate required fields
      if (!carrier || !credentials) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Carrier and credentials are required',
            code: 'MISSING_REQUIRED_FIELDS'
          }
        });
      }

      // Validate credentials
      const result = await shippingFactory.validateCredentials(carrier, credentials);

      res.json({
        success: result.success,
        data: result,
        message: result.message
      });
    } catch (error) {
      logger.error(`Failed to validate credentials: ${error.message}`, { error });
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to validate credentials',
          code: 'CREDENTIAL_VALIDATION_ERROR'
        }
      });
    }
  }

  /**
   * Get shipping service cache stats
   */
  async getCacheStats(req, res) {
    try {
      const stats = shippingFactory.getCacheStats();
      
      res.json({
        success: true,
        data: stats,
        message: 'Cache statistics retrieved successfully'
      });
    } catch (error) {
      logger.error(`Failed to get cache stats: ${error.message}`, { error });
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to retrieve cache statistics',
          code: 'CACHE_STATS_ERROR'
        }
      });
    }
  }

  /**
   * Clear shipping service cache
   */
  async clearCache(req, res) {
    try {
      const { carrier } = req.params;
      
      shippingFactory.clearCache(carrier);
      
      res.json({
        success: true,
        message: carrier ? 
          `Cache cleared for carrier: ${carrier}` : 
          'All shipping service cache cleared'
      });
    } catch (error) {
      logger.error(`Failed to clear cache: ${error.message}`, { error });
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to clear cache',
          code: 'CACHE_CLEAR_ERROR'
        }
      });
    }
  }
}

module.exports = new ShippingController();