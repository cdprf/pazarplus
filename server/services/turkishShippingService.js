/**
 * DEPRECATED: Turkish Shipping Service
 *
 * This monolithic shipping service has been replaced by a modern modular architecture:
 * - /modules/public/shipping/ShippingServiceFactory.js - Main factory
 * - /modules/public/shipping/BaseShippingService.js - Base class
 * - /modules/public/shipping/ArasKargoService.js - Aras Kargo implementation
 * - /modules/public/shipping/YurticiKargoService.js - Yurtiçi Kargo implementation
 * - /modules/public/shipping/PTTKargoService.js - PTT Kargo implementation
 *
 * The new architecture provides:
 * - Better separation of concerns
 * - Individual carrier implementations
 * - Factory pattern for service creation
 * - Standardized API across all carriers
 * - Better error handling and logging
 *
 * Migration Guide:
 * - Replace: const turkishShipping = require('./services/turkishShippingService')
 * - With: const shippingFactory = require('./modules/public/shipping/ShippingServiceFactory')
 *
 * TODO: Remove this file after all references have been migrated
 */

console.warn(
  "⚠️  DEPRECATED: turkishShippingService.js is deprecated. Use ShippingServiceFactory instead."
);

const axios = require("axios");
const { ShippingCarrier, ShippingRate, Order } = require("../../models");
const logger = require("../../utils/logger");

/**
 * Turkish Shipping Service
 * Handles integration with major Turkish shipping carriers
 */
class TurkishShippingService {
  constructor() {
    this.carriers = new Map();
    this.initializeCarriers();
  }

  /**
   * Initialize supported Turkish carriers
   */
  initializeCarriers() {
    // Aras Kargo
    this.carriers.set("ARAS", {
      name: "Aras Kargo",
      apiEndpoint: "https://api.araskargo.com.tr",
      trackingUrl: "https://www.araskargo.com.tr/takip?k={trackingNumber}",
      codSupported: true,
      maxWeight: 30,
      services: ["STANDARD", "EXPRESS"],
    });

    // Yurtiçi Kargo
    this.carriers.set("YURTICI", {
      name: "Yurtiçi Kargo",
      apiEndpoint: "https://api.yurticikargo.com",
      trackingUrl:
        "https://www.yurticikargo.com/tr/takip?code={trackingNumber}",
      codSupported: true,
      maxWeight: 50,
      services: ["STANDARD", "EXPRESS", "NEXT_DAY"],
    });

    // PTT Kargo
    this.carriers.set("PTT", {
      name: "PTT Kargo",
      apiEndpoint: "https://api.ptt.gov.tr/kargo",
      trackingUrl: "https://gonderitakip.ptt.gov.tr/Track?q={trackingNumber}",
      codSupported: true,
      maxWeight: 25,
      services: ["STANDARD", "EXPRESS"],
    });

    // UPS Turkey
    this.carriers.set("UPS", {
      name: "UPS Turkey",
      apiEndpoint: "https://api.ups.com/track/v1",
      trackingUrl:
        "https://www.ups.com/track?loc=tr_TR&tracknum={trackingNumber}",
      codSupported: false,
      maxWeight: 70,
      services: ["STANDARD", "EXPRESS", "NEXT_DAY"],
    });

    // MNG Kargo
    this.carriers.set("MNG", {
      name: "MNG Kargo",
      apiEndpoint: "https://api.mngkargo.com.tr",
      trackingUrl:
        "https://www.mngkargo.com.tr/track?trackingNumber={trackingNumber}",
      codSupported: true,
      maxWeight: 40,
      services: ["STANDARD", "EXPRESS"],
    });
  }

  /**
   * Get shipping rates for an order from all available carriers
   * @param {Object} orderDetails - Order shipping details
   * @param {Object} options - Additional options
   * @returns {Promise<Array>} Array of shipping rates
   */
  async getShippingRates(orderDetails, options = {}) {
    try {
      const {
        fromCity,
        fromPostalCode,
        toCity,
        toPostalCode,
        weight,
        dimensions,
        cashOnDelivery = false,
        insurance = false,
        declaredValue = 0,
      } = orderDetails;

      const rates = [];
      const activeCarriers = await ShippingCarrier.findAll({
        where: { isActive: true, carrierType: "TURKISH_DOMESTIC" },
      });

      for (const carrier of activeCarriers) {
        try {
          const carrierRates = await this.getCarrierRates(carrier, {
            fromCity,
            fromPostalCode,
            toCity,
            toPostalCode,
            weight,
            dimensions,
            cashOnDelivery,
            insurance,
            declaredValue,
          });

          rates.push(...carrierRates);
        } catch (error) {
          logger.warn(
            `Failed to get rates from ${carrier.name}: ${error.message}`,
            {
              carrierId: carrier.id,
              error: error.message,
            }
          );
        }
      }

      // Sort by total price
      rates.sort((a, b) => a.totalPrice - b.totalPrice);

      return rates;
    } catch (error) {
      logger.error("Failed to get shipping rates:", error);
      throw error;
    }
  }

