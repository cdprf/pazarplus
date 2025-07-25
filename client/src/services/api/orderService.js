import logger from "../../utils/logger.js";
import axios from "axios";

const API_URL =
  process.env.REACT_APP_API_URL ||
  (process.env.NODE_ENV === "production" ? "https://yarukai.com/api" : "/api");

// Create axios instance
const api = axios.create({
  baseURL: `${API_URL}/order-management/orders`,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add authorization header interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Enhanced response interceptor for better error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    logger.error("API Error:", error.response?.data || error.message);

    // Handle specific error cases
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

const orderService = {
  // Get all orders with enhanced parameter handling
  getOrders: async (params = {}) => {
    try {
      // Clean and validate parameters
      const cleanParams = Object.entries(params).reduce((acc, [key, value]) => {
        if (
          value !== null &&
          value !== undefined &&
          value !== "" &&
          value !== "all"
        ) {
          acc[key] = value;
        }
        return acc;
      }, {});

      logger.info("OrderService: Making request with params:", cleanParams);
      const response = await api.get("/", { params: cleanParams });

      // Ensure consistent response structure
      const result = {
        success: true,
        data:
          response.data.data?.orders ||
          response.data.orders ||
          response.data.data ||
          [],
        pagination: response.data.data?.pagination ||
          response.data.pagination || {
            total: 0,
            totalPages: 1,
            currentPage: 1,
            limit: 20,
          },
        stats: response.data.stats || {},
      };

      logger.info("OrderService: Processed response:", result);
      return result;
    } catch (error) {
      logger.error("OrderService: Error fetching orders:", error);
      return {
        success: false,
        message: error.response?.data?.message || error.message,
        data: [],
        pagination: {
          total: 0,
          totalPages: 1,
          currentPage: 1,
          limit: 20,
        },
      };
    }
  },

  // Get order by ID with enhanced error handling
  getOrderById: async (id) => {
    try {
      if (!id) {
        throw new Error("Order ID is required");
      }

      const response = await api.get(`/${id}`);
      return {
        success: true,
        data: response.data.data || response.data,
        message: "Order fetched successfully",
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.message,
        data: null,
      };
    }
  },

  // Create new order with validation
  createOrder: async (orderData) => {
    try {
      if (!orderData || typeof orderData !== "object") {
        throw new Error("Valid order data is required");
      }

      const response = await api.post("/", orderData);
      return {
        success: true,
        data: response.data.data || response.data,
        message: "Order created successfully",
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.message,
        data: null,
      };
    }
  },

  // Update existing order with validation
  updateOrder: async (id, orderData) => {
    try {
      if (!id) {
        throw new Error("Order ID is required");
      }

      if (!orderData || typeof orderData !== "object") {
        throw new Error("Valid order data is required");
      }

      const response = await api.put(`/${id}`, orderData);
      return {
        success: true,
        data: response.data.data || response.data,
        message: "Order updated successfully",
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.message,
        data: null,
      };
    }
  },

  // Delete order with confirmation
  deleteOrder: async (id) => {
    try {
      if (!id) {
        throw new Error("Order ID is required");
      }

      const response = await api.delete(`/${id}`);
      return {
        success: true,
        data: response.data.data || response.data,
        message: "Order deleted successfully",
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.message,
        data: null,
      };
    }
  },

  // Sync orders with enhanced progress tracking
  syncOrders: async (platformId = null) => {
    try {
      const params = platformId ? { platformId } : {};
      const response = await api.post("/sync", {}, { params });
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message || "Orders synced successfully",
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.message,
        data: null,
      };
    }
  },

  // Bulk update order status with validation
  bulkUpdateStatus: async (orderIds, status) => {
    try {
      if (!Array.isArray(orderIds) || orderIds.length === 0) {
        throw new Error("Order IDs array is required and cannot be empty");
      }

      if (!status || typeof status !== "string") {
        throw new Error("Valid status is required");
      }

      const response = await api.put("/bulk/status", {
        orderIds,
        updates: { status },
      });
      return {
        success: true,
        data: response.data.data || response.data,
        message: `Successfully updated ${orderIds.length} orders`,
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.message,
        data: null,
      };
    }
  },

  // Bulk delete orders with validation
  bulkDeleteOrders: async (orderIds) => {
    try {
      if (!Array.isArray(orderIds) || orderIds.length === 0) {
        throw new Error("Order IDs array is required and cannot be empty");
      }

      const response = await api.delete("/bulk-delete", { data: { orderIds } });
      return {
        success: true,
        data: response.data.data || response.data,
        message: `Successfully deleted ${orderIds.length} orders`,
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.message,
        data: null,
      };
    }
  },

  // Get order trends with caching
  getOrderTrends: async (timeRange = "30d") => {
    try {
      const response = await api.get("/trends", {
        params: { timeframe: timeRange },
      });
      return {
        success: true,
        data: response.data.data || response.data,
        message: "Trends fetched successfully",
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.message,
        data: null,
      };
    }
  },

  // Get order statistics with enhanced data
  getOrderStats: async () => {
    try {
      const response = await api.get("/stats");
      return {
        success: true,
        data: response.data.data || response.data,
        message: "Statistics fetched successfully",
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.message,
        data: null,
      };
    }
  },

  // Update order status with validation
  updateOrderStatus: async (id, status) => {
    try {
      if (!id) {
        throw new Error("Order ID is required");
      }

      if (!status) {
        throw new Error("Status is required");
      }

      const validStatuses = [
        "new",
        "pending",
        "processing",
        "shipped",
        "in_transit",
        "delivered",
        "cancelled",
        "returned",
        "failed",
        "unknown",
        "claim_created",
        "claim_approved",
        "claim_rejected",
        "refunded",
        "consolidated",
        "in_batch",
      ];
      if (!validStatuses.includes(status)) {
        throw new Error(
          `Invalid status. Must be one of: ${validStatuses.join(", ")}`
        );
      }

      const response = await api.put(`/${id}/status`, { status });
      return {
        success: true,
        data: response.data.data || response.data,
        message: `Order status updated to ${status}`,
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.message,
        data: null,
      };
    }
  },

  // Export orders with format validation
  exportOrders: async (format = "csv", filters = {}) => {
    try {
      const validFormats = ["csv", "json", "xlsx"];
      if (!validFormats.includes(format)) {
        throw new Error(
          `Invalid format. Must be one of: ${validFormats.join(", ")}`
        );
      }

      const response = await api.get("/export", {
        params: { format, ...filters },
        responseType: "blob",
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `orders.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      return {
        success: true,
        message: "Export completed successfully",
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.message,
      };
    }
  },

  // Print shipping slip
  printShippingSlip: async (orderId, options = {}) => {
    try {
      if (!orderId) {
        throw new Error("Order ID is required");
      }

      const response = await api.post(
        `/${orderId}/print-shipping-slip`,
        options
      );
      return {
        success: true,
        data: response.data.data || response.data,
        message: "Shipping slip generated successfully",
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.message,
        data: null,
      };
    }
  },

  // Print invoice
  printInvoice: async (orderId, options = {}) => {
    try {
      if (!orderId) {
        throw new Error("Order ID is required");
      }

      const response = await api.post(`/${orderId}/print-invoice`, options);
      return {
        success: true,
        data: response.data.data || response.data,
        message: "Invoice generated successfully",
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.message,
        data: null,
      };
    }
  },

  // Cancel order with reason
  cancelOrder: async (orderId, reason = "") => {
    try {
      if (!orderId) {
        throw new Error("Order ID is required");
      }

      const response = await api.post(`/${orderId}/cancel`, { reason });
      return {
        success: true,
        data: response.data.data || response.data,
        message: "Order cancelled successfully",
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.message,
        data: null,
      };
    }
  },

  // Generate e-invoice
  generateEInvoice: async (orderId) => {
    try {
      if (!orderId) {
        throw new Error("Order ID is required");
      }

      const response = await api.post(`/${orderId}/einvoice`);
      return {
        success: true,
        data: response.data.data || response.data,
        message: "E-invoice generated successfully",
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.message,
        data: null,
      };
    }
  },

  // Bulk generate e-invoices
  bulkEInvoice: async (orderIds) => {
    try {
      if (!Array.isArray(orderIds) || orderIds.length === 0) {
        throw new Error("Order IDs array is required and cannot be empty");
      }

      const response = await api.post("/bulk-einvoice", { orderIds });
      return {
        success: true,
        data: response.data.data || response.data,
        message: `E-invoices generated for ${orderIds.length} orders`,
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.message,
        data: null,
      };
    }
  },

  // Accept order with validation
  acceptOrder: async (id) => {
    try {
      if (!id) {
        throw new Error("Order ID is required");
      }

      logger.info(`Accepting order with ID: ${id}`);

      const response = await api.put(`/${id}/accept`);

      logger.info("Accept order response:", response.data);

      return {
        success: response.data?.success ?? true,
        message: response.data?.message || "Order accepted successfully",
        data: response.data?.data || null,
      };
    } catch (error) {
      logger.error("Error accepting order:", error);
      return {
        success: false,
        message: error.response?.data?.message || error.message,
        data: null,
      };
    }
  },
};

export default orderService;
