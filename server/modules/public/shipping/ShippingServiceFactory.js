/**
 * Shipping Service Factory
 * Central factory for managing all Turkish shipping carrier services
 */

const ArasKargoService = require('./ArasKargoService');
const YurticiKargoService = require('./YurticiKargoService');
const PTTKargoService = require('./PTTKargoService');
const logger = require('../../../utils/logger');

class ShippingServiceFactory {
  constructor() {
    this.services = new Map();
    this.supportedCarriers = [
      'aras',
      'yurtici',
      'ptt'
    ];
  }

  /**
   * Get a shipping service instance for a specific carrier
   * @param {string} carrierCode - Carrier code (aras, yurtici, ptt)
   * @param {Object} credentials - Carrier credentials
   * @returns {Object} Shipping service instance
   */
  getService(carrierCode, credentials = {}) {
    const normalizedCode = carrierCode.toLowerCase();
    
    if (!this.supportedCarriers.includes(normalizedCode)) {
      throw new Error(`Unsupported carrier: ${carrierCode}. Supported carriers: ${this.supportedCarriers.join(', ')}`);
    }

    // Create a unique key for the service instance
    const serviceKey = `${normalizedCode}_${JSON.stringify(credentials)}`;
    
    // Return existing instance if available
    if (this.services.has(serviceKey)) {
      return this.services.get(serviceKey);
    }

    // Create new service instance
    let service;
    switch (normalizedCode) {
      case 'aras':
        service = new ArasKargoService(credentials);
        break;
      case 'yurtici':
        service = new YurticiKargoService(credentials);
        break;
      case 'ptt':
        service = new PTTKargoService(credentials);
        break;
      default:
        throw new Error(`Service implementation not found for carrier: ${carrierCode}`);
    }

    // Cache the service instance
    this.services.set(serviceKey, service);
    
    logger.info(`Created new shipping service instance for carrier: ${carrierCode}`);
    return service;
  }

  /**
   * Get all supported carriers with their information
   * @returns {Array} List of supported carriers
   */
  getSupportedCarriers() {
    return [
      {
        code: 'aras',
        name: 'Aras Kargo',
        description: 'Leading Turkish cargo company with nationwide coverage',
        website: 'https://www.araskargo.com.tr',
        features: ['Tracking', 'COD', 'Express Delivery', 'Same Day (limited cities)'],
        coverage: 'Turkey (all provinces)',
        estimatedDeliveryDays: '1-3',
        credentialsRequired: ['username', 'password']
      },
      {
        code: 'yurtici',
        name: 'Yurtiçi Kargo',
        description: 'Major Turkish logistics company with comprehensive services',
        website: 'https://www.yurticikargo.com',
        features: ['Tracking', 'COD', 'Express', 'Economy', 'Insurance'],
        coverage: 'Turkey (all provinces)',
        estimatedDeliveryDays: '1-4',
        credentialsRequired: ['wsUserName', 'wsPassword', 'customerCode']
      },
      {
        code: 'ptt',
        name: 'PTT Kargo',
        description: 'Turkish Postal Service - national postal carrier',
        website: 'https://www.ptt.gov.tr',
        features: ['Tracking', 'COD', 'Insurance', 'Priority Mail', 'Express'],
        coverage: 'Turkey (all provinces and rural areas)',
        estimatedDeliveryDays: '1-5',
        credentialsRequired: ['apiKey', 'customerCode']
      }
    ];
  }

