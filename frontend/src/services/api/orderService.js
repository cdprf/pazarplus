import axios from 'axios';
import { handleApiError } from '../../utils/apiErrorHandler';

const BASE_URL = '/api/orders';

export const orderService = {
  // Get order statistics
  async getOrderStats() {
    try {
      const response = await axios.get(`${BASE_URL}/stats`);
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
        }
      });
      
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Get single order by ID
  async getOrder(orderId) {
    try {
      const response = await axios.get(`${BASE_URL}/${orderId}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Create a new order
  async createOrder(orderData) {
    try {
      const response = await axios.post(BASE_URL, orderData);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Update single order
  async updateOrder(orderId, orderData) {
    try {
      const response = await axios.put(`${BASE_URL}/${orderId}`, orderData);
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
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Cancel an order
  async cancelOrder(orderId, reason) {
    try {
      const response = await axios.post(`${BASE_URL}/${orderId}/cancel`, { reason });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Delete an order
  async deleteOrder(orderId) {
    try {
      const response = await axios.delete(`${BASE_URL}/${orderId}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Get order statistics/metrics
  async getOrderStatistics(params = {}) {
    try {
      const response = await axios.get(`${BASE_URL}/statistics`, { params });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Get order history/audit logs
  async getOrderHistory(orderId) {
    try {
      const response = await axios.get(`${BASE_URL}/${orderId}/history`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Perform order action (fulfill, cancel, etc)
  async performOrderAction(orderId, action, data = {}) {
    try {
      const response = await axios.post(`${BASE_URL}/${orderId}/actions/${action}`, data);
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
        responseType: 'blob'
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
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Get order trends data for charts
  async getOrderTrends(params = {}) {
    try {
      const response = await axios.get(`${BASE_URL}/trends`, { params });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Sync orders from external platforms
  async syncOrders(params = {}) {
    try {
      const { platformId, dateRange } = params;
      const response = await axios.post(`${BASE_URL}/sync`, {
        platformId,
        dateRange
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Get shipping details for an order
  async getShippingDetails(orderId) {
    try {
      const response = await axios.get(`${BASE_URL}/${orderId}/shipping`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Create shipping label for an order
  async createShippingLabel(orderId, shippingData) {
    try {
      const response = await axios.post(`${BASE_URL}/${orderId}/shipping`, shippingData);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }
};