import axios from "axios";
import { handleJWTError } from "../utils/authRecovery";
import networkStatusService from "./networkStatusService";
import performanceMonitor from "./performanceMonitor";
import logger from "../utils/logger.js";

// Create a safe wrapper to handle different import structures
const networkService = networkStatusService?.default ||
  networkStatusService || {
    isCircuitOpen: () => false,
    recordSuccess: () => {},
    recordFailure: () => {},
    isOnline: true,
    isServerReachable: true,
  };

// Verify the service has the required methods and add fallbacks if needed
if (typeof networkService?.isCircuitOpen !== "function") {
  logger.warn(
    "⚠️ NetworkStatusService missing isCircuitOpen method, using fallback"
  );
  networkService.isCircuitOpen = () => false;
}
if (typeof networkService?.recordSuccess !== "function") {
  logger.warn(
    "⚠️ NetworkStatusService missing recordSuccess method, using fallback"
  );
  networkService.recordSuccess = () => {};
}
if (typeof networkService?.recordFailure !== "function") {
  logger.warn(
    "⚠️ NetworkStatusService missing recordFailure method, using fallback"
  );
  networkService.recordFailure = () => {};
}

// Determine the correct API base URL
const getApiBaseUrl = () => {
  if (process.env.NODE_ENV === "development") {
    // Use relative path in development to let setupProxy.js handle routing
    return "/api";
  }
  return process.env.REACT_APP_API_URL || "https://yarukai.com/api";
};

