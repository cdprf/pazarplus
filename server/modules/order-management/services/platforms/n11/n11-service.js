/**
 * N11 Platform Service
 * Implements the N11 REST API for order management
 * Updated with all REST API endpoints from N11 documentation
 */

const axios = require("axios");
const {
  Order,
  OrderItem,
  User,
  PlatformConnection,
} = require("../../../../../models");
const logger = require("../../../../../utils/logger");

const BasePlatformService = require("../BasePlatformService");

// N11 API Constants
const N11_API = {
  BASE_URL: "https://api.n11.com",
  ENDPOINTS: {
    // Order Management
    ORDERS: "/rest/delivery/v1/shipmentPackages",
    ORDER_DETAIL: "/rest/delivery/v1/shipmentPackages/{id}",
    UPDATE_ORDER: "/rest/delivery/v1/shipmentPackages/{id}",
    ACCEPT_ORDER: "/rest/delivery/v1/shipmentPackages/{id}/accept",
    REJECT_ORDER: "/rest/delivery/v1/shipmentPackages/{id}/reject",
    SHIP_ORDER: "/rest/delivery/v1/shipmentPackages/{id}/ship",
    DELIVER_ORDER: "/rest/delivery/v1/shipmentPackages/{id}/delivery",
    SPLIT_PACKAGE:
      "/rest/delivery/v1/shipmentPackages/{id}/splitCombinePackage",
    LABOR_COST: "/rest/delivery/v1/shipmentPackages/{id}/laborCost",

    // Product Management
    PRODUCTS: "/ms/product-query",
    PRODUCT_DETAIL: "/product/v1/detail",
    PRODUCT_QUERY: "/product/v1/getProductQuery",

    // Category Management
    CATEGORIES: "/cdn/categories",
    CATEGORY_ATTRIBUTES: "/cdn/categories/{categoryId}/attributes",

    // Catalog Service
    CATALOG_SEARCH: "/catalog/v1/search",
    CATALOG_UPLOAD: "/catalog/v1/upload",

    // Return Management
    RETURNS: "/return/v1/list",
    RETURN_APPROVE: "/return/v1/approve",
    RETURN_REJECT: "/return/v1/reject",
    RETURN_POSTPONE: "/return/v1/postpone",

    // Delivery Management
    SHIPMENT_PACKAGES: "/delivery/v1/shipmentPackages",
    ONLINE_DELIVERY_UPDATE: "/delivery/v1/onlineDeliveryUpdate",
  },
};

class N11Service extends BasePlatformService {
  constructor(connectionId, directCredentials = null) {
    super(connectionId);
    this.directCredentials = directCredentials;
    this.apiUrl = N11_API.BASE_URL;
    this.logger = this.getLogger();
  }

  /**
   * Get the platform type
   * @returns {string} Platform type
   */
  getPlatformType() {
    return "n11";
  }

  /**
   * Find connection in database or use direct credentials
   * Override to handle direct credentials case
   * @returns {Promise<Object>} Connection object
   */
  async findConnection() {
    if (this.directCredentials) {
      return { credentials: JSON.stringify(this.directCredentials) };
    } else {
      return await super.findConnection();
    }
  }

  /**
   * Setup Axios instance with N11-specific headers and config
   * Implementation of abstract method from BasePlatformService
   */
  async setupAxiosInstance() {
    const credentials = this.decryptCredentials(this.connection.credentials);
    const { appKey, appSecret } = credentials;

    // Validate required credentials
    if (!appKey || !appSecret) {
      throw new Error(
        "Missing required N11 credentials. App key and app secret are required."
      );
    }

    this.axiosInstance = axios.create({
      baseURL: N11_API.BASE_URL,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        appkey: appKey,
        appsecret: appSecret,
      },
      timeout: 30000,
    });

