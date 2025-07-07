/**
 * Variant Detection Configuration API Client
 * Handles communication with the backend variant detection service
 */

class VariantDetectionConfigAPI {
  constructor() {
    this.baseURL = "/api/products/background-variant-detection";
  }

  /**
   * Get authentication headers
   */
  getHeaders() {
    const token = localStorage.getItem("token");
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  }

  /**
   * Get service status
   */
  async getStatus() {
    try {
      const response = await fetch(`${this.baseURL}/status`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error getting variant detection status:", error);
      throw error;
    }
  }

  /**
   * Start the background service
   */
  async startService(config = null) {
    try {
      const requestBody = config ? config : {};

      const response = await fetch(`${this.baseURL}/start`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error starting variant detection service:", error);
      throw error;
    }
  }

  /**
   * Stop the background service
   */
  async stopService() {
    try {
      const response = await fetch(`${this.baseURL}/stop`, {
        method: "POST",
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error stopping variant detection service:", error);
      throw error;
    }
  }

  /**
   * Get the current configuration
   */
  async getConfig() {
    try {
      const response = await fetch(`${this.baseURL}/config`, {
        method: "GET",
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error getting variant detection config:", error);
      throw error;
    }
  }

  /**
   * Update service configuration
   */
  async updateConfig(config) {
    try {
      const response = await fetch(`${this.baseURL}/config`, {
        method: "PUT",
        headers: this.getHeaders(),
        body: JSON.stringify({ config }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error updating variant detection config:", error);
      throw error;
    }
  }

  /**
   * Run batch variant detection
   */
  async runBatchDetection(options = {}) {
    try {
      const params = new URLSearchParams();
      if (options.limit) params.append("limit", options.limit);
      if (options.category) params.append("category", options.category);
      if (options.status) params.append("status", options.status);

      const response = await fetch(
        `/api/products/batch-variant-detection?${params.toString()}`,
        {
          method: "POST",
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error running batch variant detection:", error);
      throw error;
    }
  }
}

// Export singleton instance
export const variantDetectionConfigAPI = new VariantDetectionConfigAPI();
export default VariantDetectionConfigAPI;
