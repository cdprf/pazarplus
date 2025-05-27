import axios from "axios";

// Determine the correct API base URL
const getApiBaseUrl = () => {
  if (process.env.NODE_ENV === "development") {
    return process.env.REACT_APP_API_URL || "http://localhost:5001";
  }
  return process.env.REACT_APP_API_URL || window.location.origin;
};

// Create axios instance with proper configuration
const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token && token.length < 2000) {
      // Avoid large tokens that cause 431
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Only log in development
    if (process.env.NODE_ENV === "development") {
      console.log(
        `🌐 API Request: ${config.method?.toUpperCase()} ${config.url}`,
        {
          baseURL: config.baseURL,
          headers: Object.keys(config.headers),
          tokenPresent: !!token,
          tokenLength: token?.length || 0,
        }
      );
    }

    return config;
  },
  (error) => {
    if (process.env.NODE_ENV === "development") {
      console.error("❌ Request interceptor error:", error);
    }
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    if (process.env.NODE_ENV === "development") {
      console.log(`✅ API Response: ${response.status}`, {
        url: response.config.url,
        status: response.status,
      });
    }
    return response;
  },
  (error) => {
    if (process.env.NODE_ENV === "development") {
      console.error("❌ API Response error:", {
        url: error.config?.url,
        status: error.response?.status,
        message: error.message,
        data: error.response?.data,
      });
    }

    // Handle 431 errors specifically
    if (error.response?.status === 431) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "🚨 Request header too large - clearing potentially corrupted token"
        );
      }
      localStorage.removeItem("token");
      window.location.reload();
    }

    return Promise.reject(error);
  }
);

