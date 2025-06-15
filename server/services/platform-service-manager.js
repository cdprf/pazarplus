const PlatformServiceFactory = require("../modules/order-management/services/platforms/platformServiceFactory");

class PlatformServiceManager {
  constructor() {
    // Don't create services in constructor, create them on demand
    this.serviceInstances = new Map();
  }

  // Enhanced method to get service by platform type
  getService(platformType, connectionId = null, directCredentials = null) {
    const serviceKey = `${platformType.toLowerCase()}-${
      connectionId || "default"
    }`;

    if (!this.serviceInstances.has(serviceKey)) {
      const service = PlatformServiceFactory.createService(
        platformType,
        connectionId,
        directCredentials
      );
      this.serviceInstances.set(serviceKey, service);
    }

    return this.serviceInstances.get(serviceKey);
  }

  // Enhanced order fetching with better error handling and data normalization
  async fetchOrders(connection, options = {}) {
    try {
      const service = this.getService(connection.platformType, connection.id);

      // Validate connection credentials
      if (!this.validateConnection(connection)) {
        throw new Error(
          `Invalid connection configuration for ${connection.platformType}`
        );
      }

      // Set default options
      const fetchOptions = {
        startDate:
          options.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        endDate: options.endDate || new Date(),
        limit: options.limit || 200,
        offset: options.offset || 0,
        status: options.status || null,
        ...options,
      };

      console.log(
        `Fetching orders from ${connection.platformType} with options:`,
        fetchOptions
      );

      // Fetch orders from the platform
      const platformOrders = await service.getOrders(connection, fetchOptions);

      // Normalize the orders to our standard format
      const normalizedOrders = await this.normalizeOrders(
        platformOrders,
        connection
      );

      return {
        success: true,
        data: normalizedOrders,
        total: platformOrders.length,
        platform: connection.platformType,
        connectionId: connection.id,
      };
    } catch (error) {
      console.error(
        `Error fetching orders from ${connection.platformType}:`,
        error
      );

      return {
        success: false,
        error: error.message,
        data: [],
        total: 0,
        platform: connection.platformType,
        connectionId: connection.id,
      };
    }
  }

  // Enhanced order normalization with comprehensive field mapping
  async normalizeOrders(platformOrders, connection) {
    const normalizedOrders = [];

    for (const order of platformOrders) {
      try {
        const normalizedOrder = await this.normalizeOrder(order, connection);
        if (normalizedOrder) {
          normalizedOrders.push(normalizedOrder);
        }
      } catch (error) {
        console.warn(
          `Failed to normalize order ${order.id || order.orderNumber}:`,
          error
        );
        // Continue with other orders instead of failing completely
      }
    }

    return normalizedOrders;
  }

  // Enhanced single order normalization
  async normalizeOrder(order, connection) {
    const platformType = connection.platformType.toLowerCase();

    let normalized = {
      // Standard fields that should exist for all platforms
      platformOrderId: this.extractPlatformOrderId(order, platformType),
      orderNumber: this.extractOrderNumber(order, platformType),
      orderDate: this.extractOrderDate(order, platformType),
      orderStatus: this.normalizeStatus(
        this.extractStatus(order, platformType),
        platformType
      ),

      // Customer information
      customerId: this.extractCustomerId(order, platformType),
      customerName: this.extractCustomerName(order, platformType),
      customerEmail: this.extractCustomerEmail(order, platformType),
      customerPhone: this.extractCustomerPhone(order, platformType),

      // Financial information
      totalAmount: this.extractTotalAmount(order, platformType),
      currency: this.extractCurrency(order, platformType) || "TRY",
      taxAmount: this.extractTaxAmount(order, platformType) || 0,
      discountAmount: this.extractDiscountAmount(order, platformType) || 0,
      shippingAmount: this.extractShippingAmount(order, platformType) || 0,

      // Platform and connection info
      platform: platformType,
      connectionId: connection.id,

      // Additional metadata
      metadata: {
        originalData: order,
        syncedAt: new Date(),
        platformSpecific: this.extractPlatformSpecific(order, platformType),
      },
    };

    // Extract shipping address
    const shippingAddress = this.extractShippingAddress(order, platformType);
    if (shippingAddress) {
      normalized.shippingAddress = shippingAddress;
    }

    // Extract billing address
    const billingAddress = this.extractBillingAddress(order, platformType);
    if (billingAddress) {
      normalized.billingAddress = billingAddress;
    }

    // Extract order items
    const items = this.extractOrderItems(order, platformType);
    if (items && items.length > 0) {
      normalized.items = items;
    }

    // Extract tracking information if available
    const trackingInfo = this.extractTrackingInfo(order, platformType);
    if (trackingInfo) {
      normalized.trackingInfo = trackingInfo;
    }

    return normalized;
  }

