const express = require("express");
const {
  Order,
  OrderItem,
  User,
  PlatformConnection,
  ShippingDetail,
  Product,
  TrendyolOrder,
  HepsiburadaOrder,
  N11Order,
  Cart,
  CartItem,
} = require("../../../models");
const PlatformServiceFactory = require("../services/platforms/platformServiceFactory");
const logger = require("../../../utils/logger");
const shippingDetailService = require("../../../utils/shipping-detail-service");
// const wsService = require('../services/websocketService'); // Comment out if websocketService doesn't exist
const { Op } = require("sequelize");
const sequelize = require("../../../config/database");
const {
  mapOrderStatus,
  sanitizePlatformType,
} = require("../../../utils/enum-validators");

/**
 * Safely serialize Sequelize models to JSON, avoiding circular references
 * @param {*} data - The data to serialize
 * @returns {*} - JSON-safe data
 */
function safeSerialize(data) {
  if (!data) {
    return data;
  }

  // If it's a Sequelize model instance, use toJSON()
  if (data.toJSON && typeof data.toJSON === "function") {
    return data.toJSON();
  }

  // If it's an array, process each item
  if (Array.isArray(data)) {
    return data.map((item) => safeSerialize(item));
  }

  // If it's an object, process each property
  if (typeof data === "object" && data !== null) {
    const result = {};
    for (const [key, value] of Object.entries(data)) {
      // Skip circular reference properties and Sequelize internal properties
      if (
        key === "parent" ||
        key === "include" ||
        key.startsWith("_") ||
        key.startsWith("$")
      ) {
        continue;
      }
      result[key] = safeSerialize(value);
    }
    return result;
  }

  return data;
}

