/**
 * Yurtiçi Kargo Shipping Service
 * Integration with Yurtiçi Kargo API for Turkish domestic shipping
 */

const BaseShippingService = require("./BaseShippingService");
const axios = require("axios");

class YurticiKargoService extends BaseShippingService {
  constructor(credentials = {}) {
    super("Yurtiçi Kargo", credentials);
    this.apiUrl = "https://api.yurticikargo.com";
    this.testApiUrl = "https://testapi.yurticikargo.com";
    this.isTestMode = credentials.testMode || false;
  }

  /**
   * Initialize the Yurtiçi Kargo service
   */
  async initialize() {
    if (
      !this.credentials.wsUserName ||
      !this.credentials.wsPassword ||
      !this.credentials.customerCode
    ) {
      throw new Error(
        "Yurtiçi Kargo credentials (wsUserName, wsPassword, customerCode) are required"
      );
    }

    const baseURL = this.isTestMode ? this.testApiUrl : this.apiUrl;

    this.axiosInstance = axios.create({
      baseURL,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      timeout: 30000,
    });

    // Add request interceptor for authentication
    this.axiosInstance.interceptors.request.use(async (config) => {
      config.headers["wsUserName"] = this.credentials.wsUserName;
      config.headers["wsPassword"] = this.credentials.wsPassword;
      config.headers["customerCode"] = this.credentials.customerCode;
      return config;
    });

    // Add response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        this.logger.error(`Yurtiçi Kargo API error: ${error.message}`, {
          status: error.response?.status,
          data: error.response?.data,
        });
        return Promise.reject(error);
      }
    );

    this.logger.info("Yurtiçi Kargo service initialized successfully");
  }

  /**
   * Get shipping rates from Yurtiçi Kargo
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

      const weight = this.getBillableWeight(packageInfo, 6000); // Yurtiçi uses 6000 cm³/kg

      const requestData = {
        senderCityCode: await this.getCityCode(fromFormatted.city),
        receiverCityCode: await this.getCityCode(toFormatted.city),
        senderDistrictId: await this.getDistrictId(
          fromFormatted.city,
          fromFormatted.district
        ),
        receiverDistrictId: await this.getDistrictId(
          toFormatted.city,
          toFormatted.district
        ),
        cargoType: this.mapCargoType(packageInfo.type || "PACKAGE"),
        kg: Math.ceil(weight / 1000), // Convert to kg and round up
        desi: Math.ceil(weight / 1000), // Yurtiçi uses kg for both weight and desi
        cargoValue: packageInfo.declaredValue || 0,
        paymentType: packageInfo.paymentType === "COD" ? 2 : 1, // 1: Sender pays, 2: Receiver pays
        serviceType: this.mapServiceType(packageInfo.serviceType || "STANDARD"),
      };

      const response = await this.retryRequest(() =>
        this.axiosInstance.post("/api/ShipmentPrice/GetPrice", requestData)
      );

      if (!response.data || !response.data.isSuccess) {
        return this.createErrorResponse(
          response.data?.errorMessage || "Failed to get shipping rates",
          "RATE_CALCULATION_FAILED"
        );
      }

      const priceData = response.data.data;
      const rates = [
        {
          serviceCode: requestData.serviceType.toString(),
          serviceName: this.getServiceName(requestData.serviceType),
          price: parseFloat(priceData.unitPrice || 0),
          currency: "TRY",
          estimatedDeliveryDays: priceData.deliveryTime || "1-3",
          features: ["Tracking", "Insurance"],
          restrictions: priceData.restrictions || [],
        },
      ];

      return this.createSuccessResponse(
        rates,
        "Shipping rates calculated successfully"
      );
    } catch (error) {
      this.logger.error(
        `Failed to get Yurtiçi Kargo shipping rates: ${error.message}`,
        { error }
      );
      return this.createErrorResponse(
        `Failed to calculate shipping rates: ${error.message}`,
        "RATE_CALCULATION_ERROR"
      );
    }
  }

  /**
   * Create shipping label with Yurtiçi Kargo
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

      const weight = this.getBillableWeight(packageInfo, 6000);

      const labelRequest = {
        // Cargo information
        cargoKey: Math.random().toString(36).substring(2, 15), // Unique cargo key
        cargoType: this.mapCargoType(packageInfo.type || "PACKAGE"),
        kg: Math.ceil(weight / 1000),
        desi: Math.ceil(weight / 1000),
        cargoValue: packageInfo.declaredValue || 0,
        cargoContent: packageInfo.description || "E-commerce order",

        // Sender information
        senderCityCode: await this.getCityCode(fromFormatted.city),
        senderDistrictId: await this.getDistrictId(
          fromFormatted.city,
          fromFormatted.district
        ),
        senderName: fromFormatted.name,
        senderAddress: fromFormatted.address1,
        senderPhone: fromFormatted.phone,
        senderEmail: fromFormatted.email,

        // Receiver information
        receiverCityCode: await this.getCityCode(toFormatted.city),
        receiverDistrictId: await this.getDistrictId(
          toFormatted.city,
          toFormatted.district
        ),
        receiverName: toFormatted.name,
        receiverAddress: toFormatted.address1,
        receiverPhone: toFormatted.phone,
        receiverEmail: toFormatted.email,
        receiverTcNo: packageInfo.receiverTcNo || "", // Turkish ID number if required

        // Service options
        paymentType: packageInfo.paymentType === "COD" ? 2 : 1,
        serviceType: this.mapServiceType(packageInfo.serviceType || "STANDARD"),
        deliveryType: 1, // 1: Normal, 2: Express

        // Additional options
        isSms: true, // Send SMS notifications
        isEmail: true, // Send email notifications
        customerReferenceNo: orderInfo?.orderNumber || "",

        // COD specific fields
        codAmount:
          packageInfo.paymentType === "COD" ? packageInfo.codAmount : 0,
        codType: packageInfo.paymentType === "COD" ? 1 : 0, // 1: Cash, 2: Check
      };

      const response = await this.retryRequest(() =>
        this.axiosInstance.post("/api/ShipmentAcceptance/Run", labelRequest)
      );

      if (!response.data || !response.data.isSuccess) {
        return this.createErrorResponse(
          response.data?.errorMessage || "Failed to create shipping label",
          "LABEL_CREATION_FAILED"
        );
      }

      const shipmentData = response.data.data;

      const result = {
        trackingNumber: shipmentData.cargoKey,
        labelUrl: shipmentData.labelUrl,
        shipmentId: shipmentData.shipmentId,
        estimatedDeliveryDate: shipmentData.estimatedDeliveryDate,
        totalCost: shipmentData.unitPrice,
        currency: "TRY",
        serviceType: labelRequest.serviceType,
        labelFormat: "PDF",
        barcodeNumber: shipmentData.barcodeNumber,
      };

      return this.createSuccessResponse(
        result,
        "Shipping label created successfully"
      );
    } catch (error) {
      this.logger.error(
        `Failed to create Yurtiçi Kargo shipping label: ${error.message}`,
        { error }
      );
      return this.createErrorResponse(
        `Failed to create shipping label: ${error.message}`,
        "LABEL_CREATION_ERROR"
      );
    }
  }

  /**
   * Track package with Yurtiçi Kargo
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
        this.axiosInstance.post("/api/ShipmentTracking/GetTrackingByCargoKey", {
          cargoKey: trackingNumber,
        })
      );

      if (!response.data || !response.data.isSuccess) {
        return this.createErrorResponse(
          response.data?.errorMessage || "Tracking information not found",
          "TRACKING_NOT_FOUND"
        );
      }

      const trackingData = response.data.data;

      const result = {
        trackingNumber,
        status: this.mapTrackingStatus(trackingData.lastStatus),
        statusDescription: trackingData.lastStatusDescription,
        estimatedDeliveryDate: trackingData.estimatedDeliveryDate,
        actualDeliveryDate: trackingData.deliveryDate,
        currentLocation: {
          city: trackingData.currentCity,
          facility: trackingData.currentBranch,
        },
        events:
          trackingData.movements?.map((movement) => ({
            date: movement.date,
            time: movement.time,
            status: movement.status,
            description: movement.description,
            location: movement.unitName,
            explanation: movement.explanation,
          })) || [],
      };

      return this.createSuccessResponse(
        result,
        "Tracking information retrieved successfully"
      );
    } catch (error) {
      this.logger.error(
        `Failed to track Yurtiçi Kargo package: ${error.message}`,
        { error }
      );
      return this.createErrorResponse(
        `Failed to track package: ${error.message}`,
        "TRACKING_ERROR"
      );
    }
  }

  /**
   * Cancel shipment with Yurtiçi Kargo
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
        this.axiosInstance.post("/api/ShipmentCancellation/Cancel", {
          cargoKey: trackingNumber,
          cancelReason: "Customer request",
        })
      );

      if (!response.data || !response.data.isSuccess) {
        return this.createErrorResponse(
          response.data?.errorMessage || "Failed to cancel shipment",
          "CANCELLATION_FAILED"
        );
      }

      const result = {
        trackingNumber,
        cancelled: true,
        cancellationDate: new Date().toISOString(),
        refundAmount: response.data.data?.refundAmount || 0,
        refundCurrency: "TRY",
      };

      return this.createSuccessResponse(
        result,
        "Shipment cancelled successfully"
      );
    } catch (error) {
      this.logger.error(
        `Failed to cancel Yurtiçi Kargo shipment: ${error.message}`,
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
        code: "1",
        name: "Standart",
        description: "Standard delivery service",
        estimatedDays: "1-3",
      },
      {
        code: "2",
        name: "Ekonomik",
        description: "Economy delivery service",
        estimatedDays: "2-4",
      },
      {
        code: "3",
        name: "Express",
        description: "Express delivery service",
        estimatedDays: "1-2",
      },
      {
        code: "4",
        name: "Kapıda Ödeme",
        description: "Cash on delivery service",
        estimatedDays: "1-3",
      },
    ];
  }

  /**
   * Map cargo type to Yurtiçi Kargo format
   * @param {string} type - Package type
   * @returns {number} Yurtiçi cargo type code
   */
  mapCargoType(type) {
    const typeMap = {
      PACKAGE: 1,
      DOCUMENT: 2,
      VALUABLE: 3,
      FRAGILE: 4,
    };
    return typeMap[type?.toUpperCase()] || 1;
  }

  /**
   * Map service type to Yurtiçi Kargo format
   * @param {string} serviceType - Service type
   * @returns {number} Yurtiçi service type code
   */
  mapServiceType(serviceType) {
    const serviceMap = {
      STANDARD: 1,
      ECONOMY: 2,
      EXPRESS: 3,
      COD: 4,
    };
    return serviceMap[serviceType?.toUpperCase()] || 1;
  }

  /**
   * Get service name from service type code
   * @param {number} serviceType - Service type code
   * @returns {string} Service name
   */
  getServiceName(serviceType) {
    const serviceNames = {
      1: "Standart",
      2: "Ekonomik",
      3: "Express",
      4: "Kapıda Ödeme",
    };
    return serviceNames[serviceType] || "Standart";
  }

  /**
   * Map Yurtiçi Kargo tracking status to standard status
   * @param {string} yurticiStatus - Yurtiçi status
   * @returns {string} Standard tracking status
   */
  mapTrackingStatus(yurticiStatus) {
    const statusMap = {
      CARGO_RECEIVED: "created",
      IN_TRANSIT: "in_transit",
      OUT_FOR_DELIVERY: "out_for_delivery",
      DELIVERED: "delivered",
      DELIVERY_FAILED: "delivery_failed",
      RETURNED: "returned",
      CANCELLED: "cancelled",
      ON_HOLD: "on_hold",
      PROCESSING: "in_transit",
    };

    return statusMap[yurticiStatus?.toUpperCase()] || "unknown";
  }

  /**
   * Get city code for Yurtiçi Kargo API
   * @param {string} cityName - City name
   * @returns {Promise<number>} City code
   */
  async getCityCode(cityName) {
    // This would typically call the Yurtiçi API to get city codes
    // For now, return mock data based on major Turkish cities
    const cityCodeMap = {
      İstanbul: 34,
      Ankara: 6,
      İzmir: 35,
      Bursa: 16,
      Antalya: 7,
      Adana: 1,
      Konya: 42,
      Gaziantep: 27,
      Mersin: 33,
      Diyarbakır: 21,
      Kayseri: 38,
      Eskişehir: 26,
    };

    return cityCodeMap[cityName] || 34; // Default to Istanbul
  }

  /**
   * Get district ID for Yurtiçi Kargo API
   * @param {string} cityName - City name
   * @param {string} districtName - District name
   * @returns {Promise<number>} District ID
   */
  async getDistrictId(cityName, districtName) {
    // This would typically call the Yurtiçi API to get district IDs
    // For now, return a mock ID
    return 1;
  }

  /**
   * Get delivery areas served by Yurtiçi Kargo
   * @returns {Array} List of served cities/regions
   */
  getDeliveryAreas() {
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

      const cityCode = await this.getCityCode(formattedAddress.city);
      const districtId = await this.getDistrictId(
        formattedAddress.city,
        formattedAddress.district
      );

      const response = await this.retryRequest(() =>
        this.axiosInstance.post("/api/ServiceAvailability/Check", {
          cityCode,
          districtId,
        })
      );

      if (!response.data || !response.data.isSuccess) {
        return this.createErrorResponse(
          "Delivery availability check failed",
          "AVAILABILITY_CHECK_FAILED"
        );
      }

      const result = {
        available: response.data.data?.isAvailable || true,
        serviceTypes:
          response.data.data?.availableServices || this.getSupportedServices(),
        estimatedDeliveryDays: response.data.data?.deliveryTime || "1-3",
        restrictions: response.data.data?.restrictions || [],
      };

      return this.createSuccessResponse(
        result,
        "Delivery availability checked successfully"
      );
    } catch (error) {
      this.logger.error(
        `Failed to check Yurtiçi Kargo delivery availability: ${error.message}`,
        { error }
      );
      return this.createErrorResponse(
        `Failed to check delivery availability: ${error.message}`,
        "AVAILABILITY_CHECK_ERROR"
      );
    }
  }

  /**
   * Format Turkish address for API compatibility
   * @param {Object} address - Raw address object
   * @returns {Object} Formatted address
   */
  formatTurkishAddress(address) {
    return {
      name: address.name || "",
      address1: address.address1 || address.address || "",
      city: address.city || "",
      district: address.district || "",
      postalCode: address.postalCode || address.zipCode || "",
      phone: address.phone || "",
      email: address.email || "",
    };
  }

  /**
   * Validate Turkish postal code format
   * @param {string} postalCode - Postal code to validate
   * @returns {boolean} Is valid
   */
  validateTurkishPostalCode(postalCode) {
    // Turkish postal codes are 5 digits
    return /^\d{5}$/.test(postalCode);
  }

  /**
   * Validate Turkish phone number format
   * @param {string} phone - Phone number to validate
   * @returns {boolean} Is valid
   */
  validateTurkishPhoneNumber(phone) {
    // Turkish mobile: +90 5XX XXX XX XX or 05XX XXX XX XX
    const cleanPhone = phone.replace(/\s+/g, "").replace(/\+90/, "");
    return /^5\d{9}$/.test(cleanPhone);
  }
}

module.exports = YurticiKargoService;