  // Platform-specific field extraction methods
  extractPlatformOrderId(order, platform) {
    switch (platform) {
      case "trendyol":
        return order.orderNumber || order.id;
      case "hepsiburada":
        return order.orderNumber || order.id;
      case "n11":
        return order.orderNumber || order.id;
      default:
        return order.id || order.orderNumber;
    }
  }

  extractOrderNumber(order, platform) {
    switch (platform) {
      case "trendyol":
        return order.orderNumber || order.id?.toString();
      case "hepsiburada":
        return order.orderNumber || order.id?.toString();
      case "n11":
        return order.orderNumber || order.id?.toString();
      default:
        return order.orderNumber || order.id?.toString();
    }
  }

  extractOrderDate(order, platform) {
    let dateField;

    switch (platform) {
      case "trendyol":
        dateField = order.orderDate || order.createdDate || order.createDate;
        break;
      case "hepsiburada":
        dateField = order.orderDate || order.createdDate;
        break;
      case "n11":
        dateField = order.orderDate || order.createDate;
        break;
      default:
        dateField = order.orderDate || order.createdDate || order.createDate;
    }

    if (!dateField) return new Date();

    // Handle different date formats
    if (typeof dateField === "string") {
      return new Date(dateField);
    }

    if (typeof dateField === "number") {
      // Assume timestamp
      return new Date(dateField);
    }

    return new Date(dateField);
  }

  extractStatus(order, platform) {
    switch (platform) {
      case "trendyol":
        return order.orderStatus || order.orderStatus || order.state;
      case "hepsiburada":
        return order.orderStatus || order.orderStatus;
      case "n11":
        return order.orderStatus || order.orderStatus;
      default:
        return order.orderStatus || order.orderStatus;
    }
  }

  // Enhanced status normalization - delegates to platform services for consistency
  normalizeStatus(platformStatus, platform) {
    if (!platformStatus) return "pending";

    // Use platform-specific service mappings for consistency
    try {
      const service = this.getService(platform);
      if (service && typeof service.mapOrderStatus === "function") {
        return service.mapOrderStatus(platformStatus);
      }
    } catch (error) {
      console.warn(
        `Could not get platform service for ${platform}:`,
        error.message
      );
    }

    // Fallback to common status mappings if service is not available
    const status = platformStatus.toLowerCase();
    const commonStatusMappings = {
      created: "new",
      new: "new",
      confirmed: "pending",
      approved: "pending",
      preparing: "processing",
      picking: "processing",
      packaged: "shipped",
      shipped: "shipped",
      intransit: "shipped",
      in_transit: "shipped",
      delivered: "delivered",
      cancelled: "cancelled",
      returned: "returned",
      refunded: "refunded",
      failed: "failed",
      undelivered: "failed",
    };

    return commonStatusMappings[status] || "unknown";
  }

  extractCustomerName(order, platform) {
    switch (platform) {
      case "trendyol":
        if (order.customer) {
          return `${order.customer.firstName || ""} ${
            order.customer.lastName || ""
          }`.trim();
        }
        if (order.shippingAddress) {
          return `${order.shippingAddress.firstName || ""} ${
            order.shippingAddress.lastName || ""
          }`.trim();
        }
        return order.customerName || "Unknown Customer";

      case "hepsiburada":
        if (order.customer) {
          return `${order.customer.firstName || ""} ${
            order.customer.lastName || ""
          }`.trim();
        }
        return order.customerName || "Unknown Customer";

      case "n11":
        if (order.buyer) {
          return (
            order.buyer.fullName ||
            `${order.buyer.firstName || ""} ${
              order.buyer.lastName || ""
            }`.trim()
          );
        }
        return order.customerName || "Unknown Customer";

      default:
        return order.customerName || "Unknown Customer";
    }
  }

  extractCustomerEmail(order, platform) {
    switch (platform) {
      case "trendyol":
        return order.customer?.email || order.customerEmail;
      case "hepsiburada":
        return order.customer?.email || order.customerEmail;
      case "n11":
        return order.buyer?.email || order.customerEmail;
      default:
        return order.customerEmail;
    }
  }

  extractCustomerPhone(order, platform) {
    switch (platform) {
      case "trendyol":
        return (
          order.customer?.phone ||
          order.shippingAddress?.phone ||
          order.customerPhone
        );
      case "hepsiburada":
        return order.customer?.phone || order.customerPhone;
      case "n11":
        return order.buyer?.phone || order.customerPhone;
      default:
        return order.customerPhone;
    }
  }