// Controller functions
async function getAllOrders(req, res) {
  try {
    logger.info("🔍 [OrderController] getAllOrders API called");
    logger.info("🔍 [OrderController] Query params:", req.query);
    logger.info("🔍 [OrderController] User ID:", req.user?.id);

    const { id: userId } = req.user;
    const {
      page = 1,
      limit = 20,
      status,
      platform,
      startDate,
      endDate,
      customerId,
      search,
      sortBy = "orderDate",
      sortOrder = "DESC",
    } = req.query;

    // Check if user has any platform connections with error handling
    let platformConnections = [];
    try {
      platformConnections = await PlatformConnection.findAll({
        where: { userId },
        attributes: ["id", "platformType", "name", "isActive"],
      });
    } catch (connectionError) {
      logger.warn(
        "Could not fetch platform connections:",
        connectionError.message
      );
      // Return empty state with guidance message for no connections
      return res.status(200).json({
        success: true,
        data: {
          orders: [],
          pagination: {
            total: 0,
            totalPages: 0,
            currentPage: 1,
            limit: parseInt(limit) || 20,
            hasNext: false,
            hasPrev: false,
            showing: 0,
            from: 0,
            to: 0,
          },
        },
        stats: {
          total: 0,
          page: 1,
          pages: 0,
        },
        meta: {
          platformConnections: {
            total: 0,
            active: 0,
            platforms: [],
          },
          guidance: {
            hasConnections: false,
            hasActiveConnections: false,
            message:
              "Veritabanı bağlantısı kurulamadı. Lütfen sistem yöneticisiyle iletişime geçin.",
            nextSteps: [
              "Sistem yöneticisiyle iletişime geçin",
              "Veritabanı bağlantısını kontrol edin",
              "Uygulamayı yeniden başlatmayı deneyin",
            ],
            errorType: "DATABASE_CONNECTION_ERROR",
          },
        },
      });
    }

    // Ensure page and limit are positive integers to prevent negative OFFSET
    const validPage = Math.max(1, parseInt(page) || 1);
    const validLimit = Math.max(1, Math.min(100, parseInt(limit) || 20)); // Cap at 100
    const offset = Math.max(0, (validPage - 1) * validLimit);
    const where = { userId };

    // Apply filters if provided
    if (status && status !== "all") {
      where.orderStatus = status;
    }
    if (platform && platform !== "all") {
      // Check if platform is a number (connection ID) or string (platform type)
      if (!isNaN(platform)) {
        // If it's a number, treat as connection ID
        where.connectionId = parseInt(platform);
      } else {
        // If it's a string, filter by platform type
        where.platform = platform;
      }
    }
    if (customerId) {
      where.customerId = customerId;
    }

    // Apply search filter - handle product search separately due to SQL complexity
    let productOrderIds = [];
    if (search && search.trim()) {
      logger.info("🔍 [OrderController] Search term received:", search.trim());
      const searchTerm = search.trim();

      // Try to find orders by product search first (separate query)
      try {
        const orderItemsWithProducts = await OrderItem.findAll({
          where: {
            [Op.or]: [
              { title: { [Op.iLike]: `%${searchTerm}%` } },
              { sku: { [Op.iLike]: `%${searchTerm}%` } },
              { barcode: { [Op.iLike]: `%${searchTerm}%` } },
            ],
          },
          attributes: ["orderId"],
          raw: true,
        });

        // Get unique order IDs from product search
        productOrderIds = [
          ...new Set(
            orderItemsWithProducts.map((item) => item.orderId).filter(Boolean)
          ),
        ];

        if (productOrderIds.length > 0) {
          logger.info(
            `🔍 [OrderController] Found ${productOrderIds.length} orders with matching products`
          );
        }
      } catch (productSearchError) {
        logger.info(
          "🔍 [OrderController] Product search failed:",
          productSearchError.message
        );
      }

      // Basic search conditions
      const searchConditions = [
        // Order ID fields - search all possible order identifier fields
        { externalOrderId: { [Op.iLike]: `%${searchTerm}%` } },
        { orderNumber: { [Op.iLike]: `%${searchTerm}%` } },
        { platformOrderId: { [Op.iLike]: `%${searchTerm}%` } },
        { platformId: { [Op.iLike]: `%${searchTerm}%` } },
        // Customer fields
        { customerName: { [Op.iLike]: `%${searchTerm}%` } },
        { customerEmail: { [Op.iLike]: `%${searchTerm}%` } },
      ];

      // Add order IDs from product search if found
      if (productOrderIds.length > 0) {
        searchConditions.push({ id: { [Op.in]: productOrderIds } });
      }

      where[Op.or] = searchConditions;
      logger.info("🔍 [OrderController] Combined search conditions applied");
    }

    // Apply date range filter if provided
    if (startDate && endDate) {
      where.orderDate = {
        [Op.between]: [new Date(startDate), new Date(endDate)],
      };
    }

    // Determine sort field and order
    const validSortFields = [
      "orderDate",
      "createdAt",
      "totalAmount",
      "orderStatus",
      "customerName",
      "platformOrderId",
    ];
    const sortField = validSortFields.includes(sortBy) ? sortBy : "orderDate";
    const sortDirection = sortOrder.toLowerCase() === "asc" ? "ASC" : "DESC";

    // Get orders with pagination and include related models with enhanced error handling
    let orders;
    const includeOptions = [
      {
        model: OrderItem,
        as: "items",
        include: [
          {
            model: Product,
            as: "product",
            required: false,
            // Include all product fields including creationSource
            attributes: {
              exclude: [], // Don't exclude any fields - creationSource should be available after DB fix
            },
          },
        ],
        required: false, // Make items optional in case of association issues
      },
      {
        model: ShippingDetail,
        as: "shippingDetail",
        required: false, // Make shipping details optional
      },
      {
        model: PlatformConnection,
        as: "platformConnection",
        attributes: ["platformType", "name", "isActive"],
        required: false, // Make this optional to handle orders without platform connections
      },
    ];

    // If we're searching by product fields, we need to require the associations
    if (search && search.trim()) {
      includeOptions[0].required = false; // Keep items optional but ensure proper joins
    }

    try {
      orders = await Order.findAndCountAll({
        where,
        limit: validLimit,
        offset: offset,
        include: includeOptions,
        order: [[sortField, sortDirection]],
        distinct: true,
      });
    } catch (dbError) {
      logger.error("Database error when fetching orders:", dbError);

      // If there's a database/association error, return empty result with guidance
      return res.status(200).json({
        success: true,
        data: {
          orders: [],
          pagination: {
            total: 0,
            totalPages: 1,
            currentPage: validPage,
            limit: validLimit,
            hasNext: false,
            hasPrev: false,
            showing: 0,
            from: 0,
            to: 0,
          },
        },
        stats: {
          total: 0,
          page: validPage,
          pages: 1,
        },
        meta: {
          databaseError: true,
          platformConnections: {
            total: platformConnections.length,
            active: platformConnections.filter((pc) => pc.isActive).length,
            platforms: platformConnections.map((pc) => ({
              id: pc.id,
              name: pc.name,
              type: pc.platformType,
              isActive: pc.isActive,
            })),
          },
          guidance: {
            hasConnections: platformConnections.length > 0,
            hasActiveConnections: platformConnections.some((pc) => pc.isActive),
            message:
              "Veritabanı bağlantısında sorun var. Platform bağlantılarınızı kontrol edin.",
            nextSteps: [
              "Platform bağlantılarınızı kontrol edin",
              "Deaktif bağlantıları aktifleştirin",
              "Senkronizasyon işlemini yeniden deneyin",
            ],
          },
        },
      });
    }

    // Transform orders to frontend-compatible format
    const transformedOrders = orders.rows.map((order) => {
      const orderData = safeSerialize(order);
      return {
        ...orderData,
        // Map backend fields to frontend expected fields
        status: orderData.orderStatus,
        platform: orderData.platformConnection?.platformType || "unknown",
        platformName: orderData.platformConnection?.name || "Unknown Platform",
        displayDate: orderData.orderDate,
        // Ensure all required fields exist with defaults
        currency: orderData.currency || "TRY",
        tags: orderData.tags || [],
        items: orderData.items || [],
      };
    });

    // Enhanced pagination info
    const totalPages = Math.ceil(orders.count / validLimit);
    const currentPage = validPage;

    const response = {
      success: true,
      data: {
        orders: transformedOrders,
        pagination: {
          total: orders.count,
          totalPages,
          currentPage: validPage,
          limit: validLimit,
          hasNext: validPage < totalPages,
          hasPrev: validPage > 1,
          showing: transformedOrders.length,
          from: offset + 1,
          to: Math.min(offset + transformedOrders.length, orders.count),
        },
      },
      stats: {
        total: orders.count,
        page: validPage,
        pages: totalPages,
      },
    };

    // Add platform connection info and guidance if no data exists
    if (orders.count === 0) {
      response.meta = {
        platformConnections: {
          total: platformConnections.length,
          active: platformConnections.filter((pc) => pc.isActive).length,
          platforms: platformConnections.map((pc) => ({
            id: pc.id,
            name: pc.name,
            type: pc.platformType,
            isActive: pc.isActive,
          })),
        },
        guidance: {
          hasConnections: platformConnections.length > 0,
          hasActiveConnections: platformConnections.some((pc) => pc.isActive),
          message:
            platformConnections.length === 0
              ? "Siparişleri görüntülemek için önce bir pazaryeri platformuna bağlanın."
              : platformConnections.some((pc) => pc.isActive)
              ? "Siparişleri görmek için platformlarınızdan veri senkronizasyonu yapın."
              : "Platform bağlantılarınızı aktifleştirin ve senkronizasyon yapın.",
          nextSteps:
            platformConnections.length === 0
              ? [
                  "Platform Bağlantıları sayfasına gidin",
                  "Trendyol, Hepsiburada veya N11'e bağlanın",
                  "API anahtarlarınızı ekleyin",
                ]
              : platformConnections.some((pc) => pc.isActive)
              ? [
                  "Sipariş Yönetimi sayfasında 'Senkronize Et' butonuna tıklayın",
                  "Platform verileriniz otomatik olarak çekilecektir",
                ]
              : [
                  "Platform bağlantılarınızı kontrol edin",
                  "Deaktif bağlantıları aktifleştirin",
                  "Senkronizasyon işlemini başlatın",
                ],
        },
      };
    }

    return res.status(200).json(response);
  } catch (error) {
    logger.error("Get orders error:", error);

    // Return graceful error response instead of 500
    return res.status(200).json({
      success: false,
      data: {
        orders: [],
        pagination: {
          total: 0,
          totalPages: 1,
          currentPage: 1,
          limit: parseInt(req.query.limit) || 20,
          hasNext: false,
          hasPrev: false,
          showing: 0,
          from: 0,
          to: 0,
        },
      },
      stats: {
        total: 0,
        page: 1,
        pages: 1,
      },
      meta: {
        error: true,
        errorType: "SYSTEM_ERROR",
        platformConnections: {
          total: 0,
          active: 0,
          platforms: [],
        },
        guidance: {
          hasConnections: false,
          hasActiveConnections: false,
          message:
            "Sistem hatası nedeniyle siparişler yüklenemedi. Lütfen daha sonra tekrar deneyin.",
          nextSteps: [
            "Sayfayı yenileyin",
            "Platform bağlantılarınızı kontrol edin",
            "Sorun devam ederse sistem yöneticisiyle iletişime geçin",
          ],
        },
      },
      error: {
        message: "Failed to fetch orders due to system error",
        details: error.message,
      },
    });
  }
}

async function createOrder(req, res) {
  const transaction = await sequelize.transaction();
  try {
    const userId = req.user ? req.user.id : null;
    const { customerInfo, shippingAddress, sessionId } = req.body;

    let cart;

    // Find the cart by userId for authenticated users, or by sessionId for guests
    const whereClause = userId ? { userId } : { sessionId };

    if (!userId && !sessionId) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: "A cart session is required to place an order." });
    }

    cart = await Cart.findOne({
      where: whereClause,
      include: [{ model: CartItem, as: "items" }],
      transaction,
    });

    if (!cart || !cart.items || cart.items.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: "Your cart is empty." });
    }

    // Calculate total amount
    const totalAmount = cartItems.reduce((total, item) => {
      return total + item.price * item.quantity;
    }, 0);

    // Create the order
    const order = await Order.create(
      {
        userId: userId,
        customerInfo: userId ? null : customerInfo,
        shippingAddress: shippingAddress,
        totalAmount,
        currency: "TRY",
        orderStatus: "new",
        orderNumber: `PZR-${Date.now()}`, // Simple order number generation
        externalOrderId: `PZR-${Date.now()}`,
      },
      { transaction }
    );

    // Create order items from cart items
    const orderItems = cartItems.map((item) => ({
      orderId: order.id,
      productId: item.productId,
      supplierId: item.supplierId,
      quantity: item.quantity,
      price: item.price,
      totalPrice: item.price * item.quantity,
    }));

    await OrderItem.bulkCreate(orderItems, { transaction });

    // If the user is authenticated, clear their cart
    if (userId && cart) {
      await CartItem.destroy({ where: { cartId: cart.id }, transaction });
    }

    await transaction.commit();

    const finalOrder = await Order.findByPk(order.id, {
      include: [{ model: OrderItem, as: "items" }],
    });

    res.status(201).json({ success: true, data: finalOrder });
  } catch (error) {
    await transaction.rollback();
    logger.error("Failed to create order:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create order.",
      error: error.message,
    });
  }
}