    return true;
  }

  /**
   * Override decryptCredentials for N11-specific format
   * @param {string|object} encryptedCredentials
   * @returns {object} Decrypted credentials
   */
  decryptCredentials(encryptedCredentials) {
    try {
      const credentials = super.decryptCredentials(encryptedCredentials);

      return {
        appKey: credentials.apiKey,
        appSecret: credentials.apiSecret,
        endpointUrl: credentials.endpointUrl || N11_API.BASE_URL,
      };
    } catch (error) {
      this.logger.error(`Failed to decrypt N11 credentials: ${error.message}`, {
        error,
      });
      throw new Error("Failed to decrypt credentials");
    }
  }

  /**
   * Test the connection to N11
   * @returns {Promise<Object>} Test result
   */
  async testConnection() {
    try {
      await this.initialize();
      const credentials = this.decryptCredentials(this.connection.credentials);

      if (!credentials.appKey || !credentials.appSecret) {
        return {
          success: false,
          message:
            "Connection failed: App key or app secret is missing from credentials",
          error: "Missing required parameters",
        };
      }

      this.logger.debug(
        `Testing N11 connection with appKey: ${credentials.appKey}`
      );

      try {
        // Test connection by fetching categories (lightweight operation)
        const response = await this.retryRequest(() =>
          this.axiosInstance.get(N11_API.ENDPOINTS.CATEGORIES)
        );

        if (
          response.data &&
          response.data.result &&
          response.data.result.status === "success"
        ) {
          return {
            success: true,
            message: "Connection successful",
            data: {
              platform: "n11",
              connectionId: this.connectionId,
              status: "active",
            },
          };
        } else {
          throw new Error(
            response.data?.result?.errorMessage || "Connection test failed"
          );
        }
      } catch (requestError) {
        this.logger.error("N11 API request failed", {
          error: requestError.message,
          status: requestError.response?.status,
          data: requestError.response?.data,
        });

        let errorMessage = requestError.message;
        const errorData = requestError.response?.data;

        if (errorData && errorData.result && errorData.result.errorMessage) {
          errorMessage = errorData.result.errorMessage;
        }

        throw new Error(errorMessage);
      }
    } catch (error) {
      this.logger.error(`N11 connection test failed: ${error.message}`, {
        error,
        connectionId: this.connectionId,
      });

      return {
        success: false,
        message: `Connection failed: ${error.message}`,
        error: error.response?.data || error.message,
      };
    }
  }

  /**
   * Fetch orders from N11
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Result containing order data
   */
  async fetchOrders(params = {}) {
    try {
      await this.initialize();

      // Default parameters for N11 order list API
      const defaultParams = {
        startDate: params.startDate || this.getDefaultStartDate(),
        endDate: params.endDate || this.getDefaultEndDate(),
        page: params.page,
        size: params.size || 50,
      };

      const queryParams = { ...defaultParams, ...params };

      this.logger.debug(
        `Fetching N11 orders with params: ${JSON.stringify(queryParams)}`
      );

      const response = await this.retryRequest(() =>
        this.axiosInstance.post(N11_API.ENDPOINTS.ORDERS, queryParams)
      );

      const resultStatus =
        response.data &&
        response.data.result &&
        typeof response.data.result.status !== "undefined"
          ? response.data.result.status
          : null;

      if (resultStatus !== "success") {
        return {
          success: false,
          message:
            (response.data &&
              response.data.result &&
              response.data.result.errorMessage) ||
            "Failed to fetch orders from N11",
          data: [],
        };
      }

      const orders = response.data.orderList || [];

      this.logger.info(`Retrieved ${orders.length} orders from N11`);

      const normalizeResult = await this.normalizeOrders(orders);

      return {
        success: true,
        message: `Successfully fetched ${normalizeResult.data.length} orders from N11`,
        data: normalizeResult.data,
        stats: normalizeResult.stats,
        pagination: response.data.pagingData
          ? {
              page: response.data.pagingData.currentPage || 0,
              size:
                response.data.pagingData.pageSize ||
                queryParams.pagingData.pageSize,
              totalPages: Math.ceil(
                (response.data.pagingData.totalCount || 0) /
                  (response.data.pagingData.pageSize || 50)
              ),
              totalElements:
                response.data.pagingData.totalCount || orders.length,
            }
          : undefined,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch orders from N11: ${error.message}`, {
        error,
        connectionId: this.connectionId,
      });

      return {
        success: false,
        message: `Failed to fetch orders: ${error.message}`,
        error: error.response?.data || error.message,
        data: [],
      };
    }
  }

  /**
   * Normalize N11 orders to internal format
   * @param {Array} n11Orders - Orders from N11 API
   * @returns {Promise<Object>} Normalized orders with statistics
   */
  async normalizeOrders(n11Orders) {
    const normalizedOrders = [];
    let successCount = 0;
    let skippedCount = 0;
    let updatedCount = 0;

    try {
      const { sequelize } = require("../../../../../models");
      const { Op } = require("sequelize");

      for (const order of n11Orders) {
        try {
          const phoneNumber = this.extractPhoneNumber(order);

          // Check if order already exists
          const existingOrder = await Order.findOne({
            where: {
              connectionId: this.connectionId,
              externalOrderId: order.id.toString(),
            },
          });

          if (existingOrder) {
            // Update existing order
            try {
              await existingOrder.update({
                status: this.mapOrderStatus(order.shipmentPackageStatus),
                rawData: JSON.stringify(order),
                lastSyncedAt: new Date(),
              });

              updatedCount++;
              normalizedOrders.push(existingOrder);
              continue;
            } catch (updateError) {
              this.logger.error(
                `Failed to update existing order ${order.id}: ${updateError.message}`,
                {
                  error: updateError,
                  orderId: order.id,
                  connectionId: this.connectionId,
                }
              );
              skippedCount++;
              continue;
            }
          }

          // Create new order
          const result = await sequelize.transaction(async (t) => {
            // Create shipping detail first
            const { ShippingDetail } = require("../../../../../models");
            const shippingDetail = await ShippingDetail.create(
              {
                recipientName: order.shippingAddress?.fullName || "",
                address1: order.shippingAddress?.address || "",
                city: order.shippingAddress?.city || "",
                state: order.shippingAddress?.district || "",
                postalCode: order.shippingAddress?.postalCode || "",
                country: "Turkey",
                phone: phoneNumber || "",
                email: order.customerEmail || "",
              },
              { transaction: t }
            );

            // Create the order record
            const normalizedOrder = await Order.create(
              {
                externalOrderId: order.id.toString(),
                connectionId: this.connectionId,
                userId: this.connection.userId,
                customerName: order.customerFullName || "Unknown",
                customerEmail: order.customerEmail || "",
                customerPhone: phoneNumber || "",
                orderDate: new Date(
                  order.packageHistories[0]?.createdDate ||
                    order.lastModifiedDate
                ),
                orderNumber: order.orderNumber || "",
                platform: "n11",
                orderStatus: this.mapOrderStatus(order.shipmentPackageStatus),
                totalAmount: parseFloat(order.totalAmount || 0),
                currency: "TRY",
                shippingDetailId: shippingDetail.id,
                paymentStatus: "done",
                rawData: JSON.stringify(order),
                lastSyncedAt: new Date(),
              },
              { transaction: t }
            );

            // Create order items
            if (order.lines && Array.isArray(order.lines)) {
              for (const item of order.lines) {
                await OrderItem.create(
                  {
                    orderId: normalizedOrder.id,
                    externalProductId:
                      item.productId?.toString() || item.id?.toString(),
                    name: item.productName || item.title,
                    sku: item.stockCode || item.sellerStockCode,
                    quantity: parseInt(item.quantity || 1, 10),
                    unitPrice: parseFloat(item.price || 0),
                    totalPrice: parseFloat(
                      item.dueAmount || item.price * item.quantity || 0
                    ),
                    discount: parseFloat(item.discount || 0),
                    options: item.attributes
                      ? {
                          attributes: item.attributes,
                        }
                      : null,
                    metadata: {
                      platformData: item,
                    },
                  },
                  { transaction: t }
                );
              }
            }

            // Create N11-specific order record
            await this.createN11OrderRecord(normalizedOrder.id, order, t);

            return normalizedOrder;
          });

          normalizedOrders.push(result);
          successCount++;
        } catch (error) {
          this.logger.error(
            `Failed to process order ${order.id}: ${error.message}`,
            {
              error,
              orderId: order.id,
              connectionId: this.connectionId,
            }
          );
          skippedCount++;
        }
      }

      return {
        success: true,
        message: `Successfully processed ${successCount} orders (${updatedCount} updated, ${skippedCount} skipped)`,
        data: normalizedOrders,
        stats: {
          total: n11Orders.length,
          success: successCount,
          updated: updatedCount,
          skipped: skippedCount,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to normalize orders: ${error.message}`, {
        error,
        connectionId: this.connectionId,
      });
      throw error;
    }
  }

  /**
   * Map N11 API status to N11Order model status enum
   * @param {string} apiStatus - Status from N11 API
   * @returns {string} N11Order model status
   */
  mapOrderStatus(apiStatus) {
    const statusMap = {
      Created: "Olusturuldu",
      Picking: "Hazirlaniyor",
      Shipped: "Kargoya_Verildi",
      Cancelled: "Iptal_Edildi",
      Delivered: "Teslim_Edildi",
      UnPacked: "Paketlenmedi",
      UnSupplied: "Temin_Edilmedi",
    };

    return statusMap[apiStatus] || "Yeni";
  }

  /**
   * Map payment type to N11Order model enum
   * @param {string} paymentType - Payment type from N11 API
   * @returns {string} N11Order model payment type
   */
  mapPaymentType(paymentType) {
    const paymentMap = {
      CreditCard: "Kredi_Karti",
      BankTransfer: "Havale_EFT",
      CashOnDelivery: "Kapida_Odeme",
      N11Wallet: "N11_Cuzdan",
    };

    return paymentMap[paymentType] || "Kredi_Karti";
  }

  /**
   * Map payment status to N11Order model enum
   * @param {string} paymentStatus - Payment status from N11 API
   * @returns {string} N11Order model payment status
   */
  mapPaymentStatus(paymentStatus) {
    const statusMap = {
      Pending: "Bekliyor",
      Confirmed: "Onaylandi",
      Cancelled: "Iptal_Edildi",
    };

    return statusMap[paymentStatus] || "Bekliyor";
  }

  /**
   * Test the connection to N11
   * @returns {Promise<Object>} Test result
   */
  async testConnection() {
    try {
      await this.initialize();
      const credentials = this.decryptCredentials(this.connection.credentials);

      if (!credentials.appKey || !credentials.appSecret) {
        return {
          success: false,
          message:
            "Connection failed: App key or app secret is missing from credentials",
          error: "Missing required parameters",
        };
      }

      this.logger.debug(
        `Testing N11 connection with appKey: ${credentials.appKey}`
      );

      try {
        // Test connection by fetching categories (lightweight operation)
        const response = await this.retryRequest(() =>
          this.axiosInstance.get(N11_API.ENDPOINTS.CATEGORIES)
        );

        if (
          response.data &&
          response.data.result &&
          response.data.result.status === "success"
        ) {
          return {
            success: true,
            message: "Connection successful",
            data: {
              platform: "n11",
              connectionId: this.connectionId,
              status: "active",
            },
          };
        } else {
          throw new Error(
            response.data?.result?.errorMessage || "Connection test failed"
          );
        }
      } catch (requestError) {
        this.logger.error("N11 API request failed", {
          error: requestError.message,
          status: requestError.response?.status,
          data: requestError.response?.data,
        });

        let errorMessage = requestError.message;
        const errorData = requestError.response?.data;

        if (errorData && errorData.result && errorData.result.errorMessage) {
          errorMessage = errorData.result.errorMessage;
        }

        throw new Error(errorMessage);
      }
    } catch (error) {
      this.logger.error(`N11 connection test failed: ${error.message}`, {
        error,
        connectionId: this.connectionId,
      });

      return {
        success: false,
        message: `Connection failed: ${error.message}`,
        error: error.response?.data || error.message,
      };
    }
  }

  /**
   * Fetch orders from N11
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Result containing order data
   */
  async fetchOrders(params = {}) {
    try {
      await this.initialize();

      // Default parameters for N11 order list API
      const defaultParams = {
        status: params.status || "Confirmed",
        startDate: params.startDate || this.getDefaultStartDate(),
        endDate: params.endDate || this.getDefaultEndDate(),
        page: params.page || 0,
        size: params.size || 50,
      };

      const queryParams = { ...defaultParams, ...params };

      this.logger.debug(
        `Fetching N11 orders with params: ${JSON.stringify(queryParams)}`
      );

      const response = await this.retryRequest(() =>
        this.axiosInstance.get(N11_API.ENDPOINTS.ORDERS, queryParams)
      );

      if (!response.data.content || response.data.pageCount === 0) {
        return {
          success: false,
          message:
            response.data.content?.result?.errorMessage ||
            "Failed to fetch orders from N11",
          data: [],
        };
      }

      const orders = response.data.content || [];

      this.logger.info(`Retrieved ${orders.length} orders from N11`);

      const normalizeResult = await this.normalizeOrders(orders);

      return {
        success: true,
        message: `Successfully fetched ${normalizeResult.data.length} orders from N11`,
        data: normalizeResult.data,
        stats: normalizeResult.stats,
        pagination: response.data.pagingData
          ? {
              page: response.data.pagingData.currentPage || 0,
              size:
                response.data.pagingData.pageSize ||
                queryParams.pagingData.pageSize,
              totalPages: Math.ceil(
                (response.data.pagingData.totalCount || 0) /
                  (response.data.pagingData.pageSize || 50)
              ),
              totalElements:
                response.data.pagingData.totalCount || orders.length,
            }
          : undefined,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch orders from N11: ${error.message}`, {
        error,
        connectionId: this.connectionId,
      });

      return {
        success: false,
        message: `Failed to fetch orders: ${error.message}`,
        error: error.response?.data || error.message,
        data: [],
      };
    }
  }

  /**
   * Normalize N11 orders to internal format
   * @param {Array} n11Orders - Orders from N11 API
   * @returns {Promise<Object>} Normalized orders with statistics
   */
  async normalizeOrders(n11Orders) {
    const normalizedOrders = [];
    let successCount = 0;
    let skippedCount = 0;
    let updatedCount = 0;

    try {
      const { sequelize } = require("../../../../../models");
      const { Op } = require("sequelize");

      for (const order of n11Orders) {
        try {
          const phoneNumber = this.extractPhoneNumber(order);

          // Check if order already exists
          const existingOrder = await Order.findOne({
            where: {
              connectionId: this.connectionId,
              externalOrderId: order.id.toString(),
            },
          });

          if (existingOrder) {
            // Update existing order
            try {
              await existingOrder.update({
                status: this.mapOrderStatus(order.status),
                rawData: JSON.stringify(order),
                lastSyncedAt: new Date(),
              });

              updatedCount++;
              normalizedOrders.push(existingOrder);
              continue;
            } catch (updateError) {
              this.logger.error(
                `Failed to update existing order ${order.id}: ${updateError.message}`,
                {
                  error: updateError,
                  orderId: order.id,
                  connectionId: this.connectionId,
                }
              );
              skippedCount++;
              continue;
            }
          }

          // Create new order
          const result = await sequelize.transaction(async (t) => {
            // Create shipping detail first
            const { ShippingDetail } = require("../../../../../models");
            const shippingDetail = await ShippingDetail.create(
              {
                recipientName: order.shippingAddress?.fullName || "",
                address1: order.shippingAddress?.address || "",
                city: order.shippingAddress?.city || "",
                state: order.shippingAddress?.district || "",
                postalCode: order.shippingAddress?.postalCode || "",
                country: "Turkey",
                phone: phoneNumber || "",
                email: order.customerEmail || "",
              },
              { transaction: t }
            );

            // Create the order record
            const normalizedOrder = await Order.create(
              {
                externalOrderId: order.id.toString(),
                connectionId: this.connectionId,
                userId: this.connection.userId,
                orderNumber: order.orderNumber || "",
                platform: "n11",
                customerName: order.customerfullName || "Unknown",
                customerEmail: order.customerEmail || "",
                customerPhone: phoneNumber || "",
                orderDate: new Date(
                  order.packageHistories[0]?.createdDate ||
                    order.lastModifiedDate
                ),
                orderStatus: this.mapOrderStatus(order.shipmentPackageStatus),
                totalAmount: parseFloat(order.totalAmount || 0),
                currency: "TRY",
                shippingDetailId: shippingDetail.id,
                notes: order.note || "",
                paymentStatus: "pending",
                rawData: JSON.stringify(order),
                lastSyncedAt: new Date(),
              },
              { transaction: t }
            );

            // Create order items
            if (order.lines && Array.isArray(order.lines)) {
              for (const item of order.lines) {
                await OrderItem.create(
                  {
                    orderId: normalizedOrder.id,
                    externalProductId:
                      item.productId?.toString() || item.id?.toString(),
                    title: item.productName || item.title,
                    sku: item.stockCode || item.sellerStockCode,
                    quantity: parseInt(item.quantity || 1, 10),
                    unitPrice: parseFloat(item.price || 0),
                    totalPrice: parseFloat(
                      order.totalAmount || item.price * item.quantity || 0
                    ),
                    discount: parseFloat(item.sellerDiscount + item.mallDiscount || 0),
                    invoiceTotal: parseFloat(item.sellerInvoiceAmount || 0),
                    currency: "TRY",
                    variantInfo: item.variantAttributes
                      ? JSON.stringify(item.variantAttributes)
                      : null,
                    rawData: JSON.stringify(item),
                    metadata: {
                      platformData: item,
                    },
                  },
                  { transaction: t }
                );
              }
            }

            // Create N11-specific order record
            await this.createN11OrderRecord(normalizedOrder.id, order, t);

            return normalizedOrder;
          });

          normalizedOrders.push(result);
          successCount++;
        } catch (error) {
          this.logger.error(
            `Failed to process order ${order.id}: ${error.message}`,
            {
              error,
              orderId: order.id,
              connectionId: this.connectionId,
            }
          );
          skippedCount++;
        }
      }

      return {
        success: true,
        message: `Successfully processed ${successCount} orders (${updatedCount} updated, ${skippedCount} skipped)`,
        data: normalizedOrders,
        stats: {
          total: n11Orders.length,
          success: successCount,
          updated: updatedCount,
          skipped: skippedCount,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to normalize orders: ${error.message}`, {
        error,
        connectionId: this.connectionId,
      });
      throw error;
    }
  }

  /**
   * Create N11-specific order record
   * @param {string} orderId - The main Order record ID
   * @param {Object} n11OrderData - Raw order data from N11 API
   * @param {Object} transaction - Sequelize transaction object
   * @returns {Promise<Object>} Created N11Order record
   */
  async createN11OrderRecord(orderId, n11OrderData, transaction) {
    try {
      const { N11Order } = require("../../../../../models");

      return await N11Order.create(
        {
          orderId: orderId,
          n11OrderId: n11OrderData.id?.toString(),
          orderNumber: n11OrderData.orderNumber,
          sellerId: n11OrderData.sellerId,
          buyerId: n11OrderData.customerId?.toString(),
          orderStatus: this.mapOrderStatus(
            n11OrderData.shipmentPackageStatus
          ),
          shippingCompany: n11OrderData.cargoProviderName,
          trackingNumber: n11OrderData.cargoTrackingNumber,
          trackingUrl: "According to shippingCompany",
          estimatedDeliveryDate: n11OrderData.agreedDeliveryDate
            ? new Date(n11OrderData.agreedDeliveryDate)
            : null,
          actualDeliveryDate: n11OrderData.agreedDeliveryDate
            ? new Date(n11OrderData.agreedDeliveryDate)
            : null,
          shippingAddress: n11OrderData.shippingAddress,
          billingAddress: n11OrderData.billingAddress,
          customerInfo: {
            fullName: n11OrderData.customerfullName,
            email: n11OrderData.customerEmail,
            gsm:
              n11OrderData.billingAddress?.gsm ||
              n11OrderData.shippingAddress?.gsm,
            citizenshipId: n11OrderData.tcIdentityNumber,
          },
          n11OrderDate: n11OrderData.lastModifiedDate
            ? new Date(n11OrderData.lastModifiedDate)
            : new Date(),
          lastSyncAt: new Date(),
          platformFees: n11OrderData.platformFees || n11OrderData.commission || 0,
          cancellationReason: n11OrderData.cancellationReason || null,
          returnReason: n11OrderData.returnReason || null,
          platformOrderData: n11OrderData,
        },
        { transaction }
      );
    } catch (error) {
      this.logger.error(`Failed to create N11 Order record: ${error.message}`, {
        error,
        orderId,
        orderNumber: n11OrderData.orderNumber,
      });
      throw error;
    }
  }

  /**
   * Map N11 API status to N11Order model status enum
   * @param {string} apiStatus - Status from N11 API
   * @returns {string} N11Order model status
   */
  mapOrderStatus(apiStatus) {
    const statusMap = {
      Approved: "Onaylandi",
      New: "Yeni",
      Picking: "Hazirlaniyor",
      Shipped: "Kargoya_Verildi",
      Delivered: "Teslim_Edildi",
      Cancelled: "Iptal_Edildi",
      Returned: "Iade_Edildi",
    };

    return statusMap[apiStatus] || "Yeni";
  }

  /**
   * Map payment type to N11Order model enum
   * @param {string} paymentType - Payment type from N11 API
   * @returns {string} N11Order model payment type
   */
  mapPaymentType(paymentType) {
    const paymentMap = {
      CreditCard: "Kredi_Karti",
      BankTransfer: "Havale_EFT",
      CashOnDelivery: "Kapida_Odeme",
      N11Wallet: "N11_Cuzdan",
    };

    return paymentMap[paymentType] || "Kredi_Karti";
  }

  /**
   * Map payment status to N11Order model enum
   * @param {string} paymentStatus - Payment status from N11 API
   * @returns {string} N11Order model payment status
   */
  mapPaymentStatus(paymentStatus) {
    const statusMap = {
      Pending: "Bekliyor",
      Confirmed: "Onaylandi",
      Cancelled: "Iptal_Edildi",
    };

    return statusMap[paymentStatus] || "Bekliyor";
  }
}

module.exports = N11Service;