  extractTotalAmount(order, platform) {
    let amount;

    switch (platform) {
      case "trendyol":
        amount = order.totalPrice || order.totalAmount || order.amount;
        break;
      case "hepsiburada":
        amount = order.totalAmount || order.totalPrice;
        break;
      case "n11":
        amount = order.totalAmount || order.totalPrice;
        break;
      default:
        amount = order.totalAmount || order.totalPrice;
    }

    return parseFloat(amount) || 0;
  }

  extractCurrency(order, platform) {
    switch (platform) {
      case "trendyol":
        return order.currency || order.currencyCode || "TRY";
      case "hepsiburada":
        return order.currency || "TRY";
      case "n11":
        return order.currency || "TRY";
      default:
        return order.currency || "TRY";
    }
  }

  extractShippingAddress(order, platform) {
    let address;

    switch (platform) {
      case "trendyol":
        address = order.shippingAddress || order.deliveryAddress;
        break;
      case "hepsiburada":
        address = order.shippingAddress;
        break;
      case "n11":
        address = order.shippingAddress || order.deliveryAddress;
        break;
      default:
        address = order.shippingAddress;
    }

    if (!address) return null;

    return {
      firstName: address.firstName || "",
      lastName: address.lastName || "",
      company: address.company || "",
      address1:
        address.address1 || address.street || address.addressLine1 || "",
      address2: address.address2 || address.addressLine2 || "",
      city: address.city || "",
      district: address.district || address.state || "",
      neighborhood: address.neighborhood || "",
      postalCode: address.postalCode || address.zipCode || "",
      country: address.country || address.countryCode || "TR",
      phone: address.phone || "",
      fullName: `${address.firstName || ""} ${address.lastName || ""}`.trim(),
    };
  }

  extractOrderItems(order, platform) {
    let items;

    switch (platform) {
      case "trendyol":
        items = order.lines || order.orderLines || order.items;
        break;
      case "hepsiburada":
        items = order.items || order.orderLines;
        break;
      case "n11":
        items = order.items || order.orderItems;
        break;
      default:
        items = order.items || order.lines;
    }

    if (!items || !Array.isArray(items)) return [];

    return items.map((item) => this.normalizeOrderItem(item, platform));
  }

  normalizeOrderItem(item, platform) {
    const normalized = {
      id: item.id || item.orderLineId,
      productId: item.productId,
      productName: item.productName || item.name,
      sku: item.sku || item.merchantSku,
      barcode: item.barcode,
      quantity: parseInt(item.quantity) || 1,
      unitPrice: parseFloat(item.unitPrice || item.price) || 0,
      totalPrice: parseFloat(item.totalPrice || item.amount) || 0,
      currency: item.currency || item.currencyCode || "TRY",
    };

    // Platform-specific item fields
    switch (platform) {
      case "trendyol":
        normalized.merchantSku = item.merchantSku;
        normalized.productCode = item.productCode;
        normalized.productColor = item.productColor;
        normalized.productSize = item.productSize;
        normalized.discount = parseFloat(item.discount) || 0;
        normalized.status = item.orderLineItemStatusName;
        break;

      case "hepsiburada":
        normalized.hepsiburadaSku = item.hepsiburadaSku;
        normalized.merchantSku = item.merchantSku;
        break;

      case "n11":
        normalized.productSellerCode = item.productSellerCode;
        break;
    }

    return normalized;
  }

  extractTrackingInfo(order, platform) {
    switch (platform) {
      case "trendyol":
        if (order.shipmentPackageStatus) {
          return {
            trackingNumber: order.shipmentPackageStatus.trackingNumber,
            trackingUrl: order.shipmentPackageStatus.trackingUrl,
            carrier: order.shipmentPackageStatus.carrier,
            status: order.shipmentPackageStatus.status,
          };
        }
        break;

      case "hepsiburada":
        if (order.tracking) {
          return {
            trackingNumber: order.tracking.trackingNumber,
            carrier: order.tracking.carrier,
          };
        }
        break;

      case "n11":
        if (order.shippingInfo) {
          return {
            trackingNumber: order.shippingInfo.trackingNumber,
            carrier: order.shippingInfo.shippingCompany,
          };
        }
        break;
    }

    return null;
  }

  extractPlatformSpecific(order, platform) {
    // Store platform-specific data that doesn't fit our standard schema
    const specific = {};

    switch (platform) {
      case "trendyol":
        specific.fastDelivery = order.fastDelivery;
        specific.scheduled = order.scheduled;
        specific.invoiceRequested = order.invoiceRequested;
        specific.giftMessage = order.giftMessage;
        break;

      case "hepsiburada":
        specific.isFastDelivery = order.isFastDelivery;
        specific.isGift = order.isGift;
        break;

      case "n11":
        specific.paymentType = order.paymentType;
        specific.installment = order.installment;
        break;
    }

    return specific;
  }

