import axios from 'axios';
import { handleApiError } from '../../utils/apiErrorHandler';

// Use environment variable or fall back to the correct backend URL (port 3001)
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
const BASE_URL = `${API_URL}/orders`;

// Add development mode headers when in development environment
const getHeaders = () => {
  // Start with default headers
  const headers = {};
  
  // Add development mode header when in development environment
  if (process.env.NODE_ENV === 'development') {
    headers['x-dev-mode'] = 'true';
  }
  
  // Add authentication token from localStorage if available
  const token = localStorage.getItem('token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return { headers };
};

export const orderService = {
  // Get order statistics
  async getOrderStats() {
    try {
      const response = await axios.get(`${BASE_URL}/stats`, getHeaders());
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Get orders with pagination and filters
  async getOrders(params = {}) {
    try {
      const { page = 0, size = 10, sortBy = 'orderDate', sortOrder = 'DESC', ...filters } = params;
      
      const response = await axios.get(BASE_URL, {
        params: {
          page,
          size,
          sortBy,
          sortOrder,
          ...filters
        },
        ...getHeaders()
      });
      
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Get single order by ID
  async getOrder(orderId) {
    try {
      const response = await axios.get(`${BASE_URL}/${orderId}`, getHeaders());
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Create a new order
  async createOrder(orderData) {
    try {
      const response = await axios.post(BASE_URL, orderData, getHeaders());
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Update single order
  async updateOrder(orderId, orderData) {
    try {
      const response = await axios.put(`${BASE_URL}/${orderId}`, orderData, getHeaders());
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Batch update multiple orders
  async updateOrders(orderIds, updates) {
    try {
      const response = await axios.put(`${BASE_URL}/batch`, {
        orderIds,
        updates
      }, getHeaders());
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Cancel an order
  async cancelOrder(orderId, reason) {
    try {
      const response = await axios.post(`${BASE_URL}/${orderId}/cancel`, { reason }, getHeaders());
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Delete an order
  async deleteOrder(orderId) {
    try {
      const response = await axios.delete(`${BASE_URL}/${orderId}`, getHeaders());
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Get order statistics/metrics
  async getOrderStatistics(params = {}) {
    try {
      // Use stats endpoint instead of statistics since that's what's available in the backend
      const response = await axios.get(`${BASE_URL}/stats`, { 
        params,
        ...getHeaders()
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Get order history/audit logs
  async getOrderHistory(orderId) {
    try {
      const response = await axios.get(`${BASE_URL}/${orderId}/history`, getHeaders());
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Perform order action (fulfill, cancel, etc)
  async performOrderAction(orderId, action, data = {}) {
    try {
      const response = await axios.post(`${BASE_URL}/${orderId}/actions/${action}`, data, getHeaders());
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Export orders
  async exportOrders(params = {}) {
    try {
      const response = await axios.get(`${BASE_URL}/export`, { 
        params,
        responseType: 'blob',
        ...getHeaders()
      });
      return response;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Import orders
  async importOrders(fileData) {
    try {
      const formData = new FormData();
      formData.append('file', fileData);
      
      const response = await axios.post(`${BASE_URL}/import`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...getHeaders().headers
        }
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Import Hepsiburada order directly
  async importHepsiburadaOrder(orderData, connectionId) {
    try {
      const response = await axios.post(
        `${BASE_URL}/import/hepsiburada?connectionId=${connectionId}`, 
        orderData, 
        getHeaders()
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Get order trends data for charts
  async getOrderTrends(params = {}) {
    try {
      const response = await axios.get(`${BASE_URL}/trends`, { 
        params,
        ...getHeaders()
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Sync orders from external platforms
  async syncOrders(platformId, dateRange = {}) {
    try {
      // If a specific platform ID is provided, use the platform-specific endpoint
      if (platformId) {
        const response = await axios.post(`${BASE_URL}/sync/${platformId}`, 
          dateRange, 
          getHeaders()
        );
        return response.data;
      } else {
        // Otherwise use the general sync endpoint
        const response = await axios.post(`${BASE_URL}/sync`, {
          platformId,
          dateRange
        }, getHeaders());
        return response.data;
      }
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Get shipping details for an order
  async getShippingDetails(orderId) {
    try {
      const response = await axios.get(`${BASE_URL}/${orderId}/shipping`, getHeaders());
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Create shipping label for an order
  async createShippingLabel(orderId, shippingData) {
    try {
      const response = await axios.post(`${BASE_URL}/${orderId}/shipping`, shippingData, getHeaders());
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Get order with platform-specific details
  async getOrderWithPlatformDetails(orderId) {
    try {
      const response = await axios.get(`${BASE_URL}/${orderId}/platform-details`, getHeaders());
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },
};