  /**
   * Get rates from a specific carrier
   * @param {Object} carrier - Carrier model instance
   * @param {Object} shipmentDetails - Shipment details
   * @returns {Promise<Array>} Array of rates for this carrier
   */
  async getCarrierRates(carrier, shipmentDetails) {
    const carrierConfig = this.carriers.get(carrier.code);
    if (!carrierConfig) {
      throw new Error(`Unsupported carrier: ${carrier.code}`);
    }

    switch (carrier.code) {
      case "ARAS":
        return this.getArasRates(carrier, shipmentDetails);
      case "YURTICI":
        return this.getYurticiRates(carrier, shipmentDetails);
      case "PTT":
        return this.getPTTRates(carrier, shipmentDetails);
      case "UPS":
        return this.getUPSRates(carrier, shipmentDetails);
      case "MNG":
        return this.getMNGRates(carrier, shipmentDetails);
      default:
        return this.getGenericRates(carrier, shipmentDetails);
    }
  }

  /**
   * Get Aras Kargo rates
   */
  async getArasRates(carrier, details) {
    try {
      const credentials = this.decryptCredentials(carrier.credentials);

      const response = await axios.post(
        `${carrier.apiEndpoint}/api/rate-calculator`,
        {
          origin: {
            city: details.fromCity,
            postalCode: details.fromPostalCode,
          },
          destination: {
            city: details.toCity,
            postalCode: details.toPostalCode,
          },
          package: {
            weight: details.weight,
            dimensions: details.dimensions,
          },
          services: {
            codEnabled: details.cashOnDelivery,
            insuranceEnabled: details.insurance,
            declaredValue: details.declaredValue,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${credentials.apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      return this.processArasResponse(carrier, response.data, details);
    } catch (error) {
      // Fallback to standard Turkish shipping rates
      return this.getFallbackRates(carrier, details);
    }
  }

  /**
   * Get Yurtiçi Kargo rates
   */
  async getYurticiRates(carrier, details) {
    try {
      const credentials = this.decryptCredentials(carrier.credentials);

      const response = await axios.get(
        `${carrier.apiEndpoint}/api/price-calculation`,
        {
          params: {
            fromCity: details.fromCity,
            toCity: details.toCity,
            weight: details.weight,
            cod: details.cashOnDelivery,
            insurance: details.insurance,
          },
          headers: {
            "X-API-Key": credentials.apiKey,
            "X-Customer-Number": credentials.customerNumber,
          },
        }
      );

      return this.processYurticiResponse(carrier, response.data, details);
    } catch (error) {
      return this.getFallbackRates(carrier, details);
    }
  }

  /**
   * Get PTT Kargo rates
   */
  async getPTTRates(carrier, details) {
    try {
      const credentials = this.decryptCredentials(carrier.credentials);

      const response = await axios.post(
        `${carrier.apiEndpoint}/calculate-shipping`,
        {
          fromCity: details.fromCity,
          toCity: details.toCity,
          weight: details.weight,
          codService: details.cashOnDelivery,
          insuranceService: details.insurance,
          declaredValue: details.declaredValue,
        },
        {
          headers: {
            Authorization: credentials.apiKey,
            "Content-Type": "application/json",
          },
        }
      );

      return this.processPTTResponse(carrier, response.data, details);
    } catch (error) {
      return this.getFallbackRates(carrier, details);
    }
  }

  /**
   * Get UPS Turkey rates
   */
  async getUPSRates(carrier, details) {
    try {
      const credentials = this.decryptCredentials(carrier.credentials);

      const response = await axios.post(
        `${carrier.apiEndpoint}/rating`,
        {
          RateRequest: {
            Shipment: {
              Shipper: {
                Address: {
                  City: details.fromCity,
                  PostalCode: details.fromPostalCode,
                  CountryCode: "TR",
                },
              },
              ShipTo: {
                Address: {
                  City: details.toCity,
                  PostalCode: details.toPostalCode,
                  CountryCode: "TR",
                },
              },
              Package: {
                PackagingType: { Code: "02" },
                PackageWeight: {
                  UnitOfMeasurement: { Code: "KGS" },
                  Weight: details.weight.toString(),
                },
              },
            },
          },
        },
        {
          headers: {
            Authorization: `Bearer ${credentials.accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      return this.processUPSResponse(carrier, response.data, details);
    } catch (error) {
      return this.getFallbackRates(carrier, details);
    }
  }

  /**
   * Get MNG Kargo rates
   */
  async getMNGRates(carrier, details) {
    try {
      const credentials = this.decryptCredentials(carrier.credentials);

      const response = await axios.post(
        `${carrier.apiEndpoint}/api/shipping-cost`,
        {
          senderCity: details.fromCity,
          receiverCity: details.toCity,
          weight: details.weight,
          codAmount: details.cashOnDelivery ? details.declaredValue : 0,
          insurance: details.insurance,
        },
        {
          headers: {
            "X-API-Key": credentials.apiKey,
            "X-Username": credentials.username,
          },
        }
      );

      return this.processMNGResponse(carrier, response.data, details);
    } catch (error) {
      return this.getFallbackRates(carrier, details);
    }
  }

  /**
   * Fallback rates calculation for Turkish domestic shipping
   */
  getFallbackRates(carrier, details) {
    const carrierConfig = this.carriers.get(carrier.code);
    const rates = [];

    // Standard Turkish shipping rates (approximation)
    const baseRate = this.calculateBaseRate(
      details.weight,
      details.fromCity,
      details.toCity
    );
    const kdvRate = 0.18; // 18% KDV for Turkey

    // Standard service
    const standardPrice = baseRate;
    const standardTax = standardPrice * kdvRate;
    const standardTotal = standardPrice + standardTax;

    rates.push({
      carrierId: carrier.id,
      serviceType: "STANDARD",
      fromCity: details.fromCity,
      fromPostalCode: details.fromPostalCode,
      toCity: details.toCity,
      toPostalCode: details.toPostalCode,
      weight: details.weight,
      dimensions: details.dimensions,
      basePrice: standardPrice,
      taxAmount: standardTax,
      totalPrice: standardTotal,
      currency: "TRY",
      deliveryTime: "2-4 iş günü",
      cashOnDelivery: details.cashOnDelivery,
      codFee: details.cashOnDelivery ? 5.0 : 0,
      insurance: details.insurance,
      insuranceFee: details.insurance ? details.declaredValue * 0.002 : 0,
      rateValidUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      calculatedAt: new Date(),
    });

    // Express service if supported
    if (carrierConfig.services.includes("EXPRESS")) {
      const expressPrice = baseRate * 1.5;
      const expressTax = expressPrice * kdvRate;
      const expressTotal = expressPrice + expressTax;

      rates.push({
        carrierId: carrier.id,
        serviceType: "EXPRESS",
        fromCity: details.fromCity,
        fromPostalCode: details.fromPostalCode,
        toCity: details.toCity,
        toPostalCode: details.toPostalCode,
        weight: details.weight,
        dimensions: details.dimensions,
        basePrice: expressPrice,
        taxAmount: expressTax,
        totalPrice: expressTotal,
        currency: "TRY",
        deliveryTime: "1-2 iş günü",
        cashOnDelivery: details.cashOnDelivery,
        codFee: details.cashOnDelivery ? 5.0 : 0,
        insurance: details.insurance,
        insuranceFee: details.insurance ? details.declaredValue * 0.002 : 0,
        rateValidUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
        calculatedAt: new Date(),
      });
    }

    return rates;
  }

  /**
   * Calculate base shipping rate for Turkish domestic shipping
   */
  calculateBaseRate(weight, fromCity, toCity) {
    // Base rate calculation for Turkish domestic shipping
    let baseRate = 15; // Minimum rate in TRY

    // Weight-based pricing
    if (weight <= 1) {
      baseRate = 15;
    } else if (weight <= 3) {
      baseRate = 20;
    } else if (weight <= 5) {
      baseRate = 25;
    } else if (weight <= 10) {
      baseRate = 35;
    } else {
      baseRate = 35 + (weight - 10) * 3;
    }

    // Distance-based adjustment (simplified)
    const majorCities = [
      "İstanbul",
      "Ankara",
      "İzmir",
      "Bursa",
      "Antalya",
      "Adana",
    ];
    const fromMajor = majorCities.includes(fromCity);
    const toMajor = majorCities.includes(toCity);

    if (!fromMajor || !toMajor) {
      baseRate *= 1.2; // 20% increase for non-major cities
    }

    return Math.round(baseRate * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Create shipment with selected carrier
   */
  async createShipment(orderId, carrierId, serviceType, options = {}) {
    try {
      const order = await Order.findByPk(orderId, {
        include: ["shippingDetail", "shippingRates"],
      });

      if (!order) {
        throw new Error("Order not found");
      }

      const carrier = await ShippingCarrier.findByPk(carrierId);
      if (!carrier) {
        throw new Error("Carrier not found");
      }

      const selectedRate = await ShippingRate.findOne({
        where: {
          orderId,
          carrierId,
          serviceType,
        },
      });

      if (!selectedRate) {
        throw new Error("Shipping rate not found");
      }

      // Mark the selected rate
      await ShippingRate.update({ isSelected: false }, { where: { orderId } });

      await selectedRate.update({ isSelected: true });

      // Create shipment based on carrier
      const shipmentResult = await this.createCarrierShipment(
        carrier,
        order,
        selectedRate,
        options
      );

      // Update shipping detail with tracking info
      if (shipmentResult.success && shipmentResult.trackingNumber) {
        await order.shippingDetail.update({
          carrierId,
          trackingNumber: shipmentResult.trackingNumber,
          trackingUrl: this.generateTrackingUrl(
            carrier,
            shipmentResult.trackingNumber
          ),
          status: "shipped",
        });

        await order.update({
          status: "shipped",
          lastSyncedAt: new Date(),
        });
      }

      return shipmentResult;
    } catch (error) {
      logger.error("Failed to create shipment:", error);
      throw error;
    }
  }

  /**
   * Generate tracking URL for carrier
   */
  generateTrackingUrl(carrier, trackingNumber) {
    const carrierConfig = this.carriers.get(carrier.code);
    if (!carrierConfig || !carrierConfig.trackingUrl) {
      return null;
    }

    return carrierConfig.trackingUrl.replace(
      "{trackingNumber}",
      trackingNumber
    );
  }

  /**
   * Decrypt carrier credentials
   */
  decryptCredentials(encryptedCredentials) {
    // Implement your decryption logic here
    // For now, assuming credentials are stored as JSON
    if (typeof encryptedCredentials === "string") {
      return JSON.parse(encryptedCredentials);
    }
    return encryptedCredentials || {};
  }

  /**
   * Create carrier-specific shipment
   */
  async createCarrierShipment(carrier, order, rate, options) {
    // Implementation would vary by carrier
    // For now, return a mock successful response
    return {
      success: true,
      trackingNumber: this.generateTrackingNumber(carrier.code),
      shipmentId: `${carrier.code}_${Date.now()}`,
      message: `Shipment created successfully with ${carrier.name}`,
    };
  }

  /**
   * Generate tracking number
   */
  generateTrackingNumber(carrierCode) {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${carrierCode}${timestamp.slice(-8)}${random}`;
  }

  // Carrier-specific response processors
  processArasResponse(carrier, data, details) {
    // Process Aras Kargo API response
    return this.getFallbackRates(carrier, details);
  }

  processYurticiResponse(carrier, data, details) {
    // Process Yurtiçi Kargo API response
    return this.getFallbackRates(carrier, details);
  }

  processPTTResponse(carrier, data, details) {
    // Process PTT Kargo API response
    return this.getFallbackRates(carrier, details);
  }

  processUPSResponse(carrier, data, details) {
    // Process UPS API response
    return this.getFallbackRates(carrier, details);
  }

  processMNGResponse(carrier, data, details) {
    // Process MNG Kargo API response
    return this.getFallbackRates(carrier, details);
  }

  /**
   * Track shipment
   */
  async trackShipment(trackingNumber, carrierCode) {
    try {
      const carrier = await ShippingCarrier.findOne({
        where: { code: carrierCode, isActive: true },
      });

      if (!carrier) {
        throw new Error("Carrier not found");
      }

      // Implementation would vary by carrier API
      return {
        trackingNumber,
        status: "in_transit",
        lastUpdate: new Date(),
        events: [
          {
            date: new Date(),
            status: "shipped",
            location: "Depo",
            description: "Kargo depodan çıktı",
          },
        ],
      };
    } catch (error) {
      logger.error("Failed to track shipment:", error);
      throw error;
    }
  }
}

module.exports = TurkishShippingService;