  /**
   * Compare shipping rates across multiple carriers
   * @param {Object} packageInfo - Package details
   * @param {Object} fromAddress - Origin address
   * @param {Object} toAddress - Destination address
   * @param {Object} carrierCredentials - Credentials for each carrier
   * @param {Array} carrierCodes - Specific carriers to compare (optional)
   * @returns {Promise<Object>} Comparison results
   */
  async compareRates(packageInfo, fromAddress, toAddress, carrierCredentials, carrierCodes = null) {
    const carriersToCompare = carrierCodes || this.supportedCarriers;
    const results = {
      success: true,
      timestamp: new Date().toISOString(),
      packageInfo,
      fromAddress,
      toAddress,
      carriers: [],
      errors: []
    };

    const ratePromises = carriersToCompare.map(async (carrierCode) => {
      try {
        const credentials = carrierCredentials[carrierCode];
        if (!credentials) {
          return {
            carrier: carrierCode,
            error: 'No credentials provided for this carrier'
          };
        }

        const service = this.getService(carrierCode, credentials);
        const rateResponse = await service.getShippingRates(packageInfo, fromAddress, toAddress);
        
        return {
          carrier: carrierCode,
          carrierName: service.carrierName,
          success: rateResponse.success,
          rates: rateResponse.success ? rateResponse.data : [],
          error: rateResponse.success ? null : rateResponse.error?.message
        };
      } catch (error) {
        logger.error(`Failed to get rates from ${carrierCode}: ${error.message}`, { error });
        return {
          carrier: carrierCode,
          error: error.message
        };
      }
    });

    const carrierResults = await Promise.all(ratePromises);
    
    // Separate successful results from errors
    carrierResults.forEach(result => {
      if (result.success) {
        results.carriers.push(result);
      } else {
        results.errors.push(result);
      }
    });

    // Sort carriers by cheapest rate
    results.carriers.sort((a, b) => {
      const aLowestRate = Math.min(...a.rates.map(rate => rate.price));
      const bLowestRate = Math.min(...b.rates.map(rate => rate.price));
      return aLowestRate - bLowestRate;
    });

    // Add summary statistics
    if (results.carriers.length > 0) {
      const allRates = results.carriers.flatMap(carrier => carrier.rates);
      results.summary = {
        totalCarriers: results.carriers.length,
        totalRates: allRates.length,
        lowestPrice: Math.min(...allRates.map(rate => rate.price)),
        highestPrice: Math.max(...allRates.map(rate => rate.price)),
        averagePrice: allRates.reduce((sum, rate) => sum + rate.price, 0) / allRates.length,
        currency: allRates[0]?.currency || 'TRY'
      };
    }

    return results;
  }

  /**
   * Create shipping labels from multiple carriers
   * @param {Object} shipmentData - Shipment information
   * @param {Object} carrierCredentials - Credentials for each carrier
   * @param {string} preferredCarrier - Preferred carrier code
   * @returns {Promise<Object>} Label creation result
   */
  async createShippingLabel(shipmentData, carrierCredentials, preferredCarrier) {
    try {
      if (!carrierCredentials[preferredCarrier]) {
        throw new Error(`No credentials provided for preferred carrier: ${preferredCarrier}`);
      }

      const service = this.getService(preferredCarrier, carrierCredentials[preferredCarrier]);
      const result = await service.createShippingLabel(shipmentData);
      
      return {
        ...result,
        carrier: preferredCarrier,
        carrierName: service.carrierName
      };
    } catch (error) {
      logger.error(`Failed to create shipping label with ${preferredCarrier}: ${error.message}`, { error });
      throw error;
    }
  }

  /**
   * Track package across multiple carriers
   * @param {string} trackingNumber - Tracking number
   * @param {string} carrierCode - Carrier code
   * @param {Object} credentials - Carrier credentials
   * @returns {Promise<Object>} Tracking information
   */
  async trackPackage(trackingNumber, carrierCode, credentials) {
    try {
      const service = this.getService(carrierCode, credentials);
      const result = await service.trackPackage(trackingNumber);
      
      return {
        ...result,
        carrier: carrierCode,
        carrierName: service.carrierName
      };
    } catch (error) {
      logger.error(`Failed to track package with ${carrierCode}: ${error.message}`, { error });
      throw error;
    }
  }

  /**
   * Cancel shipment with specific carrier
   * @param {string} trackingNumber - Tracking number
   * @param {string} carrierCode - Carrier code
   * @param {Object} credentials - Carrier credentials
   * @returns {Promise<Object>} Cancellation result
   */
  async cancelShipment(trackingNumber, carrierCode, credentials) {
    try {
      const service = this.getService(carrierCode, credentials);
      const result = await service.cancelShipment(trackingNumber);
      
      return {
        ...result,
        carrier: carrierCode,
        carrierName: service.carrierName
      };
    } catch (error) {
      logger.error(`Failed to cancel shipment with ${carrierCode}: ${error.message}`, { error });
      throw error;
    }
  }