// Create axios instance with proper configuration
const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 10000, // Reduced from 30s to 10s for faster failure detection
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token and start performance tracking
api.interceptors.request.use(
  (config) => {
    // Start performance tracking
    config.metadata = { startTime: performance.now() };

    // Check circuit breaker before making request
    try {
      if (
        networkService &&
        typeof networkService.isCircuitOpen === "function" &&
        networkService.isCircuitOpen()
      ) {
        const error = new Error(
          "Circuit breaker is open - server appears to be unavailable"
        );
        error.code = "CIRCUIT_BREAKER_OPEN";
        error.isCircuitBreakerError = true;
        return Promise.reject(error);
      }
    } catch (circuitError) {
      logger.error("Error checking circuit breaker:", circuitError);
      // Continue with the request if there's an error checking the circuit breaker
    }

    const token = localStorage.getItem("token");
    if (token && token.length < 2000) {
      // Avoid large tokens that cause 431
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add request start time for performance tracking
    config.metadata = { requestStartTime: Date.now() };

    // Log API request using structured logger
    logger.api.info(`Request: ${config.method?.toUpperCase()} ${config.url}`, {
      operation: "api_request",
      method: config.method?.toUpperCase(),
      url: config.url,
      baseURL: config.baseURL,
      headers: Object.keys(config.headers),
      tokenPresent: !!token,
      tokenLength: token?.length || 0,
      timestamp: new Date().toISOString(),
    });

    return config;
  },
  (error) => {
    logger.api.error("Request interceptor error", {
      operation: "api_request_error",
      error: error.message,
      stack: error.stack,
    });
    return Promise.reject(error);
  }
);

// Response interceptor with performance tracking
api.interceptors.response.use(
  (response) => {
    // Track API performance
    const startTime = response.config.metadata?.startTime;
    if (startTime) {
      const duration = performance.now() - startTime;
      const endpoint = response.config.url;
      performanceMonitor.trackApiCall(endpoint, duration, true);
    }

    // Record successful response
    try {
      if (
        networkService &&
        typeof networkService.recordSuccess === "function"
      ) {
        networkService.recordSuccess();
      }
    } catch (error) {
      logger.error("Error recording success in network status service:", error);
    }

    logger.api.info(`Response: ${response.status}`, {
      operation: "api_response",
      url: response.config.url,
      status: response.status,
      method: response.config.method?.toUpperCase(),
      timestamp: new Date().toISOString(),
      responseTime: response.config.metadata?.requestStartTime
        ? Date.now() - response.config.metadata.requestStartTime + "ms"
        : "unknown",
    });
    return response;
  },
  (error) => {
    // Track API errors
    const startTime = error.config?.metadata?.startTime;
    if (startTime) {
      const duration = performance.now() - startTime;
      const endpoint = error.config?.url || "unknown";
      performanceMonitor.trackApiCall(endpoint, duration, false);
    }
    // Record failed response for network status tracking
    if (
      error.code === "ECONNREFUSED" ||
      error.code === "NETWORK_ERROR" ||
      error.message === "Network Error" ||
      !error.response
    ) {
      try {
        if (
          networkService &&
          typeof networkService.recordFailure === "function"
        ) {
          networkService.recordFailure(error);
        }
      } catch (networkError) {
        logger.error(
          "Error recording failure in network status service:",
          networkError
        );
      }
    }

    if (process.env.NODE_ENV === "development") {
      logger.error("❌ API Response error:", {
        url: error.config?.url,
        status: error.response?.status,
        message: error.message,
        code: error.code,
        data: error.response?.data,
      });
    }

    // Handle 431 errors specifically
    if (error.response?.status === 431) {
      if (process.env.NODE_ENV === "development") {
        logger.warn(
          "🚨 Request header too large - clearing potentially corrupted token"
        );
      }
      localStorage.removeItem("token");
      window.location.reload();
      return Promise.reject(error);
    }

    // Handle JWT authentication errors with recovery
    if (error.response?.status === 401) {
      try {
        handleJWTError(error);
      } catch (handledError) {
        // handleJWTError will either recover automatically or re-throw
        return Promise.reject(handledError);
      }
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

// Enhanced API service with consistent response handling
const orderService = {
  getOrders: async (params = {}) => {
    try {
      const response = await api.get("/order-management/orders", {
        params,
      });

      // Handle the backend response structure properly
      const backendData = response.data;

      // Extract orders from the nested structure
      const orders =
        backendData.data?.orders ||
        backendData.orders ||
        backendData.data ||
        [];

      // Extract pagination info from backend response
      const backendPagination = backendData.data?.pagination || {};
      const backendStats = backendData.stats || {};

      return {
        success: true,
        data: {
          orders: orders,
          pagination: {
            total: backendPagination.total || backendStats.total || 0,
            totalPages: backendPagination.totalPages || backendStats.pages || 1,
            currentPage:
              backendPagination.currentPage || backendStats.page || 1,
            limit: backendPagination.limit || 20,
            hasNext: backendPagination.hasNext || false,
            hasPrev: backendPagination.hasPrev || false,
            showing: backendPagination.showing || orders.length,
            from: backendPagination.from || 1,
            to: backendPagination.to || orders.length,
          },
          stats: backendStats,
        },
        // Preserve legacy fields for backward compatibility
        total: backendPagination.total || backendStats.total || 0,
        page: backendPagination.currentPage || backendStats.page || 1,
        totalPages: backendPagination.totalPages || backendStats.pages || 1,
      };
    } catch (error) {
      logger.error("Order API error:", {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
      });

      // Check for connection-related errors or graceful error responses
      if (
        error.response?.status === 500 ||
        error.response?.data?.error?.errorType === "DATABASE_ERROR" ||
        error.response?.data?.meta?.errorType === "DATABASE_CONNECTION_ERROR" ||
        error.response?.data?.meta?.databaseError ||
        error.message?.includes("CONNECTION_NOT_FOUND") ||
        error.message?.includes("no connection found")
      ) {
        logger.warn(
          "Orders API failed due to connection issues, returning empty state"
        );

        // Check if the server provided a graceful error response
        if (error.response?.data && error.response.data.success === false) {
          logger.info("Using server's graceful error response");
          return error.response.data; // Use the server's graceful response
        }

        return {
          success: true, // Return success to prevent UI breaking
          data: {
            orders: [],
            pagination: {
              total: 0,
              totalPages: 1,
              currentPage: 1,
              limit: 20,
              hasNext: false,
              hasPrev: false,
              showing: 0,
              from: 0,
              to: 0,
            },
            stats: { total: 0, page: 1, pages: 1 },
          },
          meta: {
            connectionError: true,
            message:
              "Platform bağlantısı bulunamadı. Lütfen platform bağlantılarınızı kontrol edin.",
          },
          total: 0,
          page: 1,
          totalPages: 1,
        };
      }

      return {
        success: false,
        message: error.response?.data?.message || error.message,
        data: {
          orders: [],
          pagination: {
            total: 0,
            totalPages: 1,
            currentPage: 1,
            limit: 20,
            hasNext: false,
            hasPrev: false,
            showing: 0,
            from: 0,
            to: 0,
          },
          stats: {
            total: 0,
            page: 1,
            pages: 1,
          },
        },
        total: 0,
        page: 1,
        totalPages: 1,
      };
    }
  },

  getOrderById: async (id) => {
    try {
      const response = await api.get(`/order-management/orders/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Alias for backward compatibility
  getOrder: async (id) => {
    return orderService.getOrderById(id);
  },

  createOrder: async (orderData) => {
    try {
      const response = await api.post("/order-management/orders", orderData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateOrder: async (id, orderData) => {
    try {
      const response = await api.put(
        `/order-management/orders/${id}`,
        orderData
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  deleteOrder: async (id) => {
    try {
      const response = await api.delete(`/order-management/orders/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateOrderStatus: async (id, status) => {
    try {
      const response = await api.put(`/order-management/orders/${id}/status`, {
        status,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Sync orders from platforms
  syncOrders: async (platformId = null) => {
    try {
      // Get user info from token to extract userId
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      // Decode the JWT token to get user info (simple base64 decode)
      let userId;
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        userId = payload.id || payload.userId;
      } catch (decodeError) {
        throw new Error("Invalid authentication token");
      }

      if (!userId) {
        throw new Error("User ID not found in token");
      }

      const requestBody = { userId };
      if (platformId) {
        requestBody.platformIds = [platformId];
      }

      const response = await api.post(
        "/order-management/orders/sync",
        requestBody
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Bulk update order status - Added for OrderManagement component
  bulkUpdateStatus: async (orderIds, status) => {
    try {
      const response = await api.put("/order-management/orders/bulk-update", {
        orderIds,
        status,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Export orders
  exportOrders: async (format = "csv", filters = {}) => {
    try {
      const response = await api.get(
        `/order-management/orders/export?format=${format}`,
        {
          params: filters,
          responseType: "blob",
        }
      );
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get order statistics
  getOrderStats: async (params = {}) => {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const url = queryParams
        ? `/order-management/orders/stats?${queryParams}`
        : "/order-management/orders/stats";

      const response = await api.get(url);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get order trends
  getOrderTrends: async (period = "month") => {
    try {
      const response = await api.get(
        `/order-management/orders/trends?period=${period}`
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Print shipping slip (deprecated - use api.shipping.generatePDF instead)
  printShippingSlip: async (orderId, options = {}) => {
    try {
      const response = await api.post("/shipping/templates/generate-pdf", {
        orderId,
        templateId: options.templateId || null,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Print invoice
  printInvoice: async (orderId, options = {}) => {
    try {
      const response = await api.post(
        `/order-management/orders/${orderId}/generate-einvoice`
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Cancel order
  cancelOrder: async (orderId, reason = "") => {
    try {
      const response = await api.post(
        `/order-management/orders/${orderId}/cancel`,
        { reason }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Generate e-invoice
  generateEInvoice: async (orderId) => {
    try {
      const response = await api.post(
        `/order-management/orders/${orderId}/einvoice`
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Bulk generate e-invoices
  bulkEInvoice: async (orderIds) => {
    try {
      const response = await api.post(
        "/order-management/orders/bulk-einvoice",
        { orderIds }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Accept order with validation
  acceptOrder: async (id) => {
    try {
      if (!id) {
        throw new Error("Order ID is required");
      }

      logger.logOperation(`Accepting order with ID: ${id}`, {
        operation: "accept_order",
        orderId: id,
      });

      const response = await api.put(`/order-management/orders/${id}/accept`);

      logger.api.success("Accept order response received", {
        operation: "accept_order_response",
        orderId: id,
        status: response.status,
        data: response.data,
      });

      return {
        success: response.data?.success ?? true,
        message: response.data?.message || "Order accepted successfully",
        data: response.data?.data || null,
      };
    } catch (error) {
      logger.error("Error accepting order:", error);
      logger.error("Error response:", error.response?.data);
      logger.error("Error status:", error.response?.status);
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Unknown error occurred while accepting order",
        data: null,
      };
    }
  },

  // Bulk delete orders
  bulkDeleteOrders: async (orderIds) => {
    try {
      const response = await api.delete(
        "/order-management/orders/bulk-delete",
        {
          data: { orderIds },
        }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Bulk accept orders
  bulkAcceptOrders: async (orderIds) => {
    try {
      const response = await api.put("/order-management/orders/bulk-update", {
        orderIds,
        status: "accepted",
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

// Platform-specific API methods
const platformAPI = {
  // Get all platform connections
  getConnections: async () => {
    try {
      const response = await api.get("/platforms/connections");
      return response.data;
    } catch (error) {
      // Error will be handled by the calling component
      throw error;
    }
  },

  // Get specific platform connection
  getConnection: async (id) => {
    try {
      const response = await api.get(`/platforms/connections/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Create new platform connection
  createConnection: async (connectionData) => {
    try {
      const response = await api.post("/platforms/connections", connectionData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Update platform connection
  updateConnection: async (id, updates) => {
    try {
      const response = await api.put(`/platforms/connections/${id}`, updates);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Delete platform connection
  deleteConnection: async (id) => {
    try {
      const response = await api.delete(`/platforms/connections/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Test platform connection
  testConnection: async (id) => {
    try {
      const response = await api.post(`/platforms/connections/${id}/test`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Force sync platform
  syncPlatform: async (id) => {
    try {
      const response = await api.post(`/platforms/connections/${id}/sync`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Update platform settings
  updateSettings: async (id, settings) => {
    try {
      const response = await api.put(
        `/platforms/connections/${id}/settings`,
        settings
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get platform analytics
  getAnalytics: async (id, timeRange = "30d") => {
    try {
      const response = await api.get(
        `/platforms/connections/${id}/analytics?timeRange=${timeRange}`
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get platform sync history
  getSyncHistory: async (id, params = {}) => {
    try {
      const queryString = new URLSearchParams(params).toString();
      const url = queryString
        ? `/platforms/connections/${id}/sync-history?${queryString}`
        : `/platforms/connections/${id}/sync-history`;
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Retry failed sync
  retrySync: async (id, syncId) => {
    try {
      const response = await api.post(
        `/platforms/connections/${id}/sync-history/${syncId}/retry`
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

// Customer API methods
const customerAPI = {
  // Get customers with optional query parameters
  getCustomers: async (params = {}) => {
    try {
      const queryString = new URLSearchParams(params).toString();
      const url = queryString ? `/customers?${queryString}` : "/customers";
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get single customer by ID
  getCustomer: async (id) => {
    try {
      const response = await api.get(`/customers/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Create new customer
  createCustomer: async (customerData) => {
    try {
      const response = await api.post("/customers", customerData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Update customer
  updateCustomer: async (id, updates) => {
    try {
      const response = await api.put(`/customers/${id}`, updates);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get customer orders
  getCustomerOrders: async (id, params = {}) => {
    try {
      const queryString = new URLSearchParams(params).toString();
      const url = queryString
        ? `/customers/${id}/orders?${queryString}`
        : `/customers/${id}/orders`;
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

// Customer Questions API methods
const customerQuestionsAPI = {
  // Get all questions with filters and pagination
  getQuestions: async (params = {}) => {
    try {
      const response = await api.get("/customer-questions", { params });
      return response.data;
    } catch (error) {
      logger.error("❌ API: Error getting customer questions:", error);
      throw error;
    }
  },

  // Get question by ID
  getQuestionById: async (id) => {
    try {
      const response = await api.get(`/customer-questions/${id}`);
      return response.data;
    } catch (error) {
      logger.error("❌ API: Error getting question by ID:", error);
      throw error;
    }
  },

  // Get questions by customer email
  getQuestionsByCustomer: async (email, params = {}) => {
    try {
      const response = await api.get(
        `/customer-questions/by-customer/${encodeURIComponent(email)}`,
        { params }
      );
      return response.data;
    } catch (error) {
      logger.error("❌ API: Error getting questions by customer:", error);
      throw error;
    }
  },

  // Reply to a question
  replyToQuestion: async (questionId, replyData) => {
    try {
      const response = await api.post(
        `/customer-questions/${questionId}/reply`,
        replyData
      );
      return response.data;
    } catch (error) {
      logger.error("❌ API: Error replying to question:", error);
      throw error;
    }
  },

  // Sync questions from platforms
  syncQuestions: async (platforms = []) => {
    try {
      const response = await api.post("/customer-questions/sync", {
        platforms,
      });
      return response.data;
    } catch (error) {
      logger.error("❌ API: Error syncing questions:", error);
      throw error;
    }
  },

  // Get question statistics
  getQuestionStats: async (params = {}) => {
    try {
      const response = await api.get("/customer-questions/stats", { params });
      return response.data;
    } catch (error) {
      logger.error("❌ API: Error getting question stats:", error);
      throw error;
    }
  },

  // Get dashboard data
  getDashboardData: async (params = {}) => {
    try {
      const response = await api.get("/customer-questions/dashboard", {
        params,
      });
      return response.data;
    } catch (error) {
      logger.error("❌ API: Error getting dashboard data:", error);
      throw error;
    }
  },

  // Template management methods
  templates: {
    // Get all reply templates
    getTemplates: async (params = {}) => {
      try {
        const response = await api.get("/customer-questions/templates", {
          params,
        });
        return response.data;
      } catch (error) {
        logger.error("❌ API: Error getting reply templates:", error);
        throw error;
      }
    },

    // Create a new reply template
    createTemplate: async (templateData) => {
      try {
        // Ensure we use 'name' field for consistency
        const data = {
          name: templateData.name || templateData.title,
          content: templateData.content,
          category: templateData.category || "general",
          platforms: templateData.platforms,
          keywords: templateData.keywords,
          variables: templateData.variables,
        };

        logger.info("🌐 API Request: POST /customer-questions/templates", {
          data,
          originalData: templateData,
        });

        const response = await api.post("/customer-questions/templates", data);
        return response.data;
      } catch (error) {
        logger.error("❌ API: Error creating reply template:", error);
        logger.error("❌ API: Error details:", {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
        });
        throw error;
      }
    },

    // Update an existing reply template
    updateTemplate: async (id, templateData) => {
      try {
        // Ensure we use 'name' field for consistency
        const data = {
          name: templateData.name || templateData.title,
          content: templateData.content,
          category: templateData.category || "general",
          platforms: templateData.platforms,
          keywords: templateData.keywords,
          variables: templateData.variables,
        };

        const response = await api.put(
          `/customer-questions/templates/${id}`,
          data
        );
        return response.data;
      } catch (error) {
        logger.error("❌ API: Error updating reply template:", error);
        throw error;
      }
    },

    // Delete a reply template
    deleteTemplate: async (id) => {
      try {
        const response = await api.delete(
          `/customer-questions/templates/${id}`
        );
        return response.data;
      } catch (error) {
        logger.error("❌ API: Error deleting reply template:", error);
        throw error;
      }
    },

    // Get template suggestions for a question
    getSuggestions: async (questionId, params = {}) => {
      try {
        const response = await api.get(
          `/customer-questions/${questionId}/template-suggestions`,
          { params }
        );
        return response.data;
      } catch (error) {
        logger.error("❌ API: Error getting template suggestions:", error);
        throw error;
      }
    },
  },

  // Question management methods
  assignQuestion: async (questionId, assignedTo) => {
    try {
      const response = await api.put(
        `/customer-questions/${questionId}/assign`,
        { assigned_to: assignedTo }
      );
      return response.data;
    } catch (error) {
      logger.error("❌ API: Error assigning question:", error);
      throw error;
    }
  },

  updateQuestionPriority: async (questionId, priority) => {
    try {
      const response = await api.put(
        `/customer-questions/${questionId}/priority`,
        { priority }
      );
      return response.data;
    } catch (error) {
      logger.error("❌ API: Error updating question priority:", error);
      throw error;
    }
  },

  addInternalNote: async (questionId, note) => {
    try {
      const response = await api.post(
        `/customer-questions/${questionId}/note`,
        { note }
      );
      return response.data;
    } catch (error) {
      logger.error("❌ API: Error adding internal note:", error);
      throw error;
    }
  },
};

// Shipping API methods
const shippingAPI = {
  // Get shipping carriers
  getShippingCarriers: async () => {
    try {
      const response = await api.get("/shipping/carriers");
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Create shipping carrier
  createShippingCarrier: async (carrierData) => {
    try {
      const response = await api.post("/shipping/carriers", carrierData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Update shipping carrier
  updateShippingCarrier: async (id, carrierData) => {
    try {
      const response = await api.put(`/shipping/carriers/${id}`, carrierData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Delete shipping carrier
  deleteShippingCarrier: async (id) => {
    try {
      const response = await api.delete(`/shipping/carriers/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get shipping rates
  getShippingRates: async (params = {}) => {
    try {
      const queryString = new URLSearchParams(params).toString();
      const url = queryString
        ? `/shipping/rates?${queryString}`
        : "/shipping/rates";
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Calculate shipping cost
  calculateShippingCost: async (shippingData) => {
    try {
      const response = await api.post("/shipping/calculate", shippingData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Shipping Templates
  getShippingTemplates: async () => {
    try {
      logger.api.info("Getting shipping templates", {
        operation: "get_shipping_templates",
      });
      const response = await api.get("/shipping/templates");
      logger.api.success("Shipping templates response received", {
        operation: "get_shipping_templates_response",
        templateCount: response.data?.length || 0,
        data: response.data,
      });
      return response.data;
    } catch (error) {
      logger.error("❌ API: Error getting shipping templates:", error);
      logger.error("❌ API: Error details:", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
      throw error;
    }
  },

  getShippingTemplate: async (id) => {
    try {
      const response = await api.get(`/shipping/templates/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  saveShippingTemplate: async (templateData) => {
    try {
      const response = await api.post("/shipping/templates", templateData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateShippingTemplate: async (id, templateData) => {
    try {
      const response = await api.put(`/shipping/templates/${id}`, templateData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  deleteShippingTemplate: async (id) => {
    try {
      const response = await api.delete(`/shipping/templates/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Default Template Management
  getDefaultTemplate: async () => {
    try {
      logger.info("🔍 API: Getting default template...");
      const response = await api.get("/shipping/templates/default");
      logger.info("📄 API: Default template response:", response.data);
      return response.data;
    } catch (error) {
      logger.error("❌ API: Error getting default template:", error);
      logger.error("❌ API: Error details:", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
      throw error;
    }
  },

  setDefaultTemplate: async (templateId) => {
    try {
      const response = await api.post("/shipping/templates/default", {
        templateId,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Generate PDF using template and order data
  generatePDF: async (orderId, templateId = null) => {
    try {
      logger.info(
        `🖨️ API: Generating PDF for order: ${orderId}, template: ${
          templateId || "default"
        }`
      );
      logger.info(`🔗 API: Base URL: ${api.defaults.baseURL}`);
      logger.info(
        `🔗 API: Request URL: ${api.defaults.baseURL}/shipping/templates/generate-pdf`
      );

      // Ensure orderId is sent as string to avoid type issues
      const payload = {
        orderId: String(orderId),
        templateId: templateId || null,
      };

      logger.info("📦 API: Sending payload:", payload);

      const response = await api.post(
        "/shipping/templates/generate-pdf",
        payload
      );
      logger.info("✅ API: PDF generation response:", response.data);

      // Validate the response contains a valid labelUrl
      if (response.data.success && response.data.data?.labelUrl) {
        const labelUrl = response.data.data.labelUrl;

        // Check if the URL is accessible from this device
        logger.info(`🔍 API: Generated PDF URL: ${labelUrl}`);

        // If the URL starts with /shipping/ and we're not on localhost,
        // we might need to construct the full URL
        if (
          labelUrl.startsWith("/shipping/") &&
          !window.location.hostname.includes("localhost") &&
          !window.location.hostname.includes("127.0.0.1")
        ) {
          // For production deployment, use HTTPS and same domain (no port)
          const currentHost = window.location.hostname;
          const isProduction = window.location.protocol === "https:";

          let fullUrl;
          if (isProduction) {
            // Production: use HTTPS and same domain without port
            fullUrl = `https://${currentHost}${labelUrl}`;
          } else {
            // Development: use HTTP with port
            const serverPort = 5001;
            fullUrl = `http://${currentHost}:${serverPort}${labelUrl}`;
          }

          logger.info(
            `🌐 API: Network access detected, trying full URL: ${fullUrl} (production: ${isProduction})`
          );

          // Test if the full URL is accessible
          try {
            const testResponse = await fetch(fullUrl, { method: "HEAD" });
            if (testResponse.ok) {
              logger.info(`✅ API: Full URL is accessible, updating response`);
              response.data.data.labelUrl = fullUrl;
            } else {
              logger.warn(
                `⚠️ API: Full URL test failed with status ${testResponse.status}, keeping original URL`
              );
            }
          } catch (testError) {
            logger.warn(
              `⚠️ API: Full URL test failed, keeping original URL:`,
              testError.message
            );
          }
        } else if (labelUrl.startsWith("http")) {
          // URL is already absolute, validate it's correctly formatted
          logger.info(`🔗 API: URL is already absolute: ${labelUrl}`);

          // Check for malformed URLs (double protocol issue)
          if (
            labelUrl.includes("comhttps") ||
            (labelUrl.includes("://") &&
              labelUrl.lastIndexOf("://") > labelUrl.indexOf("://"))
          ) {
            logger.warn(
              `⚠️ API: Malformed URL detected, attempting to fix: ${labelUrl}`
            );
            // Extract the path part and reconstruct
            const pathMatch = labelUrl.match(/\/shipping\/.*$/);
            if (pathMatch) {
              const cleanPath = pathMatch[0];
              const currentHost = window.location.hostname;
              const isProduction = window.location.protocol === "https:";
              const correctedUrl = isProduction
                ? `https://${currentHost}${cleanPath}`
                : `http://${currentHost}:5001${cleanPath}`;
              logger.info(`🔧 API: Corrected URL: ${correctedUrl}`);
              response.data.data.labelUrl = correctedUrl;
            }
          }
        }
      }

      return response.data;
    } catch (error) {
      logger.error("❌ API: Error generating PDF:", {
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url,
        method: error.config?.method,
        baseURL: api.defaults.baseURL,
        data: error.response?.data,
        message: error.message,
      });
      throw error;
    }
  },

  // Link order with shipping template
  linkOrderTemplate: async (linkData) => {
    try {
      const response = await api.post(
        "/shipping/templates/link-order",
        linkData
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Aliases for backward compatibility
  getTemplates: async () => {
    try {
      logger.info("🔍 API: Getting all templates...");
      const response = await shippingAPI.getShippingTemplates();
      logger.info("📄 API: Templates response:", response);
      return response;
    } catch (error) {
      logger.error("❌ API: Error getting templates:", error);
      throw error;
    }
  },

  getTemplate: async (id) => {
    return shippingAPI.getShippingTemplate(id);
  },
};

// Import/Export API methods
const importExportAPI = {
  // Import data from file
  importData: async (formData, config = {}) => {
    try {
      const response = await api.post("/import", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        ...config,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Export data
  exportData: async (type, format = "csv") => {
    try {
      // Make sure to add proper error handling for export
      const response = await api.get(`/export/${type}?format=${format}`, {
        responseType: "blob",
      });

      // Check if response is valid
      if (response.status !== 200) {
        throw new Error(`Export failed with status ${response.status}`);
      }

      return response;
    } catch (error) {
      // Add logging for better debugging
      logger.error(`Export error for ${type}:`, error);

      // Add better error handling with specific message
      if (error.response) {
        // Try to parse error blob to get message
        try {
          const reader = new FileReader();
          reader.onload = () => {
            const errorData = JSON.parse(reader.result);
            error.message = errorData.message || `Failed to export ${type}`;
          };
          reader.readAsText(error.response.data);
        } catch (parseError) {
          // If we can't parse, just use response status
          error.message = `Export failed with status ${error.response.status}`;
        }
      }

      throw error;
    }
  },

  // Download template
  downloadTemplate: async (type) => {
    try {
      const response = await api.get(`/templates/${type}`, {
        responseType: "blob",
      });
      return response;
    } catch (error) {
      throw error;
    }
  },
};

// Dashboard API methods
const dashboardAPI = {
  // Get dashboard stats
  getDashboardStats: async () => {
    try {
      const response = await api.get("/dashboard/stats");
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get recent activities
  getRecentActivities: async (limit = 10) => {
    try {
      const response = await api.get(`/dashboard/activities?limit=${limit}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get performance metrics
  getPerformanceMetrics: async (timeRange = "30d") => {
    try {
      const response = await api.get(
        `/dashboard/performance?timeRange=${timeRange}`
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

// Settings API methods
const settingsAPI = {
  // Company info methods
  getCompanyInfo: async () => {
    try {
      const response = await api.get("/settings/company");
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  saveCompanyInfo: async (companyData) => {
    try {
      const response = await api.post("/settings/company", companyData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  uploadCompanyLogo: async (formData) => {
    try {
      const response = await api.post("/settings/company/logo", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // General settings methods
  getGeneralSettings: async () => {
    try {
      const response = await api.get("/settings/general");
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  saveGeneralSettings: async (settings) => {
    try {
      const response = await api.post("/settings/general", settings);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Notification settings methods
  getNotificationSettings: async () => {
    try {
      const response = await api.get("/settings/notifications");
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  saveNotificationSettings: async (settings) => {
    try {
      const response = await api.post("/settings/notifications", settings);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Shipping settings methods
  getShippingSettings: async () => {
    try {
      const response = await api.get("/settings/shipping");
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  saveShippingSettings: async (settings) => {
    try {
      const response = await api.post("/settings/shipping", settings);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Email settings methods
  getEmailSettings: async () => {
    try {
      const response = await api.get("/settings/email");
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  saveEmailSettings: async (settings) => {
    try {
      const response = await api.post("/settings/email", settings);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  testEmailSettings: async () => {
    try {
      const response = await api.post("/settings/email/test");
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Legacy methods for backward compatibility
  getAppSettings: async () => {
    try {
      const response = await api.get("/settings/general");
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateAppSettings: async (settings) => {
    try {
      const response = await api.post("/settings/general", settings);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateNotificationSettings: async (settings) => {
    try {
      const response = await api.post("/settings/notifications", settings);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

// Reports API methods
const reportsAPI = {
  // Export reports
  exportReport: async (type, options = {}) => {
    try {
      const params = new URLSearchParams({
        type,
        ...options,
      }).toString();
      const response = await api.get(`/analytics/export?${params}`, {
        responseType: "blob",
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Get analytics summary
  getAnalyticsSummary: async (timeRange = "30d") => {
    try {
      const response = await api.get(
        `/reports/analytics?timeRange=${timeRange}`
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get customer analytics
  getCustomerAnalytics: async (timeRange = "30d") => {
    try {
      const response = await api.get(
        `/reports/customers?timeRange=${timeRange}`
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get product performance
  getProductPerformance: async (timeRange = "30d") => {
    try {
      const response = await api.get(
        `/reports/products?timeRange=${timeRange}`
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

// Product-specific API methods
const productAPI = {
  // Get products with optional query parameters
  getProducts: async (params = {}) => {
    try {
      const queryString = new URLSearchParams(params).toString();
      const url = queryString ? `/products?${queryString}` : "/products";
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get single product by ID
  getProduct: async (id) => {
    try {
      const response = await api.get(`/products/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Create new product
  createProduct: async (productData) => {
    try {
      const response = await api.post("/products", productData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Update product
  updateProduct: async (id, productData) => {
    try {
      const response = await api.put(`/products/${id}`, productData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Delete product
  deleteProduct: async (id) => {
    try {
      const response = await api.delete(`/products/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Bulk delete products
  bulkDelete: async (productIds) => {
    try {
      const response = await api.delete("/products/bulk", {
        data: { productIds },
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Bulk update product status
  bulkUpdateStatus: async (productIds, status) => {
    try {
      const response = await api.post("/products/bulk/status", {
        productIds,
        status,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get product statistics
  getProductStats: async () => {
    try {
      const response = await api.get("/products/stats");
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

// Font Management API
const fontAPI = {
  // Get available fonts
  getAvailableFonts: async () => {
    try {
      const response = await api.get("/fonts/available");
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Validate text with font
  validateText: async (text, fontFamily, weight = "normal") => {
    try {
      const response = await api.post("/fonts/validate-text", {
        text,
        fontFamily,
        weight,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Detect system fonts (admin only)
  detectSystemFonts: async () => {
    try {
      const response = await api.get("/fonts/detect-system");
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

// Extend the default export with all API methods
api.platforms = platformAPI;
api.orders = orderService;
api.customers = customerAPI;
api.customerQuestions = customerQuestionsAPI;
api.shipping = shippingAPI;
api.importExport = importExportAPI;
api.dashboard = dashboardAPI;
api.settings = settingsAPI;
api.reports = reportsAPI;
api.products = productAPI;
api.fonts = fontAPI;

// Add legacy direct methods for backward compatibility with existing hooks
api.getOrders = orderService.getOrders;
api.getOrderStats = orderService.getOrderStats;
api.getOrderTrends = orderService.getOrderTrends;
api.getOrder = orderService.getOrder;
api.createOrder = orderService.createOrder;
api.updateOrder = orderService.updateOrder;
api.updateOrderStatus = orderService.updateOrderStatus;
api.acceptOrder = orderService.acceptOrder;
api.syncOrders = orderService.syncOrders;

// Add new methods for reports
api.getConnections = platformAPI.getConnections;
api.exportReport = reportsAPI.exportReport;

export default api;
