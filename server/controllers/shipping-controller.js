/**
 * Shipping Controller
 * Handles shipping-related API endpoints for Turkish carriers
 */

const shippingFactory = require("../modules/public/shipping/ShippingServiceFactory");
const logger = require("../utils/logger");
const {
  Order,
  ShippingDetail,
  ShippingCarrier,
  ShippingRate,
  OrderItem,
} = require("../models");
const { Op } = require("sequelize");

class ShippingController {
  /**
   * Get all supported shipping carriers
   */
  async getSupportedCarriers(req, res) {
    try {
      // First try to get carriers from database
      let carriers = [];
      try {
        const dbCarriers = await ShippingCarrier.findAll({
          where: { isActive: true },
          order: [["name", "ASC"]],
        });

        carriers = dbCarriers.map((carrier) => ({
          code: carrier.code,
          name: carrier.name,
          type: carrier.carrierType,
          website: carrier.apiEndpoint,
          trackingUrlTemplate: carrier.trackingUrlTemplate,
          supportedServices: carrier.supportedServices || [
            "STANDARD",
            "EXPRESS",
          ],
          coverage: carrier.coverage || {
            country: "Turkey",
            international: false,
          },
          estimatedDeliveryDays:
            carrier.deliveryTimeRange || "1-3 business days",
          features: {
            cashOnDelivery: carrier.cashOnDeliverySupported || false,
            insurance: carrier.insuranceSupported || false,
            returns: carrier.returnSupported || false,
          },
        }));
      } catch (dbError) {
        logger.warn(
          "Failed to fetch carriers from database, using factory fallback:",
          dbError.message
        );
      }

      // Fallback to factory if no database carriers found
      if (carriers.length === 0) {
        carriers = shippingFactory.getSupportedCarriers();
      }

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
      const { search, status, carrier, page = 1, limit = 50 } = req.query;
      const userId = req.user?.id;

      let shipments = [];

      try {
        // Build query conditions
        const whereConditions = {};
        const orderWhereConditions = userId ? { userId } : {};

        // Build include conditions for filtering
        const includeConditions = [
          {
            model: Order,
            as: "order",
            where: orderWhereConditions,
            include: [
              {
                model: ShippingDetail,
                as: "shippingDetail",
                required: false,
              },
              {
                model: OrderItem,
                as: "items",
                required: false,
              },
            ],
          },
          {
            model: ShippingCarrier,
            as: "carrier",
            required: false,
          },
        ];

        // Apply search filter
        if (search) {
          whereConditions[Op.or] = [
            { trackingNumber: { [Op.iLike]: `%${search}%` } },
            { "$order.orderNumber$": { [Op.iLike]: `%${search}%` } },
            { "$order.customerName$": { [Op.iLike]: `%${search}%` } },
          ];
        }

        // Apply status filter
        if (status) {
          whereConditions.status = status;
        }

        // Apply carrier filter
        if (carrier) {
          whereConditions["$carrier.code$"] = carrier;
        }

        // Query database for shipping rates (which represent shipments)
        const dbShipments = await ShippingRate.findAndCountAll({
          where: whereConditions,
          include: includeConditions,
          limit: parseInt(limit),
          offset: (parseInt(page) - 1) * parseInt(limit),
          order: [["createdAt", "DESC"]],
          distinct: true,
        });

        // Transform database results to shipment format
        shipments = dbShipments.rows.map((rate) => {
          const order = rate.order;
          const shippingDetail = order?.shippingDetail;
          const carrier = rate.carrier;

          return {
            id: `SHP_${rate.id}`,
            trackingNumber:
              shippingDetail?.trackingNumber ||
              `${rate.serviceType}_${rate.id}`,
            carrier: carrier?.code || "unknown",
            carrierName: carrier?.name || "Unknown Carrier",
            status: this.determineShipmentStatus(order?.status, shippingDetail),
            orderNumber: order?.orderNumber || `ORD-${order?.id}`,
            recipientName:
              shippingDetail?.recipientName || order?.customerName || "Unknown",
            recipientCity: shippingDetail?.city || "Unknown",
            shippingAddress: {
              address: shippingDetail?.address,
              city: shippingDetail?.city,
              state: shippingDetail?.state,
              postalCode: shippingDetail?.postalCode,
              country: shippingDetail?.country || "Turkey",
            },
            createdAt: rate.calculatedAt || rate.createdAt,
            estimatedDelivery:
              rate.deliveryDate ||
              this.calculateEstimatedDelivery(rate.serviceType),
            deliveredAt: order?.status === "delivered" ? order.updatedAt : null,
            cost: parseFloat(rate.totalPrice) || 0,
            serviceType: rate.serviceType,
            weight: rate.weight,
            dimensions: rate.dimensions,
          };
        });

        res.json({
          success: true,
          data: shipments,
          meta: {
            total: dbShipments.count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(dbShipments.count / parseInt(limit)),
            filtered: !!(search || status || carrier),
          },
          message: "Shipments retrieved successfully",
        });
      } catch (dbError) {
        logger.warn(
          "Failed to fetch shipments from database, using fallback:",
          dbError.message
        );

        // Fallback to mock data for development/testing
        const mockShipments = this.getMockShipments();
        let filteredShipments = mockShipments;

        // Apply filters to mock data
        if (search) {
          filteredShipments = filteredShipments.filter(
            (shipment) =>
              shipment.trackingNumber
                .toLowerCase()
                .includes(search.toLowerCase()) ||
              shipment.orderNumber
                .toLowerCase()
                .includes(search.toLowerCase()) ||
              shipment.recipientName
                .toLowerCase()
                .includes(search.toLowerCase())
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
            fallback: true,
          },
          message: "Shipments retrieved successfully (fallback data)",
        });
      }
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
      const userId = req.user?.id;

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

      try {
        // Find the carrier in database
        const carrierRecord = await ShippingCarrier.findOne({
          where: { code: carrier, isActive: true },
        });

        if (!carrierRecord) {
          return res.status(400).json({
            success: false,
            error: {
              message: `Carrier ${carrier} not found or inactive`,
              code: "CARRIER_NOT_FOUND",
            },
          });
        }

        // Find orders that belong to the user
        const orders = await Order.findAll({
          where: {
            id: orderIds,
            ...(userId && { userId }),
            status: { [Op.in]: ["paid", "processing", "confirmed"] },
          },
          include: [
            {
              model: ShippingDetail,
              as: "shippingDetail",
            },
          ],
        });

        if (orders.length === 0) {
          return res.status(400).json({
            success: false,
            error: {
              message: "No eligible orders found for shipping",
              code: "NO_ELIGIBLE_ORDERS",
            },
          });
        }

        // Create shipping rates for each order
        const createdShipments = [];

        for (const order of orders) {
          const shippingDetail = order.shippingDetail;

          if (!shippingDetail) {
            logger.warn(`Order ${order.id} has no shipping details, skipping`);
            continue;
          }

          // Calculate estimated costs and delivery
          const weight = this.calculateOrderWeight(order);
          const estimatedCost = this.calculateShippingCost(
            1,
            carrier,
            serviceType
          );
          const estimatedDelivery =
            this.calculateEstimatedDelivery(serviceType);

          // Create shipping rate record
          const shippingRate = await ShippingRate.create({
            carrierId: carrierRecord.id,
            orderId: order.id,
            serviceType: serviceType,
            fromCity: "İstanbul", // Default from city - should be configurable
            fromPostalCode: "34000",
            toCity: shippingDetail.city || "Unknown",
            toPostalCode: shippingDetail.postalCode,
            weight: weight,
            dimensions: this.getDefaultDimensions(),
            basePrice: estimatedCost * 0.85, // Base price without tax
            taxAmount: estimatedCost * 0.15, // 18% KDV
            totalPrice: estimatedCost,
            currency: "TRY",
            deliveryTime:
              carrierRecord.deliveryTimeRange || "1-3 business days",
            deliveryDate: new Date(estimatedDelivery),
            isSelected: true,
          });

          // Generate tracking number
          const trackingNumber = this.generateTrackingNumber(carrier);

          // Update shipping detail with tracking info
          await shippingDetail.update({
            carrierId: carrierRecord.id,
            trackingNumber: trackingNumber,
            trackingUrl: this.generateTrackingUrl(
              carrierRecord,
              trackingNumber
            ),
            status: "shipped",
          });

          // Update order status
          await order.update({
            status: "shipped",
            lastSyncedAt: new Date(),
          });

          createdShipments.push({
            id: `SHP_${shippingRate.id}`,
            trackingNumber: trackingNumber,
            carrier: carrier,
            carrierName: carrierRecord.name,
            status: "shipped",
            orderId: order.id,
            orderNumber: order.orderNumber,
            serviceType: serviceType,
            createdAt: new Date().toISOString(),
            estimatedDelivery: estimatedDelivery,
            cost: estimatedCost,
          });
        }

        if (createdShipments.length === 0) {
          return res.status(400).json({
            success: false,
            error: {
              message: "No shipments could be created",
              code: "SHIPMENT_CREATION_FAILED",
            },
          });
        }

        res.json({
          success: true,
          data: createdShipments,
          message: `${createdShipments.length} shipment(s) created successfully`,
        });
      } catch (dbError) {
        logger.warn(
          "Database shipment creation failed, using mock response:",
          dbError.message
        );

        // Fallback to mock shipment creation
        const trackingNumber = this.generateTrackingNumber(carrier);
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
          cost: this.calculateShippingCost(
            orderIds.length,
            carrier,
            serviceType
          ),
        };

        res.json({
          success: true,
          data: [newShipment],
          message: "Shipment created successfully (mock mode)",
        });
      }
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