// Platform-specific API methods
const platformAPI = {
  // Get all platform connections
  getConnections: async () => {
    try {
      const response = await api.get("/api/platforms/connections");
      return response.data;
    } catch (error) {
      // Error will be handled by the calling component
      throw error;
    }
  },

  // Get specific platform connection
  getConnection: async (id) => {
    try {
      const response = await api.get(`/api/platforms/connections/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Create new platform connection
  createConnection: async (connectionData) => {
    try {
      const response = await api.post(
        "/api/platforms/connections",
        connectionData
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Update platform connection
  updateConnection: async (id, updates) => {
    try {
      const response = await api.put(
        `/api/platforms/connections/${id}`,
        updates
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Delete platform connection
  deleteConnection: async (id) => {
    try {
      const response = await api.delete(`/api/platforms/connections/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Test platform connection
  testConnection: async (id) => {
    try {
      const response = await api.post(`/api/platforms/connections/${id}/test`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Force sync platform
  syncPlatform: async (id) => {
    try {
      const response = await api.post(`/api/platforms/connections/${id}/sync`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Update platform settings
  updateSettings: async (id, settings) => {
    try {
      const response = await api.put(
        `/api/platforms/connections/${id}/settings`,
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
        `/api/platforms/connections/${id}/analytics?timeRange=${timeRange}`
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get platform statistics (aggregate across all platforms)
  getPlatformStats: async (timeRange = "30d") => {
    try {
      const response = await api.get(
        `/api/platforms/stats?timeRange=${timeRange}`
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
        ? `/api/platforms/connections/${id}/sync-history?${queryString}`
        : `/api/platforms/connections/${id}/sync-history`;
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
        `/api/platforms/connections/${id}/sync-history/${syncId}/retry`
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

// Order-specific API methods
const orderAPI = {
  // Get orders with optional query parameters
  getOrders: async (params = {}) => {
    try {
      const queryString = new URLSearchParams(params).toString();
      const url = queryString ? `/api/orders?${queryString}` : "/api/orders";
      const response = await api.get(url);

      // Handle both array and paginated responses
      if (Array.isArray(response.data)) {
        return {
          success: true,
          data: response.data,
          total: response.data.length,
        };
      }

      return {
        success: true,
        data: response.data.data || response.data.orders || [],
        total: response.data.total || response.data.count || 0,
        page: response.data.page || 1,
        totalPages: response.data.totalPages || 1,
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.message,
        data: null,
      };
    }
  },

  // Get order statistics
  getOrderStats: async () => {
    try {
      const response = await api.get("/api/orders/stats");
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get order trends
  getOrderTrends: async (timeRange = "30d") => {
    try {
      const response = await api.get(
        `/api/orders/trends?timeRange=${timeRange}`
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get single order by ID
  getOrder: async (id) => {
    try {
      const response = await api.get(`/api/orders/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Create new order
  createOrder: async (orderData) => {
    try {
      const response = await api.post("/api/orders", orderData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Update order
  updateOrder: async (id, orderData) => {
    try {
      const response = await api.put(`/api/orders/${id}`, orderData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Update order status
  updateOrderStatus: async (id, status) => {
    try {
      const response = await api.put(`/api/orders/${id}/status`, { status });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Bulk update order status - Added for OrderManagement component
  bulkUpdateStatus: async (orderIds, status) => {
    try {
      const response = await api.put("/api/orders/bulk/status", {
        orderIds,
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
      const url = platformId
        ? `/api/orders/sync?platformId=${platformId}`
        : "/api/orders/sync";
      const response = await api.post(url);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Bulk update orders
  bulkUpdateOrders: async (orderIds, updates) => {
    try {
      const response = await api.put("/api/orders/bulk", { orderIds, updates });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Delete order
  deleteOrder: async (id) => {
    try {
      const response = await api.delete(`/api/orders/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Generate e-invoice
  generateEInvoice: async (id) => {
    try {
      const response = await api.post(`/api/orders/${id}/einvoice`);
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
      const url = queryString
        ? `/api/customers?${queryString}`
        : "/api/customers";
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get single customer by ID
  getCustomer: async (id) => {
    try {
      const response = await api.get(`/api/customers/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Create new customer
  createCustomer: async (customerData) => {
    try {
      const response = await api.post("/api/customers", customerData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Update customer
  updateCustomer: async (id, updates) => {
    try {
      const response = await api.put(`/api/customers/${id}`, updates);
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
        ? `/api/customers/${id}/orders?${queryString}`
        : `/api/customers/${id}/orders`;
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

// Shipping API methods
const shippingAPI = {
  // Get shipping carriers
  getShippingCarriers: async () => {
    try {
      const response = await api.get("/api/shipping/carriers");
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Create shipping carrier
  createShippingCarrier: async (carrierData) => {
    try {
      const response = await api.post("/api/shipping/carriers", carrierData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Update shipping carrier
  updateShippingCarrier: async (id, carrierData) => {
    try {
      const response = await api.put(
        `/api/shipping/carriers/${id}`,
        carrierData
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Delete shipping carrier
  deleteShippingCarrier: async (id) => {
    try {
      const response = await api.delete(`/api/shipping/carriers/${id}`);
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
        ? `/api/shipping/rates?${queryString}`
        : "/api/shipping/rates";
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Calculate shipping cost
  calculateShippingCost: async (shippingData) => {
    try {
      const response = await api.post("/api/shipping/calculate", shippingData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Create shipping label
  createShippingLabel: async (labelData) => {
    try {
      const response = await api.post("/api/shipping/labels", labelData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Track shipment
  trackShipment: async (trackingNumber, carrier) => {
    try {
      const response = await api.get(
        `/api/shipping/track/${trackingNumber}?carrier=${carrier}`
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

// Import/Export API methods
const importExportAPI = {
  // Import data from file
  importData: async (formData, config = {}) => {
    try {
      const response = await api.post("/api/import", formData, {
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
      const response = await api.get(`/api/export/${type}?format=${format}`, {
        responseType: "blob",
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Download template
  downloadTemplate: async (type) => {
    try {
      const response = await api.get(`/api/templates/${type}`, {
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
      const response = await api.get("/api/dashboard/stats");
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get recent activities
  getRecentActivities: async (limit = 10) => {
    try {
      const response = await api.get(
        `/api/dashboard/activities?limit=${limit}`
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get performance metrics
  getPerformanceMetrics: async (timeRange = "30d") => {
    try {
      const response = await api.get(
        `/api/dashboard/performance?timeRange=${timeRange}`
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

// Settings API methods
const settingsAPI = {
  // Get app settings
  getAppSettings: async () => {
    try {
      const response = await api.get("/api/settings/app");
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Update app settings
  updateAppSettings: async (settings) => {
    try {
      const response = await api.put("/api/settings/app", settings);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get notification settings
  getNotificationSettings: async () => {
    try {
      const response = await api.get("/api/settings/notifications");
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Update notification settings
  updateNotificationSettings: async (settings) => {
    try {
      const response = await api.put("/api/settings/notifications", settings);
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
      const response = await api.get(`/api/reports/export?${params}`, {
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
        `/api/reports/analytics?timeRange=${timeRange}`
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
        `/api/reports/customers?timeRange=${timeRange}`
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
        `/api/reports/products?timeRange=${timeRange}`
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
      const url = queryString
        ? `/api/products?${queryString}`
        : "/api/products";
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get single product by ID
  getProduct: async (id) => {
    try {
      const response = await api.get(`/api/products/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Create new product
  createProduct: async (productData) => {
    try {
      const response = await api.post("/api/products", productData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Update product
  updateProduct: async (id, productData) => {
    try {
      const response = await api.put(`/api/products/${id}`, productData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Delete product
  deleteProduct: async (id) => {
    try {
      const response = await api.delete(`/api/products/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Bulk delete products
  bulkDelete: async (productIds) => {
    try {
      const response = await api.delete("/api/products/bulk", {
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
      const response = await api.put("/api/products/bulk/status", {
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
      const response = await api.get("/api/products/stats");
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

// Extend the default export with all API methods
api.platforms = platformAPI;
api.orders = orderAPI;
api.customers = customerAPI;
api.shipping = shippingAPI;
api.importExport = importExportAPI;
api.dashboard = dashboardAPI;
api.settings = settingsAPI;
api.reports = reportsAPI;
api.products = productAPI;

// Add legacy direct methods for backward compatibility with existing hooks
api.getOrders = orderAPI.getOrders;
api.getOrderStats = orderAPI.getOrderStats;
api.getOrderTrends = orderAPI.getOrderTrends;
api.getOrder = orderAPI.getOrder;
api.createOrder = orderAPI.createOrder;
api.updateOrder = orderAPI.updateOrder;
api.updateOrderStatus = orderAPI.updateOrderStatus;
api.syncOrders = orderAPI.syncOrders;

// Add new methods for reports
api.getConnections = platformAPI.getConnections;
api.getPlatformStats = platformAPI.getPlatformStats;
api.exportReport = reportsAPI.exportReport;

export default api;