async function getOrderById(req, res) {
  try {
    const { id } = req.params;

    const order = await Order.findByPk(id, {
      include: [
        {
          model: OrderItem,
          as: "items",
          include: [
            {
              model: Product,
              as: "product",
              required: false, // Make Product association optional
            },
          ],
        },
        { model: ShippingDetail, as: "shippingDetail" },
        {
          model: PlatformConnection,
          as: "platformConnection",
          required: false,
        },
      ],
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: `Order with ID ${id} not found`,
      });
    }

    // Safely serialize the order data
    const serializedOrder = safeSerialize(order);

    return res.status(200).json({
      success: true,
      data: serializedOrder,
    });
  } catch (error) {
    logger.error(`Error fetching order ${req.params.id}:`, error);
    return res.status(500).json({
      success: false,
      message: "Error fetching order details",
      error: error.message,
    });
  }
}

async function updateOrder(req, res) {
  try {
    const { id } = req.params;
    const order = await Order.findByPk(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    await order.update(req.body);

    // Safely serialize the updated order
    const serializedOrder = safeSerialize(order);

    // Notify connected clients about the order update (if websocket service exists)
    // if (wsService && wsService.notifyOrderUpdate) {
    //   wsService.notifyOrderUpdate(serializedOrder);
    // }

    return res.status(200).json({
      success: true,
      data: serializedOrder,
    });
  } catch (error) {
    logger.error("Error updating order:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating order",
      error: error.message,
    });
  }
}

async function updateOrderStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const order = await Order.findByPk(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: `Order with ID ${id} not found`,
      });
    }

    // Update order status
    order.orderStatus = status; // Fixed: use orderStatus instead of status
    if (notes) {
      order.notes = notes;
    }
    order.updatedAt = new Date();

    await order.save();

    // Safely serialize the order
    const serializedOrder = safeSerialize(order);

    return res.status(200).json({
      success: true,
      message: `Order status updated to ${status}`,
      data: serializedOrder,
    });
  } catch (error) {
    logger.error(`Error updating order ${req.params.id}:`, error);
    return res.status(500).json({
      success: false,
      message: "Error updating order status",
      error: error.message,
    });
  }
}

async function cancelOrder(req, res) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Validate authentication
    if (!req.user || !req.user.id) {
      logger.error("Cancel order failed: No authenticated user", {
        hasUser: !!req.user,
        userId: req.user?.id,
        orderId: id,
      });
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { id: userId } = req.user;

    logger.info("Order cancellation requested", {
      orderId: id,
      userId: userId,
      reason: reason || "No reason provided",
    });

    // Find the order with platform connection
    const order = await Order.findOne({
      where: { id, userId },
      include: [
        {
          model: PlatformConnection,
          as: "platformConnection",
          attributes: ["id", "platformType", "credentials", "isActive"],
          required: false, // Make optional to handle orders without platform connections
        },
      ],
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: `Order with ID ${id} not found`,
      });
    }

    // Update local order status first
    await order.update({
      orderStatus: "cancelled",
      cancellationReason: reason,
      cancelledAt: new Date(),
    });

    // Get platform service and cancel on platform if possible
    let platformCancelResult = { success: true };

    if (order.platformConnection && order.platformConnection.isActive) {
      try {
        const PlatformServiceFactory = require("../services/platforms/platformServiceFactory");
        const platformService = PlatformServiceFactory.createService(
          order.platformConnection.platformType,
          order.platformConnection.id
        );

        if (platformService) {
          await platformService.initialize();

          // Use platform-specific cancellation if available
          if (typeof platformService.cancelOrder === "function") {
            platformCancelResult = await platformService.cancelOrder(
              order.externalOrderId || order.platformOrderId,
              reason || "Merchant cancellation"
            );
          } else {
            logger.warn(
              `Platform ${order.platformConnection.platformType} does not support order cancellation`,
              {
                orderId: id,
                platform: order.platformConnection.platformType,
              }
            );
            platformCancelResult = {
              success: false,
              message: `Platform ${order.platformConnection.platformType} does not support order cancellation`,
            };
          }
        }
      } catch (platformError) {
        logger.warn(
          `Failed to cancel order on platform: ${platformError.message}`,
          {
            orderId: id,
            platform: order.platformConnection.platformType,
            error: platformError.message,
          }
        );
        platformCancelResult = {
          success: false,
          message: `Order cancelled locally, but platform cancellation failed: ${platformError.message}`,
        };
      }
    }

    // Safely serialize the order
    const serializedOrder = safeSerialize(order);

    // Notify connected clients about the order cancellation (if websocket service exists)
    // if (wsService && wsService.notifyOrderCancellation) {
    //   wsService.notifyOrderCancellation(serializedOrder);
    // }

    return res.status(200).json({
      success: true,
      data: serializedOrder,
      platformResult: platformCancelResult,
      message: platformCancelResult.success
        ? "Order cancelled successfully on both local system and platform"
        : `Order cancelled locally. Platform cancellation: ${platformCancelResult.message}`,
    });
  } catch (error) {
    logger.error("Error cancelling order:", error);
    return res.status(500).json({
      success: false,
      message: "Error cancelling order",
      error: error.message,
    });
  }
}

async function syncOrders(req, res) {
  try {
    const { userId, platformIds } = req.body;

    // Validate user exists
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: `User with ID ${userId} not found`,
      });
    }

    // Get all platforms for the user if platformIds not specified
    let platforms;
    if (platformIds && platformIds.length > 0) {
      platforms = await PlatformConnection.findAll({
        where: {
          id: platformIds,
          userId,
        },
      });
    } else {
      platforms = await PlatformConnection.findAll({
        where: { userId },
      });
    }

    if (platforms.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No connected platforms found",
      });
    }

    // Track sync results for each platform
    const syncResults = [];

    // Process each platform
    for (const platform of platforms) {
      try {
        // Create platform service using factory
        const platformService = PlatformServiceFactory.createService(
          platform.platformType,
          platform.id
        );

        if (!platformService) {
          syncResults.push({
            platformId: platform.id,
            platformName: platform.name,
            success: false,
            error: `Unsupported platform type: ${platform.platformType}`,
          });
          continue;
        }

        // Initialize the service
        await platformService.initialize();

        // Set date range for sync
        const startDate = req.body.startDate
          ? new Date(req.body.startDate)
          : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const endDate = req.body.endDate
          ? new Date(req.body.endDate)
          : new Date();

        // Sync orders from platform
        const syncResult = await platformService.syncOrdersFromDate(
          startDate,
          endDate
        );

        syncResults.push({
          platformId: platform.id,
          platformName: platform.name,
          success: syncResult.success,
          newOrders: syncResult.data?.count || 0,
          totalProcessed: syncResult.data?.count || 0,
        });
      } catch (error) {
        logger.error(
          `Error syncing orders from platform ${platform.id}:`,
          error
        );
        syncResults.push({
          platformId: platform.id,
          platformName: platform.name,
          success: false,
          error: error.message,
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: "Order synchronization complete",
      data: syncResults,
    });
  } catch (error) {
    logger.error("Error in order sync process:", error);
    return res.status(500).json({
      success: false,
      message: "Error synchronizing orders",
      error: error.message,
    });
  }
}