  // Enhanced connection validation
  validateConnection(connection) {
    if (!connection || !connection.platformType) {
      return false;
    }

    const platform = connection.platformType.toLowerCase();

    switch (platform) {
      case "trendyol":
        return !!(
          connection.credentials?.apiKey &&
          connection.credentials?.apiSecret &&
          connection.credentials?.supplierId
        );

      case "hepsiburada":
        return !!(
          connection.credentials?.username &&
          connection.credentials?.password &&
          connection.credentials?.merchantId
        );

      case "n11":
        return !!(
          connection.credentials?.apiKey && connection.credentials?.secretKey
        );

      default:
        return false;
    }
  }

  // Enhanced method to test platform connections
  async testConnection(connection) {
    try {
      const service = this.getService(connection.platformType);

      if (!this.validateConnection(connection)) {
        return {
          success: false,
          message: "Invalid connection credentials",
        };
      }

      // Try to fetch a small number of orders to test the connection
      const result = await service.getOrders(connection, { limit: 1 });

      return {
        success: true,
        message: "Connection successful",
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error,
      };
    }
  }

  // Method to get all supported platforms
  getSupportedPlatforms() {
    return Object.keys(this.services);
  }

  // Enhanced method to sync orders with better progress tracking
  async syncOrdersForConnection(connection, options = {}) {
    const startTime = Date.now();

    try {
      console.log(
        `Starting order sync for ${connection.platformType} (${connection.name})`
      );

      const result = await this.fetchOrders(connection, options);

      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(
        `Order sync completed for ${connection.platformType} in ${duration}ms`,
        {
          success: result.success,
          totalOrders: result.total,
          platform: result.platform,
        }
      );

      return {
        ...result,
        syncDuration: duration,
        syncedAt: new Date(endTime),
      };
    } catch (error) {
      console.error(`Order sync failed for ${connection.platformType}:`, error);

      return {
        success: false,
        error: error.message,
        data: [],
        total: 0,
        platform: connection.platformType,
        connectionId: connection.id,
        syncDuration: Date.now() - startTime,
        syncedAt: new Date(),
      };
    }
  }

  // Helper methods for extracting additional fields
  extractCustomerId(order, platform) {
    switch (platform) {
      case "trendyol":
        return order.customer?.id || order.customerId;
      case "hepsiburada":
        return order.customer?.id || order.customerId;
      case "n11":
        return order.buyer?.id || order.customerId;
      default:
        return order.customerId;
    }
  }

  extractTaxAmount(order, platform) {
    switch (platform) {
      case "trendyol":
        return parseFloat(order.taxAmount || order.tax) || 0;
      case "hepsiburada":
        return parseFloat(order.taxAmount) || 0;
      case "n11":
        return parseFloat(order.taxAmount) || 0;
      default:
        return parseFloat(order.taxAmount || order.tax) || 0;
    }
  }

  extractDiscountAmount(order, platform) {
    switch (platform) {
      case "trendyol":
        return parseFloat(order.discountAmount || order.discount) || 0;
      case "hepsiburada":
        return parseFloat(order.discountAmount) || 0;
      case "n11":
        return parseFloat(order.discountAmount) || 0;
      default:
        return parseFloat(order.discountAmount || order.discount) || 0;
    }
  }

  extractShippingAmount(order, platform) {
    switch (platform) {
      case "trendyol":
        return parseFloat(order.shippingAmount || order.cargoPrice) || 0;
      case "hepsiburada":
        return parseFloat(order.shippingAmount) || 0;
      case "n11":
        return parseFloat(order.shippingAmount) || 0;
      default:
        return parseFloat(order.shippingAmount) || 0;
    }
  }

  extractBillingAddress(order, platform) {
    let address;

    switch (platform) {
      case "trendyol":
        address = order.billingAddress || order.invoiceAddress;
        break;
      case "hepsiburada":
        address = order.billingAddress;
        break;
      case "n11":
        address = order.billingAddress;
        break;
      default:
        address = order.billingAddress;
    }

    if (!address) return null;

    return {
      firstName: address.firstName || "",
      lastName: address.lastName || "",
      company: address.company || "",
      address1: address.address1 || address.street || "",
      address2: address.address2 || "",
      city: address.city || "",
      district: address.district || address.state || "",
      postalCode: address.postalCode || address.zipCode || "",
      country: address.country || address.countryCode || "TR",
      phone: address.phone || "",
      taxNumber: address.taxNumber || "",
      taxOffice: address.taxOffice || "",
    };
  }
}

module.exports = PlatformServiceManager;
