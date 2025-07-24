import logger from "../utils/logger";
/**
 * Network initialization for PDF printing
 * Detects server IP and sets up network configuration
 */

import { detectAndSaveServerIP } from "../utils/networkUtils";

let initialized = false;

/**
 * Initialize network configuration for PDF printing
 * Should be called when the app starts
 */
export async function initializeNetworkForPDF() {
  if (initialized) {
    return;
  }

  logger.info("🌐 Initializing network configuration for PDF printing...");

  try {
    // Detect server IP if not already known
    const detectedIP = await detectAndSaveServerIP();

    if (detectedIP) {
      logger.info(`✅ Server IP detected and saved: ${detectedIP}`);
    } else {
      logger.info("⚠️ Could not detect server IP automatically");
    }

    // Set a flag to avoid reinitializing
    initialized = true;

    return detectedIP;
  } catch (error) {
    logger.warn("Network initialization failed:", error);
    initialized = true; // Still mark as initialized to avoid repeated attempts
    return null;
  }
}

/**
 * Reset network initialization (useful for testing)
 */
export function resetNetworkInitialization() {
  initialized = false;
  localStorage.removeItem("server_network_ip");
}