/**
 * Sync orders for a specific platform by ID
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
async function syncOrdersByPlatform(req, res) {
  try {
    const { id } = req.params; // Platform connection ID
    const userId = req.user.id; // Get user ID from auth middleware

    // Find the platform connection
    const platformConnection = await PlatformConnection.findOne({
      where: {
        id: id,
        userId: userId,
      },
    });

    if (!platformConnection) {
      return res.status(404).json({
        success: false,
        message: `Platform connection with ID ${id} not found or doesn't belong to the user`,
      });
    }

    // Create the platform service instance using the factory
    const platformService = PlatformServiceFactory.createService(
      platformConnection.platformType,
      id
    );

    // Initialize the service
    await platformService.initialize();

    // Set date range for sync
    const now = new Date();
    const startDate = req.body.startDate
      ? new Date(req.body.startDate)
      : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // Default to last 7 days

    const endDate = req.body.endDate ? new Date(req.body.endDate) : now;

    // Sync orders from the platform
    let syncResult;
    try {
      syncResult = await platformService.syncOrdersFromDate(startDate, endDate);
    } catch (syncError) {
      logger.error(`Error during sync operation: ${syncError.message}`, {
        error: syncError,
      });

      // Check if this is a duplicate order error (SequelizeUniqueConstraintError)
      if (syncError.name === "SequelizeUniqueConstraintError") {
        return res.status(409).json({
          success: false,
          message:
            "Some orders are already synced and could not be imported again",
          error: {
            name: "SequelizeUniqueConstraintError",
            fields: syncError.fields,
          },
        });
      }

      throw syncError; // Re-throw other errors to be caught by the outer catch block
    }

    // Update platform connection last sync time
    await platformConnection.update({
      lastSyncAt: now,
    });

    // Successful sync
    return res.status(200).json({
      success: true,
      message: `Successfully synced orders from ${platformConnection.name}`,
      data: syncResult,
    });
  } catch (error) {
    logger.error(
      `Error syncing orders from platform connection ${req.params.id}: ${error.message}`,
      { error, connectionId: req.params.id }
    );
    return res.status(500).json({
      success: false,
      message: "Error syncing orders",
      error: error.message,
    });
  }
}

async function getOrderStats(req, res) {
  try {
    const { id: userId } = req.user;
    const { period = "30d" } = req.query;

    // Calculate date range based on period
    const now = new Date();
    const dateRanges = {
      "7d": new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      "30d": new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      "90d": new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
      "1y": new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
    };
    const startDate = dateRanges[period] || dateRanges["30d"];

    // Get comprehensive order statistics with error handling for each query
    let totalOrders = 0;
    let periodOrders = 0;
    let statusCounts = [];
    let platformCounts = [];
    let totalRevenue = 0;
    let periodRevenue = 0;
    let recentOrders = [];
    let platformConnections = { count: 0, rows: [] };

    try {
      totalOrders = await Order.count({ where: { userId } });
    } catch (error) {
      logger.warn("Could not fetch total orders count:", error.message);
    }

    try {
      periodOrders = await Order.count({
        where: {
          userId,
          createdAt: { [Op.gte]: startDate },
        },
      });
    } catch (error) {
      logger.warn("Could not fetch period orders count:", error.message);
    }

    try {
      statusCounts = await Order.findAll({
        where: { userId },
        attributes: [
          "orderStatus",
          [Order.sequelize.fn("COUNT", Order.sequelize.col("id")), "count"],
        ],
        group: ["orderStatus"],
        raw: true,
      });
    } catch (error) {
      logger.warn("Could not fetch status counts:", error.message);
    }

    // Platform breakdown with enhanced error handling
    try {
      const hasConnections = await PlatformConnection.count({
        where: { userId },
      });

      if (hasConnections > 0) {
        platformCounts = await Order.sequelize.query(
          `
          SELECT pc."platformType", COUNT(o.id) as count
          FROM orders o 
          JOIN platform_connections pc ON o."connectionId" = pc.id 
          WHERE o."userId" = :userId
          GROUP BY pc."platformType"
        `,
          {
            replacements: { userId },
            type: Order.sequelize.QueryTypes.SELECT,
          }
        );
      }
    } catch (error) {
      logger.warn(`Error fetching platform breakdown: ${error.message}`);
    }

    try {
      totalRevenue =
        (await Order.sum("totalAmount", { where: { userId } })) || 0;
    } catch (error) {
      logger.warn("Could not fetch total revenue:", error.message);
    }

    try {
      periodRevenue =
        (await Order.sum("totalAmount", {
          where: {
            userId,
            createdAt: { [Op.gte]: startDate },
          },
        })) || 0;
    } catch (error) {
      logger.warn("Could not fetch period revenue:", error.message);
    }

    try {
      recentOrders = await Order.findAll({
        where: { userId },
        include: [
          {
            model: PlatformConnection,
            as: "platformConnection",
            attributes: ["platformType", "name"],
            required: false,
          },
        ],
        order: [["createdAt", "DESC"]],
        limit: 10,
        attributes: [
          "id",
          "platformOrderId",
          "orderStatus",
          "totalAmount",
          "currency",
          "customerName",
          "customerEmail",
          "createdAt",
          "orderDate",
        ],
      });
    } catch (error) {
      logger.warn("Could not fetch recent orders:", error.message);
    }

    try {
      platformConnections = await PlatformConnection.findAndCountAll({
        where: { userId },
        attributes: ["id", "platformType", "name", "isActive"],
      });
    } catch (error) {
      logger.warn("Could not fetch platform connections:", error.message);
    }

    // Transform status counts to object
    const byStatus = {};
    statusCounts.forEach((status) => {
      byStatus[status.orderStatus || "unknown"] = parseInt(status.count) || 0;
    });

    // Transform platform counts to object
    const byPlatform = {};
    platformCounts.forEach((platform) => {
      const platformType = platform.platformType || "unknown";
      byPlatform[platformType] = parseInt(platform.count) || 0;
    });

    // Transform recent orders
    const transformedRecentOrders = recentOrders.map((order) => {
      const orderData = safeSerialize(order);
      return {
        ...orderData,
        platform: orderData.platformConnection?.platformType || "unknown",
        platformName: orderData.platformConnection?.name || "Unknown Platform",
      };
    });

    // Calculate platform connection stats
    const platformStats = {
      active: platformConnections.rows.filter((p) => p.isActive === true)
        .length,
      inactive: platformConnections.rows.filter((p) => p.isActive === false)
        .length,
      total: platformConnections.count,
      connections: platformConnections.rows.map((pc) => ({
        id: pc.id,
        name: pc.name,
        type: pc.platformType,
        isActive: pc.isActive,
      })),
    };

    // Calculate growth metrics with error handling
    let orderGrowth = 0;
    let revenueGrowth = 0;
    try {
      const previousPeriodStart = new Date(
        startDate.getTime() - (now.getTime() - startDate.getTime())
      );

      const previousPeriodOrders = await Order.count({
        where: {
          userId,
          createdAt: {
            [Op.between]: [previousPeriodStart, startDate],
          },
        },
      });

      const previousPeriodRevenue =
        (await Order.sum("totalAmount", {
          where: {
            userId,
            createdAt: {
              [Op.between]: [previousPeriodStart, startDate],
            },
          },
        })) || 0;

      orderGrowth =
        previousPeriodOrders > 0
          ? ((periodOrders - previousPeriodOrders) / previousPeriodOrders) * 100
          : 0;
      revenueGrowth =
        previousPeriodRevenue > 0
          ? (((periodRevenue || 0) - previousPeriodRevenue) /
              previousPeriodRevenue) *
            100
          : 0;
    } catch (error) {
      logger.warn("Could not calculate growth metrics:", error.message);
    }

    // Comprehensive response
    const response = {
      success: true,
      data: {
        // Basic counts (legacy compatibility)
        newOrders: byStatus.new || 0,
        processingOrders: byStatus.processing || 0,
        shippedOrders: byStatus.shipped || 0,
        deliveredOrders: byStatus.delivered || 0,
        cancelledOrders: byStatus.cancelled || 0,
        totalOrders,

        // Comprehensive stats
        total: totalOrders,
        totalRevenue: totalRevenue || 0,
        periodRevenue: periodRevenue || 0,
        byStatus,
        byPlatform,
        recentOrders: transformedRecentOrders,
        platforms: platformStats,

        // Growth metrics
        growth: {
          orders: Math.round(orderGrowth * 100) / 100,
          revenue: Math.round(revenueGrowth * 100) / 100,
        },

        // Period info
        period: {
          selected: period,
          startDate: startDate.toISOString(),
          endDate: now.toISOString(),
          ordersInPeriod: periodOrders,
          revenueInPeriod: periodRevenue || 0,
        },

        // Additional metrics
        averageOrderValue:
          totalOrders > 0
            ? Math.round(((totalRevenue || 0) / totalOrders) * 100) / 100
            : 0,
        completionRate:
          totalOrders > 0
            ? Math.round(
                ((byStatus.delivered || 0) / totalOrders) * 100 * 100
              ) / 100
            : 0,
        cancellationRate:
          totalOrders > 0
            ? Math.round(
                ((byStatus.cancelled || 0) / totalOrders) * 100 * 100
              ) / 100
            : 0,
      },
    };

    return res.status(200).json(response);
  } catch (error) {
    logger.error("Error fetching comprehensive order stats:", error);

    // Return graceful error response instead of 500
    return res.status(200).json({
      success: false,
      data: {
        newOrders: 0,
        processingOrders: 0,
        shippedOrders: 0,
        deliveredOrders: 0,
        cancelledOrders: 0,
        totalOrders: 0,
        total: 0,
        totalRevenue: 0,
        periodRevenue: 0,
        byStatus: {},
        byPlatform: {},
        recentOrders: [],
        platforms: {
          active: 0,
          inactive: 0,
          total: 0,
          connections: [],
        },
        growth: {
          orders: 0,
          revenue: 0,
        },
        period: {
          selected: req.query.period || "30d",
          ordersInPeriod: 0,
          revenueInPeriod: 0,
        },
        averageOrderValue: 0,
        completionRate: 0,
        cancellationRate: 0,
      },
      error: {
        message: "System error occurred while fetching order statistics",
        details: error.message,
        errorType: "DATABASE_ERROR",
      },
    });
  }
}

/**
 * Import a direct Hepsiburada order payload
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
async function importHepsiburadaOrder(req, res) {
  try {
    const orderData = req.body;
    const { connectionId } = req.query;

    if (!orderData || !orderData.orderId || !orderData.orderNumber) {
      return res.status(400).json({
        success: false,
        message: "Invalid order data: Missing required fields",
      });
    }

    if (!connectionId) {
      return res.status(400).json({
        success: false,
        message: "Platform connection ID is required",
      });
    }

    // Get the Hepsiburada service for this connection
    const HepsiburadaService = require("../services/platforms/hepsiburada/hepsiburada-service");
    const hepsiburadaService = new HepsiburadaService(connectionId);

    try {
      // Process the order data
      const result = await hepsiburadaService.processDirectOrderPayload(
        orderData
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      // Notify via websocket about the new order (if websocket service exists)
      // if (result.data && wsService && wsService.notifyNewOrder) {
      //   wsService.notifyNewOrder(result.data);
      // }

      return res.status(200).json({
        success: true,
        message: "Order imported successfully",
        data: result.data,
      });
    } catch (processError) {
      // Handle unique constraint violations
      if (processError.name === "SequelizeUniqueConstraintError") {
        logger.warn(
          `Unique constraint violation during Hepsiburada order import: ${
            orderData.orderNumber || orderData.orderId
          }`,
          {
            error: processError,
            orderNumber: orderData.orderNumber,
            orderId: orderData.orderId,
            connectionId: connectionId,
          }
        );

        return res.status(409).json({
          success: false,
          message: "This order already exists in the system",
          error: {
            name: "SequelizeUniqueConstraintError",
            fields: processError.fields || {},
            orderNumber: orderData.orderNumber,
            orderId: orderData.orderId,
          },
        });
      }

      // Handle other specific error for "Could not find order that caused constraint violation"
      if (
        processError.message &&
        processError.message.includes("Could not find order")
      ) {
        logger.error(
          `Order lookup failure after constraint violation: ${
            orderData.orderNumber || orderData.orderId
          }`,
          {
            error: processError,
            orderNumber: orderData.orderNumber,
            orderId: orderData.orderId,
            connectionId: connectionId,
          }
        );

        return res.status(409).json({
          success: false,
          message: "Order appears to exist but could not be located for update",
          error: {
            name: "OrderLookupError",
            orderNumber: orderData.orderNumber,
            orderId: orderData.orderId,
          },
        });
      }

      // Re-throw other errors to be caught by outer catch
      throw processError;
    }
  } catch (error) {
    logger.error(`Failed to import Hepsiburada order: ${error.message}`, {
      error,
      userId: req.user.id,
      body: req.body.orderNumber || req.body.orderId,
    });

    return res.status(500).json({
      success: false,
      message: `Failed to import order: ${error.message}`,
      error: error.message,
    });
  }
}

/**
 * Get order trends data for charts
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
async function getOrderTrends(req, res) {
  try {
    const {
      period = "week",
      platform,
      compareWithPrevious = "true",
    } = req.query;
    const shouldCompare = compareWithPrevious === "true";

    // Determine date ranges based on the period
    const now = new Date();
    let startDate, endDate;
    let previousStartDate, previousEndDate;
    let groupByFormat;

    switch (period) {
      case "year":
        // Last 12 months
        startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        previousStartDate = new Date(
          now.getFullYear() - 1,
          now.getMonth() - 11,
          1
        );
        previousEndDate = new Date(
          now.getFullYear() - 1,
          now.getMonth() + 1,
          0
        );
        groupByFormat = "month"; // Group by month
        break;

      case "month":
        // Last 30 days
        startDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - 29
        );
        endDate = now;
        previousStartDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - 59
        );
        previousEndDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - 30
        );
        groupByFormat = "day"; // Group by day
        break;

      default: // week
        // Last 7 days
        startDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - 6
        );
        endDate = now;
        previousStartDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - 13
        );
        previousEndDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - 7
        );
        groupByFormat = "day"; // Group by day
    }

    // Set times to beginning/end of day for consistent comparisons
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    if (shouldCompare) {
      previousStartDate.setHours(0, 0, 0, 0);
      previousEndDate.setHours(23, 59, 59, 999);
    }

    // Prepare the where clause
    const where = {
      orderDate: {
        [Op.between]: [startDate, endDate],
      },
    };

    // Add platform filter if provided
    if (platform) {
      where.platformId = platform;
    }

    // Fetch orders for the current period
    const orders = await Order.findAll({
      where,
      attributes: ["id", "orderDate", "orderStatus", "totalAmount"], // Fixed: use orderStatus instead of status
      order: [["orderDate", "ASC"]],
    });

    // Group orders by date
    const groupedData = groupOrdersByDate(orders, groupByFormat);

    // Process previous period if comparison is requested
    let previousGroupedData = null;
    if (shouldCompare) {
      const previousWhere = { ...where };
      previousWhere.orderDate = {
        [Op.between]: [previousStartDate, previousEndDate],
      };

      const previousOrders = await Order.findAll({
        where: previousWhere,
        attributes: ["id", "orderDate", "orderStatus", "totalAmount"], // Fixed: use orderStatus instead of status
        order: [["orderDate", "ASC"]],
      });

      previousGroupedData = groupOrdersByDate(previousOrders, groupByFormat);
    }

    // Format the response data
    const trendData = formatTrendData(groupedData, previousGroupedData, period);

    return res.status(200).json({
      success: true,
      data: trendData,
    });
  } catch (error) {
    logger.error(`Failed to get order trends: ${error.message}`, { error });
    return res.status(500).json({
      success: false,
      message: "Failed to get order trends",
      error: error.message,
    });
  }
}

/**
 * Group orders by date according to the specified format
 * @param {Array} orders - The array of orders
 * @param {String} groupByFormat - The date format to group by ('day' or 'month')
 * @returns {Object} - Grouped orders by date
 */
