import axios from "axios";

// Configure axios defaults - server runs on port 5001
axios.defaults.baseURL =
  process.env.REACT_APP_API_URL || "http://localhost:5001";
axios.defaults.withCredentials = true;

// Request interceptor for token handling
axios.interceptors.request.use(
  (config) => {
    // Token handling logic
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for enhanced JWT error handling
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    // Enhanced JWT error handling
    if (error.response?.status === 401) {
      const errorData = error.response.data;

      // Handle specific JWT invalid signature error
      if (errorData?.code === "INVALID_TOKEN_SIGNATURE") {
        console.warn(
          "🔐 Invalid JWT signature detected - clearing all auth data"
        );

        // Clear all possible auth storage locations
        const authKeys = [
          "token",
          "auth_token",
          "jwt_token",
          "access_token",
          "user",
        ];
        authKeys.forEach((key) => {
          localStorage.removeItem(key);
          sessionStorage.removeItem(key);
        });

        // Also clear any user data from localStorage
        localStorage.removeItem("user");
        sessionStorage.removeItem("user");

        // Show user-friendly message
        if (window.location.pathname !== "/login") {
          alert(
            "Your session has expired due to a security update. Please log in again."
          );
        }

        // Redirect to login
        window.location.href = "/login";
        return Promise.reject(error);
      }

      // Handle other authentication errors
      console.warn("🔒 Authentication failed - clearing token");
      localStorage.removeItem("token");
      sessionStorage.removeItem("token");

      // Only redirect if not already on login page
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

// Order API functions
const api = {
  // Order statistics
  getOrderStats: async () => {
    try {
      const response = await axios.get("/api/orders/stats");
      return response.data;
    } catch (error) {
      console.error("Error fetching order stats:", error);
      throw error;
    }
  },

  // Order trends
  getOrderTrends: async (period = "7days") => {
    try {
      const response = await axios.get(`/api/orders/trends?period=${period}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching order trends:", error);
      throw error;
    }
  },

  // Additional order functions that might be needed
  getOrders: async (params = {}) => {
    try {
      const response = await axios.get("/api/orders", { params });
      return response.data;
    } catch (error) {
      console.error("Error fetching orders:", error);
      throw error;
    }
  },

  getOrderById: async (id) => {
    try {
      const response = await axios.get(`/api/orders/${id}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching order:", error);
      throw error;
    }
  },

  createOrder: async (orderData) => {
    try {
      const response = await axios.post("/api/orders", orderData);
      return response.data;
    } catch (error) {
      console.error("Error creating order:", error);
      throw error;
    }
  },

  updateOrder: async (id, orderData) => {
    try {
      const response = await axios.put(`/api/orders/${id}`, orderData);
      return response.data;
    } catch (error) {
      console.error("Error updating order:", error);
      throw error;
    }
  },

  deleteOrder: async (id) => {
    try {
      const response = await axios.delete(`/api/orders/${id}`);
      return response.data;
    } catch (error) {
      console.error("Error deleting order:", error);
      throw error;
    }
  },
};

export default api;