  /**
   * Check delivery availability across carriers
   * @param {Object} address - Delivery address
   * @param {Object} carrierCredentials - Credentials for each carrier
   * @param {Array} carrierCodes - Specific carriers to check (optional)
   * @returns {Promise<Object>} Availability results
   */
  async checkDeliveryAvailability(address, carrierCredentials, carrierCodes = null) {
    const carriersToCheck = carrierCodes || this.supportedCarriers;
    const results = {
      success: true,
      timestamp: new Date().toISOString(),
      address,
      carriers: [],
      errors: []
    };

    const availabilityPromises = carriersToCheck.map(async (carrierCode) => {
      try {
        const credentials = carrierCredentials[carrierCode];
        if (!credentials) {
          return {
            carrier: carrierCode,
            error: 'No credentials provided for this carrier'
          };
        }

        const service = this.getService(carrierCode, credentials);
        const availabilityResponse = await service.checkDeliveryAvailability(address);
        
        return {
          carrier: carrierCode,
          carrierName: service.carrierName,
          success: availabilityResponse.success,
          availability: availabilityResponse.success ? availabilityResponse.data : null,
          error: availabilityResponse.success ? null : availabilityResponse.error?.message
        };
      } catch (error) {
        logger.error(`Failed to check availability with ${carrierCode}: ${error.message}`, { error });
        return {
          carrier: carrierCode,
          error: error.message
        };
      }
    });

    const carrierResults = await Promise.all(availabilityPromises);
    
    // Separate successful results from errors
    carrierResults.forEach(result => {
      if (result.success) {
        results.carriers.push(result);
      } else {
        results.errors.push(result);
      }
    });

    return results;
  }

  /**
   * Get service types supported by a specific carrier
   * @param {string} carrierCode - Carrier code
   * @param {Object} credentials - Carrier credentials (optional)
   * @returns {Array} Supported service types
   */
  getCarrierServices(carrierCode, credentials = {}) {
    const service = this.getService(carrierCode, credentials);
    return service.getSupportedServices();
  }

  /**
   * Validate carrier credentials
   * @param {string} carrierCode - Carrier code
   * @param {Object} credentials - Credentials to validate
   * @returns {Promise<Object>} Validation result
   */
  async validateCredentials(carrierCode, credentials) {
    try {
      const service = this.getService(carrierCode, credentials);
      await service.initialize();
      
      // Test with a simple operation if available
      if (typeof service.testConnection === 'function') {
        const testResult = await service.testConnection();
        return {
          success: testResult.success,
          message: testResult.message || 'Credentials validated successfully',
          carrier: carrierCode
        };
      }
      
      return {
        success: true,
        message: 'Credentials validated successfully',
        carrier: carrierCode
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        carrier: carrierCode
      };
    }
  }

  /**
   * Clear cached service instances
   * @param {string} carrierCode - Specific carrier to clear (optional)
   */
  clearCache(carrierCode = null) {
    if (carrierCode) {
      // Clear specific carrier instances
      const keysToDelete = Array.from(this.services.keys()).filter(key => 
        key.startsWith(carrierCode.toLowerCase())
      );
      keysToDelete.forEach(key => this.services.delete(key));
      logger.info(`Cleared cache for carrier: ${carrierCode}`);
    } else {
      // Clear all cached instances
      this.services.clear();
      logger.info('Cleared all shipping service cache');
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache information
   */
  getCacheStats() {
    const stats = {
      totalCachedServices: this.services.size,
      carriers: {}
    };

    this.supportedCarriers.forEach(carrier => {
      const carrierServices = Array.from(this.services.keys()).filter(key => 
        key.startsWith(carrier)
      );
      stats.carriers[carrier] = carrierServices.length;
    });

    return stats;
  }
}

// Export singleton instance
module.exports = new ShippingServiceFactory();