function groupOrdersByDate(orders, groupByFormat) {
  const grouped = {};

  orders.forEach((order) => {
    const date = new Date(order.orderDate);
    let key;

    if (groupByFormat === "month") {
      // Format: YYYY-MM (2023-01 for January 2023)
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
        2,
        "0"
      )}`;
    } else {
      // Format: YYYY-MM-DD
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
        2,
        "0"
      )}-${String(date.getDate()).padStart(2, "0")}`;
    }

    if (!grouped[key]) {
      grouped[key] = {
        date: key,
        newOrders: 0,
        shippedOrders: 0,
        totalOrders: 0,
        revenue: 0,
      };
    }

    grouped[key].totalOrders++;

    if (order.orderStatus === "new") {
      grouped[key].newOrders++;
    } else if (order.orderStatus === "shipped") {
      grouped[key].shippedOrders++;
    }

    // Add to revenue
    if (order.totalAmount) {
      grouped[key].revenue += parseFloat(order.totalAmount) || 0;
    }
  });

  return grouped;
}

/**
 * Format trend data for response
 * @param {Object} currentData - Grouped data for current period
 * @param {Object} previousData - Grouped data for previous period (optional)
 * @param {String} period - The time period ('week', 'month', 'year')
 * @returns {Array} - Formatted trend data
 */
