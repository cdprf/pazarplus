const express = require("express");
const router = express.Router();
const os = require("os");
const config = require("../config/config");

/**
 * Get network configuration information
 */
router.get("/network-info", (req, res) => {
  try {
    // Get current network interfaces
    const interfaces = os.networkInterfaces();
    const networkInfo = [];

    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        // Skip over internal (i.e. 127.0.0.1) and non-IPv4 addresses
        if (iface.family === "IPv4" && !iface.internal) {
          networkInfo.push({
            interface: name,
            address: iface.address,
            netmask: iface.netmask,
            mac: iface.mac,
          });
        }
      }
    }

    // Get the primary IP (usually the first non-internal IPv4 address)
    const primaryIP =
      networkInfo.length > 0 ? networkInfo[0].address : "localhost";

    res.json({
      success: true,
      data: {
        primaryIP,
        hostname: os.hostname(),
        platform: os.platform(),
        networkInterfaces: networkInfo,
        serverPort: config.server.port,
        apiBaseUrl: `http://${primaryIP}:${config.server.port}/api`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error getting network info:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get network information",
      error: error.message,
    });
  }
});

/**
 * Health check endpoint that includes network info
 */
router.get("/network-health", (req, res) => {
  try {
    const interfaces = os.networkInterfaces();
    let primaryIP = "localhost";

    // Find the first non-internal IPv4 address
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === "IPv4" && !iface.internal) {
          primaryIP = iface.address;
          break;
        }
      }
      if (primaryIP !== "localhost") {
        break;
      }
    }

    res.json({
      success: true,
      status: "healthy",
      network: {
        primaryIP,
        hostname: os.hostname(),
        port: config.server.port,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: "error",
      error: error.message,
    });
  }
});

module.exports = router;
