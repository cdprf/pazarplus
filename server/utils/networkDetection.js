#!/usr/bin/env node

// Network IP Detection Utility
// This script detects the machine's network IP address and sets it as an environment variable

const os = require('os');
const path = require('path');

function getNetworkIP() {
  const interfaces = os.networkInterfaces();

  // Priority order for interface names (most common first)
  const preferredInterfaces = ['en0', 'eth0', 'wlan0', 'Wi-Fi', 'Ethernet'];

  // Try preferred interfaces first
  for (const interfaceName of preferredInterfaces) {
    const iface = interfaces[interfaceName];
    if (iface) {
      for (const alias of iface) {
        if (alias.family === 'IPv4' && !alias.internal) {
          return alias.address;
        }
      }
    }
  }

  // Fallback: check all interfaces
  for (const interfaceName in interfaces) {
    const iface = interfaces[interfaceName];
    for (const alias of iface) {
      if (alias.family === 'IPv4' && !alias.internal) {
        // Skip docker and other virtual interfaces
        if (
          !alias.address.startsWith('172.') &&
          !alias.address.startsWith('192.168.99.') &&
          !interfaceName.toLowerCase().includes('docker') &&
          !interfaceName.toLowerCase().includes('vbox')
        ) {
          return alias.address;
        }
      }
    }
  }

  return 'localhost';
}

function setNetworkEnvironment() {
  const networkIP = getNetworkIP();

  // Set environment variables
  process.env.HOST_IP = networkIP;
  process.env.SERVER_HOST = networkIP;

  console.log(`🌐 Network IP detected: ${networkIP}`);
  console.log(
    `📡 Server will be accessible at: http://${networkIP}:${
      process.env.PORT || 5001
    }`
  );

  return networkIP;
}

module.exports = {
  getNetworkIP,
  setNetworkEnvironment
};

// If run directly
if (require.main === module) {
  const ip = getNetworkIP();
  console.log(ip);
}