function formatTrendData(currentData, previousData, period) {
  const result = [];

  // Get all dates in the range
  const dates = getDateRange(period);

  // Fill in the data for each date
  dates.forEach((dateStr) => {
    const data = {
      date: dateStr,
      newOrders: currentData[dateStr]?.newOrders || 0,
      shippedOrders: currentData[dateStr]?.shippedOrders || 0,
      totalOrders: currentData[dateStr]?.totalOrders || 0,
      revenue: (currentData[dateStr]?.revenue || 0).toFixed(2),
    };

    // Add previous period data if available
    if (previousData) {
      const previousIndex = Object.keys(previousData).findIndex(
        (d) => d.substring(5) === dateStr.substring(5)
      );

      if (previousIndex !== -1) {
        const prevKey = Object.keys(previousData)[previousIndex];
        data.previousNewOrders = previousData[prevKey]?.newOrders || 0;
        data.previousShippedOrders = previousData[prevKey]?.shippedOrders || 0;
        data.previousTotalOrders = previousData[prevKey]?.totalOrders || 0;
        data.previousRevenue = (previousData[prevKey]?.revenue || 0).toFixed(2);
      } else {
        data.previousNewOrders = 0;
        data.previousShippedOrders = 0;
        data.previousTotalOrders = 0;
        data.previousRevenue = 0;
      }
    }

    result.push(data);
  });

  return result;
}

/**
 * Generate a date range array based on the period
 * @param {String} period - The time period ('week', 'month', 'year')
 * @returns {Array} - Array of date strings
 */
function getDateRange(period) {
  const result = [];
  const today = new Date();
  let start, end, dateFormat;

  switch (period) {
    case "year":
      start = new Date(today.getFullYear(), today.getMonth() - 11, 1);
      end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      dateFormat = "month";
      break;
    case "month":
      start = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() - 29
      );
      end = today;
      dateFormat = "day";
      break;
    default: // week
      start = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() - 6
      );
      end = today;
      dateFormat = "day";
  }

  // Set to beginning of day
  start.setHours(0, 0, 0, 0);

  const current = new Date(start);

  while (current <= end) {
    let dateStr;

    if (dateFormat === "month") {
      dateStr = `${current.getFullYear()}-${String(
        current.getMonth() + 1
      ).padStart(2, "0")}`;
      current.setMonth(current.getMonth() + 1);
    } else {
      dateStr = `${current.getFullYear()}-${String(
        current.getMonth() + 1
      ).padStart(2, "0")}-${String(current.getDate()).padStart(2, "0")}`;
      current.setDate(current.getDate() + 1);
    }

    result.push(dateStr);
  }

  return result;
}

