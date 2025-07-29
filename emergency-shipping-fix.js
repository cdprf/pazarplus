#!/usr/bin/env node
/**
 * Emergency Shipping Route Fix for server.js
 * This script adds the shipping route directly to server.js if app.js routing isn't working
 */

const fs = require("fs");
const path = require("path");

console.log("🚨 EMERGENCY SHIPPING ROUTE FIX");
console.log("=================================");

const currentDir = process.cwd();
const serverJsPath = path.join(currentDir, "server", "server.js");

console.log(`Checking server.js at: ${serverJsPath}`);

if (!fs.existsSync(serverJsPath)) {
  console.log("❌ server.js not found");
  process.exit(1);
}

// Read current server.js content
let serverContent = fs.readFileSync(serverJsPath, "utf8");

// Check if shipping route is already added
if (serverContent.includes('app.use("/shipping"')) {
  console.log("✅ Shipping route already exists in server.js");
  process.exit(0);
}

// Find the best insertion point (after app import)
const appImportMatch = serverContent.match(
  /const\\s*{\\s*app.*?}\\s*=\\s*require\\(['"]\.\/app['"]\\);/
);

if (!appImportMatch) {
  console.log("❌ Could not find app import in server.js");
  process.exit(1);
}

const insertionPoint = appImportMatch.index + appImportMatch[0].length;

// Shipping route code to insert
const shippingRouteCode = `

// Emergency shipping route fix - serve PDFs statically
const path = require('path');
const express = require('express');

// Ensure shipping directory exists
const shippingPath = path.join(__dirname, 'public', 'shipping');
const fs = require('fs');
if (!fs.existsSync(shippingPath)) {
  fs.mkdirSync(shippingPath, { recursive: true });
  console.log('Created shipping directory:', shippingPath);
}

// Configure shipping route with proper headers
app.use('/shipping', (req, res, next) => {
  if (req.path.endsWith('.pdf')) {
    res.setHeader('Content-Type', 'application/pdf; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  }
  next();
});

app.use('/shipping', express.static(shippingPath));
console.log('🚀 Emergency shipping route configured:', shippingPath);
`;

// Insert the shipping route code
const newServerContent =
  serverContent.slice(0, insertionPoint) +
  shippingRouteCode +
  serverContent.slice(insertionPoint);

// Create backup
const backupPath = serverJsPath + ".backup." + Date.now();
fs.writeFileSync(backupPath, serverContent);
console.log(`✅ Created backup: ${backupPath}`);

// Write modified server.js
fs.writeFileSync(serverJsPath, newServerContent);
console.log("✅ Added emergency shipping route to server.js");

console.log("\\n🎯 NEXT STEPS:");
console.log("===============");
console.log("1. Restart your Node.js server");
console.log(
  "2. Test the shipping URL: https://yarukai.com/shipping/test-file.pdf"
);
console.log(
  '3. Check server logs for "Emergency shipping route configured" message'
);
console.log("\\n⚠️  IMPORTANT:");
console.log(
  "This is an emergency fix. Consider moving this to app.js for cleaner architecture."
);