  // Helper methods
  determineShipmentStatus(orderStatus, shippingDetail) {
    if (!orderStatus) return "pending";

    switch (orderStatus) {
      case "shipped":
        return "in_transit";
      case "delivered":
        return "delivered";
      case "cancelled":
        return "cancelled";
      case "paid":
      case "processing":
      case "confirmed":
        return shippingDetail?.trackingNumber ? "in_transit" : "pending";
      default:
        return "pending";
    }
  }

  calculateOrderWeight(order) {
    // Default weight calculation - should be based on actual product weights
    const itemCount = order.items?.length || 1;
    return Math.max(0.5, itemCount * 0.3); // Minimum 0.5kg, 0.3kg per item
  }

  getDefaultDimensions() {
    return {
      length: 20,
      width: 15,
      height: 10,
    };
  }

  generateTrackingNumber(carrierCode) {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${carrierCode.toUpperCase()}${timestamp.slice(-8)}${random}`;
  }

  generateTrackingUrl(carrier, trackingNumber) {
    if (carrier.trackingUrlTemplate) {
      return carrier.trackingUrlTemplate.replace(
        "{trackingNumber}",
        trackingNumber
      );
    }

    // Default tracking URLs for major Turkish carriers
    const trackingUrls = {
      aras: `https://www.araskargo.com.tr/takip?kod=${trackingNumber}`,
      yurtici: `https://www.yurticikargo.com/tr/takip?code=${trackingNumber}`,
      ptt: `https://gonderitakip.ptt.gov.tr/Track?barcode=${trackingNumber}`,
      mng: `https://www.mngkargo.com.tr/takip?kod=${trackingNumber}`,
    };

    return trackingUrls[carrier.code] || `#tracking-${trackingNumber}`;
  }

  getMockShipments() {
    return [
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
