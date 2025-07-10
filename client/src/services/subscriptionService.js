import axios from "axios";
import { getAuthHeader } from "../utils/auth";

// Dynamic API base URL that works for both localhost and network access
const getApiBaseUrl = () => {
  if (process.env.NODE_ENV === "development") {
    const hostname = window.location.hostname;

    // If hostname is an IP address (mobile access), use the same IP for API
    if (hostname !== "localhost" && hostname !== "127.0.0.1") {
      return `http://${hostname}:5001/api`;
    }

    // Default to localhost for desktop development
    return process.env.REACT_APP_API_URL || "http://localhost:5001/api";
  }
  return process.env.REACT_APP_API_URL || "https://pazarplus.onrender.com/api";
};

const API_BASE_URL = getApiBaseUrl();

class SubscriptionService {
  constructor() {
    this.baseURL = `${API_BASE_URL}/subscriptions`;
  }

  async getCurrentSubscription() {
    try {
      const response = await axios.get(`${this.baseURL}/current`, {
        headers: getAuthHeader(),
      });
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || "Failed to fetch subscription"
      );
    }
  }

  async getPlans() {
    try {
      const response = await axios.get(`${this.baseURL}/plans`, {
        headers: getAuthHeader(),
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || "Failed to fetch plans");
    }
  }

  async getBillingHistory(page = 1, limit = 10) {
    try {
      const response = await axios.get(`${this.baseURL}/billing-history`, {
        params: { page, limit },
        headers: getAuthHeader(),
      });
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || "Failed to fetch billing history"
      );
    }
  }

  async getUsageStats() {
    try {
      const response = await axios.get(`${this.baseURL}/usage`, {
        headers: getAuthHeader(),
      });
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || "Failed to fetch usage stats"
      );
    }
  }

  async startTrial() {
    try {
      const response = await axios.post(
        `${this.baseURL}/start-trial`,
        {},
        {
          headers: getAuthHeader(),
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || "Failed to start trial");
    }
  }

  async upgradePlan(planId) {
    try {
      const response = await axios.post(
        `${this.baseURL}/upgrade`,
        { planId },
        { headers: getAuthHeader() }
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || "Failed to upgrade plan"
      );
    }
  }

  async cancelSubscription(reason = "") {
    try {
      const response = await axios.post(
        `${this.baseURL}/cancel`,
        { reason },
        { headers: getAuthHeader() }
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || "Failed to cancel subscription"
      );
    }
  }

  async updatePaymentMethod(paymentData) {
    try {
      const response = await axios.put(
        `${this.baseURL}/payment-method`,
        paymentData,
        { headers: getAuthHeader() }
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || "Failed to update payment method"
      );
    }
  }

  async downloadInvoice(invoiceId) {
    try {
      const response = await axios.get(
        `${this.baseURL}/invoices/${invoiceId}/download`,
        {
          headers: getAuthHeader(),
          responseType: "blob",
        }
      );

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `invoice-${invoiceId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      return true;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || "Failed to download invoice"
      );
    }
  }

  async trackUsage(metricType, increment = 1) {
    try {
      const response = await axios.post(
        `${this.baseURL}/track-usage`,
        { metricType, increment },
        { headers: getAuthHeader() }
      );
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || "Failed to track usage");
    }
  }

  async createCustomCheckout(planId, metadata = {}) {
    try {
      const response = await axios.post(
        `${this.baseURL}/create-checkout`,
        { planId, metadata },
        { headers: getAuthHeader() }
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || "Failed to create checkout session"
      );
    }
  }

  async validateFeatureAccess(feature) {
    try {
      const response = await axios.get(
        `${this.baseURL}/validate-feature/${feature}`,
        {
          headers: getAuthHeader(),
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || "Failed to validate feature access"
      );
    }
  }

  async getSubscriptionAnalytics(timeframe = "30d") {
    try {
      const response = await axios.get(`${this.baseURL}/analytics`, {
        params: { timeframe },
        headers: getAuthHeader(),
      });
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message ||
          "Failed to fetch subscription analytics"
      );
    }
  }
}

export const subscriptionService = new SubscriptionService();
