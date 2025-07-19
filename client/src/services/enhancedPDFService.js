/**
 * Enhanced PDF Service with network-aware functionality
 * Handles PDF generation and access across different devices
 */

import api from "../services/api";
import {
  constructPDFURL,
  openPDFWithFallbacks,
  testPDFAccessibility,
  getNetworkAccessibleBaseURL,
} from "../utils/networkUtils";

class EnhancedPDFService {
  /**
   * Generate and open shipping slip PDF with network-aware handling
   * @param {string} orderId - The order ID
   * @param {string} templateId - Optional template ID
   * @returns {Promise<object>} Result object
   */
  async generateAndOpenShippingSlip(orderId, templateId = null) {
    try {
      console.log(
        `🖨️ [PDF Service] Generating shipping slip for order ${orderId} with template ${templateId}`
      );

      // Generate PDF using existing API
      const response = await api.shipping.generatePDF(orderId, templateId);

      console.log(
        `📄 [PDF Service] API response for order ${orderId}:`,
        response.success ? "SUCCESS" : "FAILED"
      );

      if (!response.success) {
        throw new Error(response.message || "Failed to generate PDF");
      }

      // Extract PDF URL from response
      const pdfPath = response.data?.labelUrl || response.labelUrl;
      if (!pdfPath) {
        throw new Error("No PDF URL in response");
      }

      // Construct network-accessible URL
      const pdfUrl = constructPDFURL(pdfPath);
      console.log(
        `🔗 [PDF Service] Network-accessible PDF URL for order ${orderId}: ${pdfUrl}`
      );

      // Test accessibility before opening
      const isAccessible = await testPDFAccessibility(pdfUrl);
      if (!isAccessible) {
        console.warn(
          `⚠️ [PDF Service] PDF URL not accessible for order ${orderId}, may cause issues on other devices`
        );
      }

      // Open PDF with simplified method (no fallbacks to prevent duplicates)
      const filename = `shipping-slip-${orderId}.pdf`;
      console.log(
        `🚀 [PDF Service] Opening PDF for order ${orderId}: ${filename}`
      );

      await openPDFWithFallbacks(pdfUrl, filename);

      console.log(
        `✅ [PDF Service] Successfully opened PDF for order ${orderId}`
      );

      return {
        success: true,
        url: pdfUrl,
        accessible: isAccessible,
        message: "Shipping slip generated and opened successfully",
      };
    } catch (error) {
      console.error(
        `❌ [PDF Service] Error generating shipping slip for order ${orderId}:`,
        error
      );
      return {
        success: false,
        error: error.message,
        message: `Failed to generate shipping slip: ${error.message}`,
      };
    }
  }

  /**
   * Generate and open invoice PDF with network-aware handling
   * @param {string} orderId - The order ID
   * @returns {Promise<object>} Result object
   */
  async generateAndOpenInvoice(orderId) {
    try {
      console.log(`🖨️ Generating invoice for order ${orderId}`);

      // Generate invoice using existing API
      const response = await api.orders.printInvoice(orderId);

      if (!response.success) {
        throw new Error(response.message || "Failed to generate invoice");
      }

      // Extract PDF URL from response
      const pdfPath = response.data?.pdfUrl || response.pdfUrl;
      if (!pdfPath) {
        throw new Error("No PDF URL in response");
      }

      // Construct network-accessible URL
      const pdfUrl = constructPDFURL(pdfPath);
      console.log(`🔗 Network-accessible invoice URL: ${pdfUrl}`);

      // Test accessibility
      const isAccessible = await testPDFAccessibility(pdfUrl);
      if (!isAccessible) {
        console.warn(
          "⚠️ Invoice PDF URL not accessible, may cause issues on other devices"
        );
      }

      // Open PDF with fallbacks
      const filename = `invoice-${orderId}.pdf`;
      await openPDFWithFallbacks(pdfUrl, filename);

      return {
        success: true,
        url: pdfUrl,
        accessible: isAccessible,
        message: "Invoice generated and opened successfully",
      };
    } catch (error) {
      console.error("Error generating invoice:", error);
      return {
        success: false,
        error: error.message,
        message: `Failed to generate invoice: ${error.message}`,
      };
    }
  }

  /**
   * Generate PDF and return URL without opening
   * @param {string} orderId - The order ID
   * @param {string} templateId - Optional template ID
   * @returns {Promise<object>} Result with PDF URL
   */
  async generatePDFOnly(orderId, templateId = null) {
    try {
      const response = await api.shipping.generatePDF(orderId, templateId);

      if (!response.success) {
        throw new Error(response.message || "Failed to generate PDF");
      }

      const pdfPath = response.data?.labelUrl || response.labelUrl;
      if (!pdfPath) {
        throw new Error("No PDF URL in response");
      }

      const pdfUrl = constructPDFURL(pdfPath);
      const isAccessible = await testPDFAccessibility(pdfUrl);

      return {
        success: true,
        url: pdfUrl,
        accessible: isAccessible,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Open an existing PDF URL with enhanced methods
   * @param {string} pdfUrl - The PDF URL to open
   * @param {string} filename - Optional filename
   * @returns {Promise<boolean>} Success status
   */
  async openExistingPDF(pdfUrl, filename = "document.pdf") {
    try {
      // Ensure URL is network-accessible
      const accessibleUrl = constructPDFURL(pdfUrl);
      await openPDFWithFallbacks(accessibleUrl, filename);
      return true;
    } catch (error) {
      console.error("Error opening PDF:", error);
      throw error;
    }
  }

  /**
   * Get current network status and PDF accessibility info
   * @returns {object} Network status information
   */
  async getNetworkStatus() {
    const baseURL = getNetworkAccessibleBaseURL();

    try {
      // Test server connectivity
      const healthResponse = await fetch(`${baseURL}/api/health`);
      const serverAccessible = healthResponse.ok;

      return {
        baseURL,
        serverAccessible,
        isLocalhost: baseURL.includes("localhost"),
        currentDeviceIP: window.location.hostname,
        recommendations: this.getNetworkRecommendations(
          baseURL,
          serverAccessible
        ),
      };
    } catch (error) {
      return {
        baseURL,
        serverAccessible: false,
        isLocalhost: baseURL.includes("localhost"),
        currentDeviceIP: window.location.hostname,
        error: error.message,
        recommendations: this.getNetworkRecommendations(baseURL, false),
      };
    }
  }

  /**
   * Get network recommendations based on current setup
   * @param {string} baseURL - Current base URL
   * @param {boolean} serverAccessible - Whether server is accessible
   * @returns {array} Array of recommendation strings
   */
  getNetworkRecommendations(baseURL, serverAccessible) {
    const recommendations = [];

    if (baseURL.includes("localhost")) {
      recommendations.push(
        "You are accessing via localhost. Other devices on the network cannot access PDFs."
      );
      recommendations.push(
        "To allow other devices to print PDFs, access the app using your computer's IP address."
      );
      recommendations.push(
        "Example: http://192.168.1.100:3000 instead of http://localhost:3000"
      );
    }

    if (!serverAccessible) {
      recommendations.push(
        "Server is not accessible. Check if the server is running."
      );
      recommendations.push(
        "Ensure your device is connected to the same network as the server."
      );
      recommendations.push("Check firewall settings that might block access.");
    }

    if (recommendations.length === 0) {
      recommendations.push(
        "Network setup looks good! PDFs should work across devices."
      );
    }

    return recommendations;
  }
}

const enhancedPDFService = new EnhancedPDFService();
export default enhancedPDFService;
