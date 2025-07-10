/**
 * Base Shipping Service
 * Abstract base class for all shipping carrier integrations
 */

const axios = require('axios');
const logger = require('../../../utils/logger');

class BaseShippingService {
  constructor(carrierName, credentials = {}) {
    this.carrierName = carrierName;
    this.credentials = credentials;
    this.axiosInstance = null;
    this.logger = logger;
  }

  /**
   * Initialize the shipping service
   * Must be implemented by subclasses
   */
  async initialize() {
    throw new Error('initialize() method must be implemented by subclass');
  }

  /**
   * Get shipping rates for a package
   * @param {Object} packageInfo - Package details
   * @param {Object} fromAddress - Origin address
   * @param {Object} toAddress - Destination address
   * @returns {Promise<Object>} Shipping rates and options
   */
  async getShippingRates(packageInfo, fromAddress, toAddress) {
    throw new Error('getShippingRates() method must be implemented by subclass');
  }

  /**
   * Create a shipping label
   * @param {Object} shipmentData - Shipment information
   * @returns {Promise<Object>} Label URL and tracking number
   */
  async createShippingLabel(shipmentData) {
    throw new Error('createShippingLabel() method must be implemented by subclass');
  }

  /**
   * Track a package
   * @param {string} trackingNumber - Tracking number
   * @returns {Promise<Object>} Tracking information
   */
  async trackPackage(trackingNumber) {
    throw new Error('trackPackage() method must be implemented by subclass');
  }

  /**
   * Cancel a shipment
   * @param {string} trackingNumber - Tracking number
   * @returns {Promise<Object>} Cancellation result
   */
  async cancelShipment(trackingNumber) {
    throw new Error('cancelShipment() method must be implemented by subclass');
  }

  /**
   * Get supported service types for this carrier
   * @returns {Array} List of supported services
   */
  getSupportedServices() {
    return [];
  }

  /**
   * Validate Turkish postal code
   * @param {string} postalCode - Postal code to validate
   * @returns {boolean} Whether postal code is valid
   */
  validateTurkishPostalCode(postalCode) {
    // Turkish postal codes are 5 digits
    const turkishPostalRegex = /^[0-9]{5}$/;
    return turkishPostalRegex.test(postalCode);
  }

  /**
   * Validate Turkish phone number
   * @param {string} phoneNumber - Phone number to validate
   * @returns {boolean} Whether phone number is valid
   */
  validateTurkishPhoneNumber(phoneNumber) {
    // Turkish mobile: +90 5XX XXX XX XX or 05XX XXX XX XX
    // Turkish landline: +90 2XX XXX XX XX or 02XX XXX XX XX
    const turkishPhoneRegex = /^(\+90|90|0)?(5[0-9]{2}|2[1-9][0-9]|3[1-9][0-9]|4[1-9][0-9])[0-9]{7}$/;
    return turkishPhoneRegex.test(phoneNumber.replace(/[\s\-\(\)]/g, ''));
  }

  /**
   * Format Turkish address for shipping
   * @param {Object} address - Address object
   * @returns {Object} Formatted address
   */
  formatTurkishAddress(address) {
    return {
      name: address.name || '',
      address1: address.address1 || address.address || '',
      address2: address.address2 || '',
      district: address.district || address.state || '',
      city: address.city || '',
      postalCode: address.postalCode || '',
      country: 'Turkey',
      countryCode: 'TR',
      phone: address.phone || '',
      email: address.email || ''
    };
  }