/**
 * Get order details with platform-specific data
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
async function getOrderWithPlatformDetails(req, res) {
  try {
    const { id } = req.params;

    // Find the order with all its associations
    const order = await Order.findByPk(id, {
      include: [
        {
          model: OrderItem,
          as: "items",
          include: [
            {
              model: Product,
              as: "product",
              required: false, // Make Product association optional
            },
          ],
        },
        { model: ShippingDetail, as: "shippingDetail" },
        {
          model: PlatformConnection,
          as: "platformConnection",
          required: false,
        },
        { model: TrendyolOrder, as: "trendyolOrder" },
        { model: HepsiburadaOrder, as: "hepsiburadaOrder" },
      ],
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: `Order with ID ${id} not found`,
      });
    }

    // Convert the raw order data to a more usable form using safe serialization
    const orderData = safeSerialize(order);

    // Add a field to indicate the platform type for easier frontend handling
    if (orderData.platformConnection) {
      orderData.platformDetailsType = orderData.platformConnection.platformType;
    }

    // Depending on the platform type, include the appropriate details
    if (
      orderData.platformConnection?.platformType === "trendyol" &&
      orderData.trendyolOrder
    ) {
      orderData.platformDetails = orderData.trendyolOrder;
    } else if (
      orderData.platformConnection?.platformType === "hepsiburada" &&
      orderData.hepsiburadaOrder
    ) {
      orderData.platformDetails = orderData.hepsiburadaOrder;
    } else {
      // If no platform-specific details found
      orderData.platformDetails = null;
    }

    return res.status(200).json({
      success: true,
      data: orderData,
    });
  } catch (error) {
    logger.error(
      `Error fetching order details with platform data ${req.params.id}:`,
      error
    );
    return res.status(500).json({
      success: false,
      message: "Error fetching order details",
      error: error.message,
    });
  }
}

async function acceptOrder(req, res) {
  try {
    const { id } = req.params;

    // Validate authentication
    if (!req.user || !req.user.id) {
      logger.error("Accept order failed: No authenticated user", {
        hasUser: !!req.user,
        userId: req.user?.id,
        orderId: id,
      });
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { id: userId } = req.user;

    logger.info("Order acceptance requested", {
      orderId: id,
      userId: userId,
    });

    // Find the order with platform connection
    const order = await Order.findOne({
      where: { id, userId },
      include: [
        {
          model: PlatformConnection,
          as: "platformConnection",
          attributes: ["id", "platformType", "credentials", "isActive"],
          required: false, // Make optional to handle orders without platform connections
        },
      ],
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: `Order with ID ${id} not found`,
      });
    }

    // Check if order is in acceptable state
    const acceptableStatuses = ["new", "pending"];
    if (!acceptableStatuses.includes(order.orderStatus)) {
      return res.status(400).json({
        success: false,
        message: `Cannot accept order with status: ${order.orderStatus}. Order must be in 'new' or 'pending' status.`,
      });
    }

    // Update local order status first
    await order.update({
      orderStatus: "processing",
      acceptedAt: new Date(),
      updatedAt: new Date(),
    });

    // Get platform service and update status on platform
    let platformUpdateResult = { success: true };

    if (order.platformConnection && order.platformConnection.isActive) {
      try {
        const PlatformServiceFactory = require("../services/platforms/platformServiceFactory");
        const platformService = PlatformServiceFactory.createService(
          order.platformConnection.platformType,
          order.platformConnection.id
        );

        await platformService.initialize();

        // Use platform-specific acceptance if available, otherwise use status update
        if (typeof platformService.acceptOrder === "function") {
          logger.info("Using platform acceptOrder method", {
            orderId: id,
            platform: order.platformConnection.platformType,
            externalOrderId: order.externalOrderId || order.platformOrderId,
          });

          platformUpdateResult = await platformService.acceptOrder(
            order.externalOrderId || order.platformOrderId
          );

          logger.info("Platform acceptOrder result", {
            orderId: id,
            result: platformUpdateResult,
          });
        } else if (typeof platformService.updateOrderStatus === "function") {
          logger.info("Using platform updateOrderStatus method", {
            orderId: id,
            platform: order.platformConnection.platformType,
          });

          platformUpdateResult = await platformService.updateOrderStatus(
            id,
            "processing"
          );
        } else {
          logger.warn("No platform order acceptance method available", {
            orderId: id,
            platform: order.platformConnection.platformType,
            availableMethods: Object.getOwnPropertyNames(platformService),
          });
        }
      } catch (platformError) {
        logger.warn(
          `Failed to update order status on platform: ${platformError.message}`,
          {
            orderId: id,
            platform: order.platformConnection.platformType,
            error: platformError.message,
          }
        );
        // Don't fail the entire operation if platform update fails
        platformUpdateResult = {
          success: false,
          message: `Order accepted locally, but platform update failed: ${platformError.message}`,
        };
      }
    }

    // Safely serialize the order
    const serializedOrder = safeSerialize(order);

    return res.status(200).json({
      success: true,
      message: "Order accepted successfully",
      data: {
        order: serializedOrder,
        platformUpdate: platformUpdateResult,
      },
    });
  } catch (error) {
    logger.error(`Error accepting order ${req.params.id}:`, error);
    return res.status(500).json({
      success: false,
      message: "Error accepting order",
      error: error.message,
    });
  }
}

/**
 * Get the oldest order date for a specific platform connection
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
async function getOldestOrderDate(req, res) {
  try {
    const { id: userId } = req.user;
    const { platformConnectionId } = req.params;

    logger.info(
      `Getting oldest order date for platform connection ${platformConnectionId}`,
      {
        userId,
        platformConnectionId,
      }
    );

    // Validate platform connection belongs to user
    const connection = await PlatformConnection.findOne({
      where: { id: platformConnectionId, userId },
      attributes: ["id", "platformType", "name"],
    });

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Platform connection not found",
      });
    }

    // Find the oldest order for this connection
    const oldestOrder = await Order.findOne({
      where: {
        userId,
        connectionId: platformConnectionId,
      },
      order: [["orderDate", "ASC"]],
      attributes: ["orderDate", "orderNumber", "id"],
    });

    if (!oldestOrder) {
      return res.status(200).json({
        success: true,
        data: {
          oldestOrderDate: null,
          hasOrders: false,
          message: "No orders found for this platform connection",
        },
      });
    }

    logger.info(
      `Found oldest order for platform connection ${platformConnectionId}`,
      {
        orderId: oldestOrder.id,
        orderNumber: oldestOrder.orderNumber,
        orderDate: oldestOrder.orderDate,
      }
    );

    res.status(200).json({
      success: true,
      data: {
        oldestOrderDate: oldestOrder.orderDate,
        hasOrders: true,
        orderNumber: oldestOrder.orderNumber,
        orderId: oldestOrder.id,
      },
    });
  } catch (error) {
    logger.error("Error getting oldest order date:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get oldest order date",
      error: error.message,
    });
  }
}

module.exports = {
  getAllOrders,
  getOrders: getAllOrders, // Alias for route compatibility
  createOrder,
  getOrderById,
  updateOrder,
  updateOrderStatus,
  cancelOrder,
  syncOrders,
  syncOrdersByPlatform,
  getOrderStats,
  importHepsiburadaOrder,
  getOrderTrends,
  getOrderWithPlatformDetails,
  acceptOrder,
  // Add missing functions that routes expect
  exportOrders: async (req, res) => {
    try {
      // Simple export functionality - can be enhanced later
      const { format = "json" } = req.query;
      const orders = await getAllOrders(req, { json: () => {} });

      if (format === "csv") {
        // Return CSV format
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=orders.csv");
        return res.status(200).send("CSV export not yet implemented");
      }

      return res.status(200).json({
        success: true,
        message: "Orders exported successfully",
        data: orders,
      });
    } catch (error) {
      logger.error("Error exporting orders:", error);
      return res.status(500).json({
        success: false,
        message: "Error exporting orders",
        error: error.message,
      });
    }
  },
  bulkUpdateOrders: async (req, res) => {
    try {
      const { orderIds, updates } = req.body;

      if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Order IDs array is required",
        });
      }

      if (!updates || typeof updates !== "object") {
        return res.status(400).json({
          success: false,
          message: "Updates object is required",
        });
      }

      const result = await Order.update(updates, {
        where: {
          id: orderIds,
          userId: req.user.id,
        },
      });

      return res.status(200).json({
        success: true,
        message: `Successfully updated ${result[0]} orders`,
        data: { updatedCount: result[0] },
      });
    } catch (error) {
      logger.error("Error bulk updating orders:", error);
      return res.status(500).json({
        success: false,
        message: "Error bulk updating orders",
        error: error.message,
      });
    }
  },
  bulkDeleteOrders: async (req, res) => {
    try {
      const { orderIds } = req.body;

      if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Order IDs array is required",
        });
      }

      const deletedCount = await Order.destroy({
        where: {
          id: orderIds,
          userId: req.user.id,
        },
      });

      return res.status(200).json({
        success: true,
        message: `Successfully deleted ${deletedCount} orders`,
        data: { deletedCount },
      });
    } catch (error) {
      logger.error("Error bulk deleting orders:", error);
      return res.status(500).json({
        success: false,
        message: "Error bulk deleting orders",
        error: error.message,
      });
    }
  },
  deleteOrder: async (req, res) => {
    try {
      const { id } = req.params;

      const order = await Order.findOne({
        where: {
          id,
          userId: req.user.id,
        },
        include: [
          { model: OrderItem, as: "items" },
          { model: ShippingDetail, as: "shippingDetail" },
          { model: HepsiburadaOrder, as: "hepsiburadaOrder" },
          { model: TrendyolOrder, as: "trendyolOrder" },
          { model: N11Order, as: "n11Order" },
        ],
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      // Delete order and related records in a transaction
      await sequelize.transaction(async (t) => {
        // Delete order items first
        if (order.items && order.items.length > 0) {
          await OrderItem.destroy({
            where: { orderId: order.id },
            transaction: t,
          });
        }

        // Delete platform-specific records
        if (order.hepsiburadaOrder) {
          await HepsiburadaOrder.destroy({
            where: { orderId: order.id },
            transaction: t,
          });
        }

        if (order.trendyolOrder) {
          await TrendyolOrder.destroy({
            where: { orderId: order.id },
            transaction: t,
          });
        }

        if (order.n11Order) {
          await N11Order.destroy({
            where: { orderId: order.id },
            transaction: t,
          });
        }

        // Delete shipping detail if it exists and is not shared with other orders
        if (order.shippingDetail) {
          const sharedShipping = await Order.findOne({
            where: {
              shippingDetailId: order.shippingDetailId,
              id: { [Op.ne]: order.id },
            },
            transaction: t,
          });

          if (!sharedShipping) {
            // Use the safe shipping detail service for deletion
            const deleteResult = await shippingDetailService.safeDelete(
              order.shippingDetailId,
              { transaction: t }
            );

            if (!deleteResult.success) {
              logger.warn(
                `Could not delete shipping detail ${order.shippingDetailId}: ${deleteResult.message}`,
                {
                  orderId: order.id,
                  shippingDetailId: order.shippingDetailId,
                  error: deleteResult.error,
                  referencingOrders: deleteResult.referencingOrders,
                }
              );
            }
          }
        }

        // Finally delete the main order
        await Order.destroy({
          where: { id: order.id },
          transaction: t,
        });
      });

      logger.info(`Order ${id} deleted successfully by user ${req.user.id}`);

      return res.status(200).json({
        success: true,
        message: "Order deleted successfully",
      });
    } catch (error) {
      logger.error("Error deleting order:", error);
      return res.status(500).json({
        success: false,
        message: "Error deleting order",
        error: error.message,
      });
    }
  },
  bulkEInvoice: async (req, res) => {
    try {
      const { orderIds } = req.body;

      if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Order IDs array is required",
        });
      }

      // Placeholder for bulk e-invoice generation
      return res.status(200).json({
        success: true,
        message: `E-invoice generation initiated for ${orderIds.length} orders`,
        data: { orderIds, status: "processing" },
      });
    } catch (error) {
      logger.error("Error generating bulk e-invoices:", error);
      return res.status(500).json({
        success: false,
        message: "Error generating bulk e-invoices",
        error: error.message,
      });
    }
  },
  generateEInvoice: async (req, res) => {
    try {
      const { id } = req.params;

      const order = await Order.findOne({
        where: {
          id,
          userId: req.user.id,
        },
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      // Placeholder for e-invoice generation
      // Mark invoice as printed
      await order.update({
        invoicePrinted: true,
        invoicePrintedAt: new Date(),
      });

      return res.status(200).json({
        success: true,
        message: "E-invoice generated successfully",
        data: { orderId: id, status: "generated" },
      });
    } catch (error) {
      logger.error("Error generating e-invoice:", error);
      return res.status(500).json({
        success: false,
        message: "Error generating e-invoice",
        error: error.message,
      });
    }
  },

  /**
   * Get the oldest order date for a specific platform connection
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  getOldestOrderDate: async (req, res) => {
    try {
      const { id: userId } = req.user;
      const { platformConnectionId } = req.params;

      logger.info(
        `Getting oldest order date for platform connection ${platformConnectionId}`,
        {
          userId,
          platformConnectionId,
        }
      );

      // Validate platform connection belongs to user
      const connection = await PlatformConnection.findOne({
        where: { id: platformConnectionId, userId },
        attributes: ["id", "platformType", "name"],
      });

      if (!connection) {
        return res.status(404).json({
          success: false,
          message: "Platform connection not found",
        });
      }

      // Find the oldest order for this connection
      const oldestOrder = await Order.findOne({
        where: {
          userId,
          connectionId: platformConnectionId,
        },
        order: [["orderDate", "ASC"]],
        attributes: ["orderDate", "orderNumber", "id"],
      });

      if (!oldestOrder) {
        return res.status(200).json({
          success: true,
          data: {
            oldestOrderDate: null,
            hasOrders: false,
            message: "No orders found for this platform connection",
          },
        });
      }

      logger.info(
        `Found oldest order for platform connection ${platformConnectionId}`,
        {
          orderId: oldestOrder.id,
          orderNumber: oldestOrder.orderNumber,
          orderDate: oldestOrder.orderDate,
        }
      );

      res.status(200).json({
        success: true,
        data: {
          oldestOrderDate: oldestOrder.orderDate,
          hasOrders: true,
          orderNumber: oldestOrder.orderNumber,
          orderId: oldestOrder.id,
        },
      });
    } catch (error) {
      logger.error("Error getting oldest order date:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get oldest order date",
        error: error.message,
      });
    }
  },
};
