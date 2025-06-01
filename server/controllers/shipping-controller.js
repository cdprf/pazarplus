/**
 * Shipping Controller
 * Handles shipping-related API endpoints for Turkish carriers
 */

const shippingFactory = require("../modules/public/shipping/ShippingServiceFactory");
const logger = require("../utils/logger");

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
        message: "Supported carriers retrieved successfully",
      });
    } catch (error) {
      logger.error(`Failed to get supported carriers: ${error.message}`, {
        error,
      });
      res.status(500).json({
        success: false,
        error: {
          message: "Failed to retrieve supported carriers",
          code: "CARRIERS_FETCH_ERROR",
        },
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
            message: "Package info, from address, and to address are required",
            code: "MISSING_REQUIRED_FIELDS",
          },
        });
      }

      // Get carrier credentials from user settings or request
      const carrierCredentials =
        req.user?.carrierCredentials || req.body.credentials || {};

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
        message: "Shipping rates calculated successfully",
      });
    } catch (error) {
      logger.error(`Failed to get shipping rates: ${error.message}`, { error });
      res.status(500).json({
        success: false,
        error: {
          message: "Failed to calculate shipping rates",
          code: "RATE_CALCULATION_ERROR",
        },
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
            message: "Shipment data and carrier are required",
            code: "MISSING_REQUIRED_FIELDS",
          },
        });
      }

      // Get carrier credentials
      const carrierCredentials =
        req.user?.carrierCredentials || req.body.credentials || {};

      if (!carrierCredentials[carrier]) {
        return res.status(400).json({
          success: false,
          error: {
            message: `No credentials found for carrier: ${carrier}`,
            code: "MISSING_CARRIER_CREDENTIALS",
          },
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
        message: "Shipping label created successfully",
      });
    } catch (error) {
      logger.error(`Failed to create shipping label: ${error.message}`, {
        error,
      });
      res.status(500).json({
        success: false,
        error: {
          message: "Failed to create shipping label",
          code: "LABEL_CREATION_ERROR",
        },
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
            message: "Tracking number and carrier are required",
            code: "MISSING_REQUIRED_FIELDS",
          },
        });
      }

      // Get carrier credentials
      const carrierCredentials =
        req.user?.carrierCredentials || req.query.credentials || {};

      if (!carrierCredentials[carrier]) {
        return res.status(400).json({
          success: false,
          error: {
            message: `No credentials found for carrier: ${carrier}`,
            code: "MISSING_CARRIER_CREDENTIALS",
          },
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
        message: "Package tracking retrieved successfully",
      });
    } catch (error) {
      logger.error(`Failed to track package: ${error.message}`, { error });
      res.status(500).json({
        success: false,
        error: {
          message: "Failed to track package",
          code: "TRACKING_ERROR",
        },
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
            message: "Tracking number and carrier are required",
            code: "MISSING_REQUIRED_FIELDS",
          },
        });
      }

      // Get carrier credentials
      const carrierCredentials =
        req.user?.carrierCredentials || req.body.credentials || {};

      if (!carrierCredentials[carrier]) {
        return res.status(400).json({
          success: false,
          error: {
            message: `No credentials found for carrier: ${carrier}`,
            code: "MISSING_CARRIER_CREDENTIALS",
          },
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
        message: "Shipment cancelled successfully",
      });
    } catch (error) {
      logger.error(`Failed to cancel shipment: ${error.message}`, { error });
      res.status(500).json({
        success: false,
        error: {
          message: "Failed to cancel shipment",
          code: "CANCELLATION_ERROR",
        },
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
            message: "Address is required",
            code: "MISSING_REQUIRED_FIELDS",
          },
        });
      }

      // Get carrier credentials
      const carrierCredentials =
        req.user?.carrierCredentials || req.body.credentials || {};

      // Check delivery availability
      const result = await shippingFactory.checkDeliveryAvailability(
        address,
        carrierCredentials,
        carriers
      );

      res.json({
        success: true,
        data: result,
        message: "Delivery availability checked successfully",
      });
    } catch (error) {
      logger.error(`Failed to check delivery availability: ${error.message}`, {
        error,
      });
      res.status(500).json({
        success: false,
        error: {
          message: "Failed to check delivery availability",
          code: "AVAILABILITY_CHECK_ERROR",
        },
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
            message: "Carrier is required",
            code: "MISSING_REQUIRED_FIELDS",
          },
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
        message: "Carrier services retrieved successfully",
      });
    } catch (error) {
      logger.error(`Failed to get carrier services: ${error.message}`, {
        error,
      });
      res.status(500).json({
        success: false,
        error: {
          message: "Failed to retrieve carrier services",
          code: "SERVICES_FETCH_ERROR",
        },
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
            message: "Carrier and credentials are required",
            code: "MISSING_REQUIRED_FIELDS",
          },
        });
      }

      // Validate credentials
      const result = await shippingFactory.validateCredentials(
        carrier,
        credentials
      );

      res.json({
        success: result.success,
        data: result,
        message: result.message,
      });
    } catch (error) {
      logger.error(`Failed to validate credentials: ${error.message}`, {
        error,
      });
      res.status(500).json({
        success: false,
        error: {
          message: "Failed to validate credentials",
          code: "CREDENTIAL_VALIDATION_ERROR",
        },
      });
    }
  }

  /**
   * Get shipments with filtering
   */
  async getShipments(req, res) {
    try {
      const { search, status, carrier } = req.query;

      // Mock shipments data - in a real app this would come from database
      const mockShipments = [
        {
          id: "SHP_001",
          trackingNumber: "ARAS123456789",
          carrier: "aras",
          carrierName: "Aras Kargo",
          status: "in_transit",
          orderNumber: "ORD-2025-001",
          recipientName: "Ahmet Yılmaz",
          recipientCity: "Ankara",
          createdAt: "2025-06-01T10:00:00Z",
          estimatedDelivery: "2025-06-03",
          cost: 25.5,
        },
        {
          id: "SHP_002",
          trackingNumber: "YK987654321",
          carrier: "yurtici",
          carrierName: "Yurtiçi Kargo",
          status: "delivered",
          orderNumber: "ORD-2025-002",
          recipientName: "Fatma Demir",
          recipientCity: "İstanbul",
          createdAt: "2025-05-30T14:30:00Z",
          estimatedDelivery: "2025-06-01",
          deliveredAt: "2025-06-01T16:45:00Z",
          cost: 18.75,
        },
        {
          id: "SHP_003",
          trackingNumber: "PTT555888999",
          carrier: "ptt",
          carrierName: "PTT Kargo",
          status: "pending",
          orderNumber: "ORD-2025-003",
          recipientName: "Mehmet Özkan",
          recipientCity: "İzmir",
          createdAt: "2025-06-01T09:15:00Z",
          estimatedDelivery: "2025-06-04",
          cost: 22.0,
        },
      ];

      // Apply filters
      let filteredShipments = mockShipments;

      if (search) {
        filteredShipments = filteredShipments.filter(
          (shipment) =>
            shipment.trackingNumber
              .toLowerCase()
              .includes(search.toLowerCase()) ||
            shipment.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
            shipment.recipientName.toLowerCase().includes(search.toLowerCase())
        );
      }

      if (status) {
        filteredShipments = filteredShipments.filter(
          (shipment) => shipment.status === status
        );
      }

      if (carrier) {
        filteredShipments = filteredShipments.filter(
          (shipment) => shipment.carrier === carrier
        );
      }

      res.json({
        success: true,
        data: filteredShipments,
        meta: {
          total: filteredShipments.length,
          filtered: filteredShipments.length !== mockShipments.length,
        },
        message: "Shipments retrieved successfully",
      });
    } catch (error) {
      logger.error(`Failed to get shipments: ${error.message}`, { error });
      res.status(500).json({
        success: false,
        error: {
          message: "Failed to retrieve shipments",
          code: "SHIPMENTS_FETCH_ERROR",
        },
      });
    }
  }

  /**
   * Create a new shipment
   */
  async createShipment(req, res) {
    try {
      const { orderIds, carrier, serviceType = "STANDARD" } = req.body;

      // Validate required fields
      if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            message: "Order IDs array is required",
            code: "MISSING_ORDER_IDS",
          },
        });
      }

      if (!carrier) {
        return res.status(400).json({
          success: false,
          error: {
            message: "Carrier is required",
            code: "MISSING_CARRIER",
          },
        });
      }

      // Mock shipment creation - in a real app this would integrate with carrier APIs
      const trackingNumber = `${carrier.toUpperCase()}${Date.now()}${Math.random()
        .toString(36)
        .substring(2, 6)
        .toUpperCase()}`;

      const newShipment = {
        id: `SHP_${Date.now()}`,
        trackingNumber,
        carrier,
        carrierName: this.getCarrierName(carrier),
        status: "pending",
        orderIds,
        serviceType,
        createdAt: new Date().toISOString(),
        estimatedDelivery: this.calculateEstimatedDelivery(serviceType),
        cost: this.calculateShippingCost(orderIds.length, carrier, serviceType),
      };

      res.json({
        success: true,
        data: newShipment,
        message: "Shipment created successfully",
      });
    } catch (error) {
      logger.error(`Failed to create shipment: ${error.message}`, { error });
      res.status(500).json({
        success: false,
        error: {
          message: "Failed to create shipment",
          code: "SHIPMENT_CREATION_ERROR",
        },
      });
    }
  }

  // Helper methods for shipment creation
  getCarrierName(carrierCode) {
    const carrierNames = {
      aras: "Aras Kargo",
      yurtici: "Yurtiçi Kargo",
      ptt: "PTT Kargo",
      mng: "MNG Kargo",
      ups: "UPS Turkey",
      dhl: "DHL",
      fedex: "FedEx",
    };
    return carrierNames[carrierCode] || "Unknown Carrier";
  }

  calculateEstimatedDelivery(serviceType) {
    const now = new Date();
    let days = 2; // default standard delivery

    switch (serviceType) {
      case "EXPRESS":
        days = 1;
        break;
      case "NEXT_DAY":
        days = 1;
        break;
      case "SAME_DAY":
        days = 0;
        break;
      default:
        days = 2;
    }

    now.setDate(now.getDate() + days);
    return now.toISOString().split("T")[0]; // Return YYYY-MM-DD format
  }

  calculateShippingCost(orderCount, carrier, serviceType) {
    let baseCost = 15; // Base cost in TRY

    // Carrier multiplier
    const carrierMultipliers = {
      aras: 1.0,
      yurtici: 1.1,
      ptt: 0.9,
      mng: 1.05,
      ups: 1.5,
      dhl: 1.6,
      fedex: 1.55,
    };

    // Service type multiplier
    const serviceMultipliers = {
      STANDARD: 1.0,
      EXPRESS: 1.5,
      NEXT_DAY: 2.0,
      SAME_DAY: 3.0,
    };

    const carrierMultiplier = carrierMultipliers[carrier] || 1.0;
    const serviceMultiplier = serviceMultipliers[serviceType] || 1.0;

    return (
      Math.round(
        baseCost * carrierMultiplier * serviceMultiplier * orderCount * 100
      ) / 100
    );
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
        message: "Cache statistics retrieved successfully",
      });
    } catch (error) {
      logger.error(`Failed to get cache stats: ${error.message}`, { error });
      res.status(500).json({
        success: false,
        error: {
          message: "Failed to retrieve cache statistics",
          code: "CACHE_STATS_ERROR",
        },
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
        message: carrier
          ? `Cache cleared for carrier: ${carrier}`
          : "All shipping service cache cleared",
      });
    } catch (error) {
      logger.error(`Failed to clear cache: ${error.message}`, { error });
      res.status(500).json({
        success: false,
        error: {
          message: "Failed to clear cache",
          code: "CACHE_CLEAR_ERROR",
        },
      });
    }
  }
}

module.exports = new ShippingController();
