import logger from "../utils/logger.js";
/**
 * Network utilities for handling cross-device PDF access
 * Provides robust URL construction and PDF access methods
 */

/**
 * Get the proper base URL for API calls that works across devices
 * @returns {string} The base URL that should work from any device
 */
export function getNetworkAccessibleBaseURL() {
  // In production, use the current origin
  if (process.env.NODE_ENV === "production") {
    return window.location.origin;
  }

  // In development, try to determine the network-accessible URL
  const hostname = window.location.hostname;

  // If already accessing via IP address, use that
  if (hostname !== "localhost" && hostname !== "127.0.0.1") {
    // For production deployment (HTTPS), don't include port
    const isProduction = window.location.protocol === "https:";
    if (isProduction) {
      return `${window.location.protocol}//${hostname}`;
    } else {
      return `${window.location.protocol}//${hostname}:5001`;
    }
  }

  // Check if we have a SERVER_HOST environment variable
  if (process.env.REACT_APP_SERVER_HOST) {
    return `http://${process.env.REACT_APP_SERVER_HOST}:5001`;
  }

  // Try to get the server's network IP from local storage (if previously detected)
  const savedServerIP = localStorage.getItem("server_network_ip");
  if (savedServerIP) {
    return `http://${savedServerIP}:5001`;
  }

  // Fallback to localhost (will only work on the same device)
  return "http://localhost:5001";
}

/**
 * Detect and save the server's network-accessible IP address
 * This should be called when the app loads successfully
 */
export async function detectAndSaveServerIP() {
  try {
    // If we're already accessing via IP, save it
    const hostname = window.location.hostname;
    if (
      hostname !== "localhost" &&
      hostname !== "127.0.0.1" &&
      hostname !== ""
    ) {
      localStorage.setItem("server_network_ip", hostname);
      return hostname;
    }

    // Try to detect the server's IP via a health check from known network ranges
    const commonIPRanges = ["192.168.1.", "192.168.0.", "10.0.0.", "172.16."];

    for (const range of commonIPRanges) {
      for (let i = 1; i < 255; i++) {
        const ip = `${range}${i}`;
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 1000);

          const response = await fetch(`http://${ip}:5001/api/health`, {
            signal: controller.signal,
            method: "GET",
            mode: "cors",
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            localStorage.setItem("server_network_ip", ip);
            logger.info(`✅ Detected server IP: ${ip}`);
            return ip;
          }
        } catch (error) {
          // Continue to next IP
          continue;
        }
      }
    }
  } catch (error) {
    logger.warn("Could not detect server IP:", error);
  }

  return null;
}

/**
 * Construct a proper PDF URL that works across devices
 * @param {string} pdfPath - The PDF path from server response
 * @returns {string} The network-accessible PDF URL
 */
export function constructPDFURL(pdfPath) {
  if (!pdfPath) return null;

  // If it's already a full URL, return as-is
  if (pdfPath.startsWith("http")) {
    return pdfPath;
  }

  // Get the network-accessible base URL
  const baseURL = getNetworkAccessibleBaseURL();

  // Ensure path starts with /
  const normalizedPath = pdfPath.startsWith("/") ? pdfPath : `/${pdfPath}`;

  return `${baseURL}${normalizedPath}`;
}

/**
 * Enhanced PDF opening with multiple fallback methods
 * @param {string} pdfUrl - The PDF URL to open
 * @param {string} filename - Optional filename for download fallback
 * @returns {Promise<boolean>} Success status
 */
export async function openPDFWithFallbacks(pdfUrl, filename = "document.pdf") {
  if (!pdfUrl) {
    throw new Error("PDF URL is required");
  }

  logger.info(`🖨️ Attempting to open PDF: ${pdfUrl}`);

  // Only use window.open - no fallbacks that could cause duplicates
  try {
    const pdfWindow = window.open(pdfUrl, "_blank", "noopener,noreferrer");

    if (pdfWindow && !pdfWindow.closed) {
      logger.info("✅ PDF opened successfully with window.open");
      return true;
    } else {
      throw new Error("Window.open was blocked or failed");
    }
  } catch (error) {
    logger.warn("window.open failed:", error);
    throw new Error(`Failed to open PDF: ${error.message}`);
  }
}

// Removed downloadPDFDirect as it's no longer used in favor of simplified openPDFWithFallbacks

/**
 * Test PDF URL accessibility
 * @param {string} pdfUrl - The PDF URL to test
 * @returns {Promise<boolean>} Whether the URL is accessible
 */
export async function testPDFAccessibility(pdfUrl) {
  try {
    const response = await fetch(pdfUrl, { method: "HEAD" });
    return response.ok;
  } catch (error) {
    return false;
  }
}