  /**
   * Retry mechanism for API requests
   * @param {Function} requestFn - Function that makes the API request
   * @param {number} maxRetries - Maximum number of retries
   * @param {number} delay - Delay between retries in milliseconds
   * @returns {Promise<any>} API response
   */
  async retryRequest(requestFn, maxRetries = 3, delay = 1000) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries) {
          break;
        }
        
        // Don't retry for client errors (4xx)
        if (error.response && error.response.status >= 400 && error.response.status < 500) {
          break;
        }
        
        this.logger.warn(`Shipping API request failed (attempt ${attempt}/${maxRetries}): ${error.message}`);
        
        // Exponential backoff
        const waitTime = delay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    throw lastError;
  }

  /**
   * Calculate package weight in grams
   * @param {Object} packageInfo - Package information
   * @returns {number} Weight in grams
   */
  calculatePackageWeight(packageInfo) {
    const weight = packageInfo.weight || 0;
    const unit = packageInfo.weightUnit || 'g';
    
    switch (unit.toLowerCase()) {
    case 'kg':
      return weight * 1000;
    case 'lb':
      return weight * 453.592;
    case 'oz':
      return weight * 28.3495;
    default:
      return weight; // Assume grams
    }
  }

  /**
   * Calculate dimensional weight
   * @param {Object} dimensions - Package dimensions
   * @param {number} divisor - Dimensional weight divisor (varies by carrier)
   * @returns {number} Dimensional weight in grams
   */
  calculateDimensionalWeight(dimensions, divisor = 5000) {
    const { length = 0, width = 0, height = 0, unit = 'cm' } = dimensions;
    
    let volumeCm3;
    switch (unit.toLowerCase()) {
    case 'in':
      volumeCm3 = length * width * height * 16.387; // Convert cubic inches to cm³
      break;
    case 'm':
      volumeCm3 = length * width * height * 1000000; // Convert cubic meters to cm³
      break;
    default:
      volumeCm3 = length * width * height; // Assume cm³
    }
    
    return Math.ceil(volumeCm3 / divisor);
  }

  /**
   * Get billable weight (higher of actual vs dimensional weight)
   * @param {Object} packageInfo - Package information
   * @param {number} dimensionalDivisor - Carrier's dimensional weight divisor
   * @returns {number} Billable weight in grams
   */
  getBillableWeight(packageInfo, dimensionalDivisor = 5000) {
    const actualWeight = this.calculatePackageWeight(packageInfo);
    const dimensionalWeight = this.calculateDimensionalWeight(packageInfo.dimensions || {}, dimensionalDivisor);
    
    return Math.max(actualWeight, dimensionalWeight);
  }

  /**
   * Convert Turkish city names to standard format
   * @param {string} cityName - City name
   * @returns {string} Standardized city name
   */
  standardizeTurkishCityName(cityName) {
    const cityMappings = {
      'istanbul': 'İstanbul',
      'ankara': 'Ankara',
      'izmir': 'İzmir',
      'bursa': 'Bursa',
      'antalya': 'Antalya',
      'adana': 'Adana',
      'konya': 'Konya',
      'gaziantep': 'Gaziantep',
      'mersin': 'Mersin',
      'diyarbakir': 'Diyarbakır',
      'kayseri': 'Kayseri',
      'eskisehir': 'Eskişehir',
      'urfa': 'Şanlıurfa',
      'malatya': 'Malatya',
      'erzurum': 'Erzurum',
      'trabzon': 'Trabzon',
      'denizli': 'Denizli',
      'ordu': 'Ordu',
      'balikesir': 'Balıkesir',
      'manisa': 'Manisa'
    };
    
    const normalized = cityName.toLowerCase().trim();
    return cityMappings[normalized] || cityName;
  }

  /**
   * Standard error response format
   * @param {string} message - Error message
   * @param {string} code - Error code
   * @param {any} details - Additional error details
   * @returns {Object} Formatted error response
   */
  createErrorResponse(message, code = 'SHIPPING_ERROR', details = null) {
    return {
      success: false,
      error: {
        message,
        code,
        details,
        carrier: this.carrierName,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Standard success response format
   * @param {any} data - Response data
   * @param {string} message - Success message
   * @returns {Object} Formatted success response
   */
  createSuccessResponse(data, message = 'Operation completed successfully') {
    return {
      success: true,
      message,
      data,
      carrier: this.carrierName,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = BaseShippingService;