/**
 * PTT Kargo Shipping Service
 * Integration with PTT (Turkish Postal Service) API for Turkish domestic shipping
 */

const BaseShippingService = require("./BaseShippingService");
const axios = require("axios");

class PTTKargoService extends BaseShippingService {
  constructor(credentials = {}) {
    super("PTT Kargo", credentials);
    this.apiUrl = "https://api.ptt.gov.tr/kargo";
    this.testApiUrl = "https://testapi.ptt.gov.tr/kargo";
    this.isTestMode = credentials.testMode || false;
  }

  /**
   * Initialize the PTT Kargo service
   */
  async initialize() {
    if (!this.credentials.apiKey || !this.credentials.customerCode) {
      throw new Error(
        "PTT Kargo credentials (apiKey, customerCode) are required"
      );
    }

    const baseURL = this.isTestMode ? this.testApiUrl : this.apiUrl;

    this.axiosInstance = axios.create({
      baseURL,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-API-Key": this.credentials.apiKey,
        "X-Customer-Code": this.credentials.customerCode,
      },
      timeout: 30000,
    });

    // Add response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        this.logger.error(`PTT Kargo API error: ${error.message}`, {
          status: error.response?.status,
          data: error.response?.data,
        });
        return Promise.reject(error);
      }
    );

    this.logger.info("PTT Kargo service initialized successfully");
  }

  /**
   * Get shipping rates from PTT Kargo
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
        return this.createErrorResponse(
          "Invalid origin postal code",
          "INVALID_POSTAL_CODE"
        );
      }

      if (!this.validateTurkishPostalCode(toFormatted.postalCode)) {
        return this.createErrorResponse(
          "Invalid destination postal code",
          "INVALID_POSTAL_CODE"
        );
      }

      const weight = this.getBillableWeight(packageInfo, 5000); // PTT uses 5000 cm³/kg

      const requestData = {
        originPostalCode: fromFormatted.postalCode,
        destinationPostalCode: toFormatted.postalCode,
        weight: Math.ceil(weight / 1000), // Convert to kg and round up
        length: packageInfo.dimensions?.length || 10,
        width: packageInfo.dimensions?.width || 10,
        height: packageInfo.dimensions?.height || 10,
        serviceType: this.mapServiceType(packageInfo.serviceType || "STANDARD"),
        paymentType: packageInfo.paymentType || "PREPAID",
        declaredValue: packageInfo.declaredValue || 0,
      };

      const response = await this.retryRequest(() =>
        this.axiosInstance.post("/v1/rates/calculate", requestData)
      );

      if (!response.data || !response.data.success) {
        return this.createErrorResponse(
          response.data?.message || "Failed to get shipping rates",
          "RATE_CALCULATION_FAILED"
        );
      }

      const rates = response.data.rates.map((rate) => ({
        serviceCode: rate.serviceCode,
        serviceName: rate.serviceName,
        price: parseFloat(rate.totalPrice),
        currency: "TRY",
        estimatedDeliveryDays: rate.estimatedDeliveryTime,
        features: rate.includedServices || ["Tracking"],
        restrictions: rate.restrictions || [],
      }));

      return this.createSuccessResponse(
        rates,
        "Shipping rates calculated successfully"
      );
    } catch (error) {
      this.logger.error(
        `Failed to get PTT Kargo shipping rates: ${error.message}`,
        { error }
      );
      return this.createErrorResponse(
        `Failed to calculate shipping rates: ${error.message}`,
        "RATE_CALCULATION_ERROR"
      );
    }
  }

  /**
   * Create shipping label with PTT Kargo
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
      if (
        !toFormatted.phone ||
        !this.validateTurkishPhoneNumber(toFormatted.phone)
      ) {
        return this.createErrorResponse(
          "Valid Turkish phone number is required",
          "INVALID_PHONE"
        );
      }

      const weight = this.getBillableWeight(packageInfo, 5000);

      const labelRequest = {
        // Service information
        serviceType: this.mapServiceType(packageInfo.serviceType || "STANDARD"),
        paymentType: packageInfo.paymentType || "PREPAID",
        deliveryType: "STANDARD",

        // Sender information
        sender: {
          name: fromFormatted.name,
          address: fromFormatted.address1,
          city: fromFormatted.city,
          district: fromFormatted.district,
          postalCode: fromFormatted.postalCode,
          phone: fromFormatted.phone,
          email: fromFormatted.email,
          taxNumber: this.credentials.taxNumber || "",
        },

        // Receiver information
        receiver: {
          name: toFormatted.name,
          address: toFormatted.address1,
          city: toFormatted.city,
          district: toFormatted.district,
          postalCode: toFormatted.postalCode,
          phone: toFormatted.phone,
          email: toFormatted.email,
          idNumber: packageInfo.receiverIdNumber || "",
        },

        // Package information
        package: {
          weight: Math.ceil(weight / 1000),
          dimensions: {
            length: packageInfo.dimensions?.length || 10,
            width: packageInfo.dimensions?.width || 10,
            height: packageInfo.dimensions?.height || 10,
          },
          content: packageInfo.description || "E-commerce order",
          quantity: packageInfo.quantity || 1,
          declaredValue: packageInfo.declaredValue || 0,
          currency: "TRY",
        },

        // Additional options
        options: {
          smsNotification: true,
          emailNotification: true,
          insurance: packageInfo.insurance || false,
          returnReceipt: packageInfo.returnReceipt || false,
        },

        // Reference information
        customerReference: orderInfo?.orderNumber || "",
        description: packageInfo.description || "E-commerce shipment",
      };

      const response = await this.retryRequest(() =>
        this.axiosInstance.post("/v1/shipments/create", labelRequest)
      );

      if (!response.data || !response.data.success) {
        return this.createErrorResponse(
          response.data?.message || "Failed to create shipping label",
          "LABEL_CREATION_FAILED"
        );
      }

      const shipmentResult = response.data.shipment;

      const result = {
        trackingNumber: shipmentResult.trackingNumber,
        labelUrl: shipmentResult.labelUrl,
        shipmentId: shipmentResult.shipmentId,
        estimatedDeliveryDate: shipmentResult.estimatedDeliveryDate,
        totalCost: shipmentResult.totalCost,
        currency: "TRY",
        serviceType: labelRequest.serviceType,
        labelFormat: "PDF",
        postOfficeCode: shipmentResult.postOfficeCode,
      };

      return this.createSuccessResponse(
        result,
        "Shipping label created successfully"
      );
    } catch (error) {
      this.logger.error(
        `Failed to create PTT Kargo shipping label: ${error.message}`,
        { error }
      );
      return this.createErrorResponse(
        `Failed to create shipping label: ${error.message}`,
        "LABEL_CREATION_ERROR"
      );
    }
  }

  /**
   * Track package with PTT Kargo
   * @param {string} trackingNumber - Tracking number
   * @returns {Promise<Object>} Tracking information
   */
  async trackPackage(trackingNumber) {
    try {
      if (!this.axiosInstance) {
        await this.initialize();
      }

      if (!trackingNumber) {
        return this.createErrorResponse(
          "Tracking number is required",
          "MISSING_TRACKING_NUMBER"
        );
      }

      const response = await this.retryRequest(() =>
        this.axiosInstance.get(`/v1/tracking/${trackingNumber}`)
      );

      if (!response.data || !response.data.success) {
        return this.createErrorResponse(
          response.data?.message || "Tracking information not found",
          "TRACKING_NOT_FOUND"
        );
      }

      const trackingData = response.data.tracking;

      const result = {
        trackingNumber,
        status: this.mapTrackingStatus(trackingData.currentStatus),
        statusDescription: trackingData.statusDescription,
        estimatedDeliveryDate: trackingData.estimatedDeliveryDate,
        actualDeliveryDate: trackingData.deliveryDate,
        currentLocation: {
          postOffice: trackingData.currentPostOffice,
          city: trackingData.currentCity,
          code: trackingData.currentLocationCode,
        },
        events:
          trackingData.trackingEvents?.map((event) => ({
            date: event.eventDate,
            time: event.eventTime,
            status: event.statusCode,
            description: event.statusDescription,
            location: event.location,
            postOffice: event.postOfficeName,
          })) || [],
      };

      return this.createSuccessResponse(
        result,
        "Tracking information retrieved successfully"
      );
    } catch (error) {
      this.logger.error(`Failed to track PTT Kargo package: ${error.message}`, {
        error,
      });
      return this.createErrorResponse(
        `Failed to track package: ${error.message}`,
        "TRACKING_ERROR"
      );
    }
  }

  /**
   * Cancel shipment with PTT Kargo
   * @param {string} trackingNumber - Tracking number
   * @returns {Promise<Object>} Cancellation result
   */
  async cancelShipment(trackingNumber) {
    try {
      if (!this.axiosInstance) {
        await this.initialize();
      }

      if (!trackingNumber) {
        return this.createErrorResponse(
          "Tracking number is required",
          "MISSING_TRACKING_NUMBER"
        );
      }

      const response = await this.retryRequest(() =>
        this.axiosInstance.post(`/v1/shipments/${trackingNumber}/cancel`, {
          reason: "Customer request",
          notes: "Shipment cancelled by customer",
        })
      );

      if (!response.data || !response.data.success) {
        return this.createErrorResponse(
          response.data?.message || "Failed to cancel shipment",
          "CANCELLATION_FAILED"
        );
      }

      const result = {
        trackingNumber,
        cancelled: true,
        cancellationDate: response.data.cancellationDate,
        refundAmount: response.data.refundAmount || 0,
        refundCurrency: "TRY",
        refundMethod: response.data.refundMethod || "ORIGINAL_PAYMENT",
      };

      return this.createSuccessResponse(
        result,
        "Shipment cancelled successfully"
      );
    } catch (error) {
      this.logger.error(
        `Failed to cancel PTT Kargo shipment: ${error.message}`,
        { error }
      );
      return this.createErrorResponse(
        `Failed to cancel shipment: ${error.message}`,
        "CANCELLATION_ERROR"
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
        code: "STANDARD",
        name: "Standart Posta",
        description: "Standard postal service",
        estimatedDays: "2-5",
      },
      {
        code: "EXPRESS",
        name: "Hızlı Posta",
        description: "Express postal service",
        estimatedDays: "1-3",
      },
      {
        code: "PRIORITY",
        name: "Öncelikli Posta",
        description: "Priority postal service",
        estimatedDays: "1-2",
      },
      {
        code: "COD",
        name: "Kapıda Ödeme",
        description: "Cash on delivery service",
        estimatedDays: "2-5",
      },
      {
        code: "INSURED",
        name: "Güvenceli Posta",
        description: "Insured postal service",
        estimatedDays: "2-4",
      },
    ];
  }

  /**
   * Map service type to PTT Kargo format
   * @param {string} serviceType - Service type
   * @returns {string} PTT service type code
   */
  mapServiceType(serviceType) {
    const serviceMap = {
      STANDARD: "STANDARD",
      EXPRESS: "EXPRESS",
      PRIORITY: "PRIORITY",
      COD: "COD",
      INSURED: "INSURED",
    };
    return serviceMap[serviceType?.toUpperCase()] || "STANDARD";
  }

  /**
   * Map PTT Kargo tracking status to standard status
   * @param {string} pttStatus - PTT status
   * @returns {string} Standard tracking status
   */
  mapTrackingStatus(pttStatus) {
    const statusMap = {
      POSTED: "created",
      IN_TRANSIT: "in_transit",
      ARRIVED_AT_POST_OFFICE: "in_transit",
      OUT_FOR_DELIVERY: "out_for_delivery",
      DELIVERED: "delivered",
      DELIVERY_ATTEMPTED: "delivery_attempted",
      RETURNED_TO_SENDER: "returned",
      CANCELLED: "cancelled",
      ON_HOLD: "on_hold",
      CUSTOMS_CLEARANCE: "in_transit",
    };

    return statusMap[pttStatus?.toUpperCase()] || "unknown";
  }

  /**
   * Get delivery areas served by PTT Kargo
   * @returns {Array} List of served areas
   */
  getDeliveryAreas() {
    // PTT serves all of Turkey
    return [
      "İstanbul",
      "Ankara",
      "İzmir",
      "Bursa",
      "Antalya",
      "Adana",
      "Konya",
      "Gaziantep",
      "Mersin",
      "Diyarbakır",
      "Kayseri",
      "Eskişehir",
      "Şanlıurfa",
      "Malatya",
      "Erzurum",
      "Trabzon",
      "Denizli",
      "Ordu",
      "Balıkesir",
      "Manisa",
      "Samsun",
      "Kahramanmaraş",
      "Van",
      "Aydın",
      "Hatay",
      "Sakarya",
      "Tekirdağ",
      "Muğla",
      "Kocaeli",
      "Mardin",
      "Afyon",
      "Elazığ",
      "Batman",
      "Uşak",
      // PTT serves all 81 provinces in Turkey
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
        return this.createErrorResponse(
          "Invalid postal code",
          "INVALID_POSTAL_CODE"
        );
      }

      const response = await this.retryRequest(() =>
        this.axiosInstance.get("/v1/delivery/availability", {
          params: {
            postalCode: formattedAddress.postalCode,
            city: formattedAddress.city,
            district: formattedAddress.district,
          },
        })
      );

      if (!response.data || !response.data.success) {
        return this.createErrorResponse(
          "Delivery availability check failed",
          "AVAILABILITY_CHECK_FAILED"
        );
      }

      const result = {
        available: response.data.data?.available !== false, // PTT serves most areas
        serviceTypes:
          response.data.data?.availableServices || this.getSupportedServices(),
        estimatedDeliveryDays: response.data.data?.deliveryTime || "2-5",
        restrictions: response.data.data?.restrictions || [],
        nearestPostOffice: response.data.data?.nearestPostOffice || {},
      };

      return this.createSuccessResponse(
        result,
        "Delivery availability checked successfully"
      );
    } catch (error) {
      this.logger.error(
        `Failed to check PTT Kargo delivery availability: ${error.message}`,
        { error }
      );
      return this.createErrorResponse(
        `Failed to check delivery availability: ${error.message}`,
        "AVAILABILITY_CHECK_ERROR"
      );
    }
  }

  /**
   * Get post office information
   * @param {string} postalCode - Postal code
   * @returns {Promise<Object>} Post office information
   */
  async getPostOfficeInfo(postalCode) {
    try {
      if (!this.axiosInstance) {
        await this.initialize();
      }

      if (!this.validateTurkishPostalCode(postalCode)) {
        return this.createErrorResponse(
          "Invalid postal code",
          "INVALID_POSTAL_CODE"
        );
      }

      const response = await this.retryRequest(() =>
        this.axiosInstance.get(`/v1/post-offices/by-postal-code/${postalCode}`)
      );

      if (!response.data || !response.data.success) {
        return this.createErrorResponse(
          "Post office information not found",
          "POST_OFFICE_NOT_FOUND"
        );
      }

      const postOffice = response.data.postOffice;

      const result = {
        code: postOffice.code,
        name: postOffice.name,
        address: postOffice.address,
        city: postOffice.city,
        district: postOffice.district,
        postalCode: postOffice.postalCode,
        phone: postOffice.phone,
        workingHours: postOffice.workingHours,
        services: postOffice.availableServices || [],
      };

      return this.createSuccessResponse(
        result,
        "Post office information retrieved successfully"
      );
    } catch (error) {
      this.logger.error(
        `Failed to get PTT post office info: ${error.message}`,
        { error }
      );
      return this.createErrorResponse(
        `Failed to get post office information: ${error.message}`,
        "POST_OFFICE_INFO_ERROR"
      );
    }
  }
}

module.exports = PTTKargoService;
