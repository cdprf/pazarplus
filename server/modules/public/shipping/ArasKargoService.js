/**
 * Aras Kargo Shipping Service
 * Integration with Aras Kargo API for Turkish domestic shipping
 */

const BaseShippingService = require('../BaseShippingService');
const axios = require('axios');

class ArasKargoService extends BaseShippingService {
  constructor(credentials = {}) {
    super('Aras Kargo', credentials);
    this.apiUrl = 'https://api.araskargo.com.tr';
    this.testApiUrl = 'https://testapi.araskargo.com.tr';
    this.isTestMode = credentials.testMode || false;
  }

  /**
   * Initialize the Aras Kargo service
   */
  async initialize() {
    if (!this.credentials.username || !this.credentials.password) {
      throw new Error('Aras Kargo credentials (username, password) are required');
    }

    const baseURL = this.isTestMode ? this.testApiUrl : this.apiUrl;
    
    this.axiosInstance = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 30000
    });

    // Add request interceptor for authentication
    this.axiosInstance.interceptors.request.use(async (config) => {
      // Add basic auth headers
      const auth = Buffer.from(`${this.credentials.username}:${this.credentials.password}`).toString('base64');
      config.headers.Authorization = `Basic ${auth}`;
      return config;
    });

    // Add response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        this.logger.error(`Aras Kargo API error: ${error.message}`, {
          status: error.response?.status,
          data: error.response?.data
        });
        return Promise.reject(error);
      }
    );

    this.logger.info('Aras Kargo service initialized successfully');
  }

  /**
   * Get shipping rates from Aras Kargo
   * @param {Object} packageInfo - Package details
   * @param {Object} fromAddress - Origin address
   * @param {Object} toAddress - Destination address
   * @returns {Promise<Object>} Shipping rates
   */
  async getShippingRates(packageInfo, fromAddress, toAddress) {
    try {
      if (!this.axiosInstance) {
        await this.initialize();
      }

      const fromFormatted = this.formatTurkishAddress(fromAddress);
      const toFormatted = this.formatTurkishAddress(toAddress);

      // Validate addresses
      if (!this.validateTurkishPostalCode(fromFormatted.postalCode)) {
        return this.createErrorResponse('Invalid origin postal code', 'INVALID_POSTAL_CODE');
      }
      
      if (!this.validateTurkishPostalCode(toFormatted.postalCode)) {
        return this.createErrorResponse('Invalid destination postal code', 'INVALID_POSTAL_CODE');
      }

      const weight = this.getBillableWeight(packageInfo, 5000); // Aras uses 5000 cm³/kg

      const requestData = {
        fromCity: fromFormatted.city,
        fromDistrict: fromFormatted.district,
        fromPostalCode: fromFormatted.postalCode,
        toCity: toFormatted.city,
        toDistrict: toFormatted.district,
        toPostalCode: toFormatted.postalCode,
        weight: Math.ceil(weight / 1000), // Convert to kg and round up
        packageCount: packageInfo.quantity || 1,
        serviceType: packageInfo.serviceType || 'STANDARD',
        paymentType: packageInfo.paymentType || 'PREPAID' // PREPAID, COD
      };

      const response = await this.retryRequest(() =>
        this.axiosInstance.post('/api/v1/shipping/quote', requestData)
      );

      if (!response.data || !response.data.success) {
        return this.createErrorResponse(
          response.data?.message || 'Failed to get shipping rates',
          'RATE_CALCULATION_FAILED'
        );
      }

      const rates = response.data.rates.map(rate => ({
        serviceCode: rate.serviceCode,
        serviceName: rate.serviceName,
        price: parseFloat(rate.price),
        currency: 'TRY',
        estimatedDeliveryDays: rate.deliveryTime,
        features: rate.features || [],
        restrictions: rate.restrictions || []
      }));

      return this.createSuccessResponse(rates, 'Shipping rates calculated successfully');

    } catch (error) {
      this.logger.error(`Failed to get Aras Kargo shipping rates: ${error.message}`, { error });
      return this.createErrorResponse(
        `Failed to calculate shipping rates: ${error.message}`,
        'RATE_CALCULATION_ERROR'
      );
    }
  }

  /**
   * Create shipping label with Aras Kargo
   * @param {Object} shipmentData - Complete shipment information
   * @returns {Promise<Object>} Label and tracking info
   */
  async createShippingLabel(shipmentData) {
    try {
      if (!this.axiosInstance) {
        await this.initialize();
      }

      const { packageInfo, fromAddress, toAddress, orderInfo } = shipmentData;
      
      const fromFormatted = this.formatTurkishAddress(fromAddress);
      const toFormatted = this.formatTurkishAddress(toAddress);

      // Validate required fields
      if (!toFormatted.phone || !this.validateTurkishPhoneNumber(toFormatted.phone)) {
        return this.createErrorResponse('Valid Turkish phone number is required', 'INVALID_PHONE');
      }

      const weight = this.getBillableWeight(packageInfo, 5000);

      const labelRequest = {
        // Sender information
        senderInfo: {
          name: fromFormatted.name,
          address: fromFormatted.address1,
          city: fromFormatted.city,
          district: fromFormatted.district,
          postalCode: fromFormatted.postalCode,
          phone: fromFormatted.phone,
          email: fromFormatted.email
        },
        
        // Receiver information
        receiverInfo: {
          name: toFormatted.name,
          address: toFormatted.address1,
          city: toFormatted.city,
          district: toFormatted.district,
          postalCode: toFormatted.postalCode,
          phone: toFormatted.phone,
          email: toFormatted.email
        },
        
        // Package information
        packageInfo: {
          weight: Math.ceil(weight / 1000), // Convert to kg
          quantity: packageInfo.quantity || 1,
          content: packageInfo.description || 'E-commerce order',
          value: packageInfo.declaredValue || 0,
          currency: 'TRY'
        },
        
        // Service options
        serviceType: packageInfo.serviceType || 'STANDARD',
        paymentType: packageInfo.paymentType || 'PREPAID',
        deliveryType: packageInfo.deliveryType || 'DOOR_TO_DOOR',
        
        // Reference numbers
        customerReferenceNo: orderInfo?.orderNumber || '',
        customerBarcode: orderInfo?.customerBarcode || '',
        
        // Additional services
        additionalServices: packageInfo.additionalServices || []
      };

      const response = await this.retryRequest(() =>
        this.axiosInstance.post('/api/v1/shipping/create', labelRequest)
      );

      if (!response.data || !response.data.success) {
        return this.createErrorResponse(
          response.data?.message || 'Failed to create shipping label',
          'LABEL_CREATION_FAILED'
        );
      }

      const result = {
        trackingNumber: response.data.trackingNumber,
        labelUrl: response.data.labelUrl,
        shipmentId: response.data.shipmentId,
        estimatedDeliveryDate: response.data.estimatedDeliveryDate,
        totalCost: response.data.totalCost,
        currency: 'TRY',
        serviceType: response.data.serviceType,
        labelFormat: 'PDF'
      };

      return this.createSuccessResponse(result, 'Shipping label created successfully');

    } catch (error) {
      this.logger.error(`Failed to create Aras Kargo shipping label: ${error.message}`, { error });
      return this.createErrorResponse(
        `Failed to create shipping label: ${error.message}`,
        'LABEL_CREATION_ERROR'
      );
    }
  }

  /**
   * Track package with Aras Kargo
   * @param {string} trackingNumber - Tracking number
   * @returns {Promise<Object>} Tracking information
   */
  async trackPackage(trackingNumber) {
    try {
      if (!this.axiosInstance) {
        await this.initialize();
      }

      if (!trackingNumber) {
        return this.createErrorResponse('Tracking number is required', 'MISSING_TRACKING_NUMBER');
      }

      const response = await this.retryRequest(() =>
        this.axiosInstance.get(`/api/v1/tracking/${trackingNumber}`)
      );

      if (!response.data || !response.data.success) {
        return this.createErrorResponse(
          response.data?.message || 'Tracking information not found',
          'TRACKING_NOT_FOUND'
        );
      }

      const trackingInfo = response.data.tracking;
      
      const result = {
        trackingNumber,
        status: this.mapTrackingStatus(trackingInfo.status),
        statusDescription: trackingInfo.statusDescription,
        estimatedDeliveryDate: trackingInfo.estimatedDeliveryDate,
        actualDeliveryDate: trackingInfo.actualDeliveryDate,
        currentLocation: {
          city: trackingInfo.currentCity,
          facility: trackingInfo.currentFacility
        },
        events: trackingInfo.events.map(event => ({
          date: event.date,
          time: event.time,
          status: event.status,
          description: event.description,
          location: event.location
        }))
      };

      return this.createSuccessResponse(result, 'Tracking information retrieved successfully');

    } catch (error) {
      this.logger.error(`Failed to track Aras Kargo package: ${error.message}`, { error });
      return this.createErrorResponse(
        `Failed to track package: ${error.message}`,
        'TRACKING_ERROR'
      );
    }
  }

  /**
   * Cancel shipment with Aras Kargo
   * @param {string} trackingNumber - Tracking number
   * @returns {Promise<Object>} Cancellation result
   */
  async cancelShipment(trackingNumber) {
    try {
      if (!this.axiosInstance) {
        await this.initialize();
      }

      if (!trackingNumber) {
        return this.createErrorResponse('Tracking number is required', 'MISSING_TRACKING_NUMBER');
      }

      const response = await this.retryRequest(() =>
        this.axiosInstance.post(`/api/v1/shipping/${trackingNumber}/cancel`)
      );

      if (!response.data || !response.data.success) {
        return this.createErrorResponse(
          response.data?.message || 'Failed to cancel shipment',
          'CANCELLATION_FAILED'
        );
      }

      const result = {
        trackingNumber,
        cancelled: true,
        cancellationDate: response.data.cancellationDate,
        refundAmount: response.data.refundAmount,
        refundCurrency: 'TRY'
      };

      return this.createSuccessResponse(result, 'Shipment cancelled successfully');

    } catch (error) {
      this.logger.error(`Failed to cancel Aras Kargo shipment: ${error.message}`, { error });
      return this.createErrorResponse(
        `Failed to cancel shipment: ${error.message}`,
        'CANCELLATION_ERROR'
      );
    }
  }

  /**
   * Get supported service types
   * @returns {Array} List of supported services
   */
  getSupportedServices() {
    return [
      {
        code: 'STANDARD',
        name: 'Standart Teslimat',
        description: 'Normal delivery service',
        estimatedDays: '1-3'
      },
      {
        code: 'EXPRESS',
        name: 'Hızlı Teslimat',
        description: 'Express delivery service',
        estimatedDays: '1-2'
      },
      {
        code: 'SAME_DAY',
        name: 'Aynı Gün Teslimat',
        description: 'Same day delivery (limited cities)',
        estimatedDays: '0'
      },
      {
        code: 'COD',
        name: 'Kapıda Ödeme',
        description: 'Cash on delivery service',
        estimatedDays: '1-3'
      }
    ];
  }

  /**
   * Map Aras Kargo tracking status to standard status
   * @param {string} arasStatus - Aras Kargo status
   * @returns {string} Standard tracking status
   */
  mapTrackingStatus(arasStatus) {
    const statusMap = {
      'CREATED': 'created',
      'COLLECTED': 'in_transit',
      'IN_TRANSIT': 'in_transit',
      'OUT_FOR_DELIVERY': 'out_for_delivery',
      'DELIVERED': 'delivered',
      'FAILED_DELIVERY': 'delivery_failed',
      'RETURNED': 'returned',
      'CANCELLED': 'cancelled',
      'ON_HOLD': 'on_hold'
    };

    return statusMap[arasStatus?.toUpperCase()] || 'unknown';
  }

  /**
   * Get delivery areas served by Aras Kargo
   * @returns {Array} List of served cities/regions
   */
  getDeliveryAreas() {
    return [
      'İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya', 'Adana', 'Konya',
      'Gaziantep', 'Mersin', 'Diyarbakır', 'Kayseri', 'Eskişehir', 'Şanlıurfa',
      'Malatya', 'Erzurum', 'Trabzon', 'Denizli', 'Ordu', 'Balıkesir', 'Manisa'
      // Add more cities as needed
    ];
  }

  /**
   * Check if delivery is available to a specific address
   * @param {Object} address - Delivery address
   * @returns {Promise<Object>} Availability check result
   */
  async checkDeliveryAvailability(address) {
    try {
      if (!this.axiosInstance) {
        await this.initialize();
      }

      const formattedAddress = this.formatTurkishAddress(address);
      
      if (!this.validateTurkishPostalCode(formattedAddress.postalCode)) {
        return this.createErrorResponse('Invalid postal code', 'INVALID_POSTAL_CODE');
      }

      const response = await this.retryRequest(() =>
        this.axiosInstance.get('/api/v1/delivery/check', {
          params: {
            city: formattedAddress.city,
            district: formattedAddress.district,
            postalCode: formattedAddress.postalCode
          }
        })
      );

      if (!response.data || !response.data.success) {
        return this.createErrorResponse(
          'Delivery availability check failed',
          'AVAILABILITY_CHECK_FAILED'
        );
      }

      const result = {
        available: response.data.available,
        serviceTypes: response.data.serviceTypes || [],
        estimatedDeliveryDays: response.data.estimatedDeliveryDays,
        restrictions: response.data.restrictions || []
      };

      return this.createSuccessResponse(result, 'Delivery availability checked successfully');

    } catch (error) {
      this.logger.error(`Failed to check Aras Kargo delivery availability: ${error.message}`, { error });
      return this.createErrorResponse(
        `Failed to check delivery availability: ${error.message}`,
        'AVAILABILITY_CHECK_ERROR'
      );
    }
  }
}

module.exports = ArasKargoService;