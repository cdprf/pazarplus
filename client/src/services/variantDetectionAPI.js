import axios from "axios";

const API_BASE_URL =
  process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'production' ? 'https://pazarplus.onrender.com/api' : 'http://localhost:5001/api');

class VariantDetectionAPI {
  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
    });

    // Add auth token to requests
    this.axiosInstance.interceptors.request.use((config) => {
      const token = localStorage.getItem("authToken");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  /**
   * Classify a product's variant status
   * @param {string} productId - Product ID
   * @returns {Promise<Object>} Classification result
   */
  async classifyProductVariantStatus(productId) {
    try {
      const response = await this.axiosInstance.get(
        `/products/${productId}/variant-status`
      );
      return response.data;
    } catch (error) {
      console.error("Error classifying product variant status:", error);
      throw this.handleError(error);
    }
  }

  /**
   * Update a product's variant status
   * @param {string} productId - Product ID
   * @param {Object} classification - Classification data
   * @returns {Promise<Object>} Update result
   */
  async updateProductVariantStatus(productId, classification) {
    try {
      const response = await this.axiosInstance.post(
        `/products/${productId}/variant-status`,
        {
          classification,
        }
      );
      return response.data;
    } catch (error) {
      console.error("Error updating product variant status:", error);
      throw this.handleError(error);
    }
  }

  /**
   * Remove variant status from a product
   * @param {string} productId - Product ID
   * @returns {Promise<Object>} Removal result
   */
  async removeProductVariantStatus(productId) {
    try {
      const response = await this.axiosInstance.delete(
        `/products/${productId}/variant-status`
      );
      return response.data;
    } catch (error) {
      console.error("Error removing product variant status:", error);
      throw this.handleError(error);
    }
  }

  /**
   * Run batch variant detection on user's products
   * @param {Object} options - Detection options
   * @returns {Promise<Object>} Batch detection result
   */
  async runBatchVariantDetection(options = {}) {
    try {
      const params = new URLSearchParams();
      if (options.limit) params.append("limit", options.limit);
      if (options.category) params.append("category", options.category);
      if (options.status) params.append("status", options.status);

      const response = await this.axiosInstance.post(
        `/products/batch-variant-detection?${params.toString()}`
      );
      return response.data;
    } catch (error) {
      console.error("Error running batch variant detection:", error);
      throw this.handleError(error);
    }
  }

  /**
   * Handle API errors
   * @param {Error} error - Axios error
   * @returns {Error} Formatted error
   */
  handleError(error) {
    if (error.response) {
      // Server responded with error status
      const message = error.response.data?.message || "An error occurred";
      const status = error.response.status;
      return new Error(`${status}: ${message}`);
    } else if (error.request) {
      // Network error
      return new Error("Network error - please check your connection");
    } else {
      // Other error
      return new Error(error.message || "An unexpected error occurred");
    }
  }
}

const variantDetectionAPI = new VariantDetectionAPI();
export default variantDetectionAPI;
