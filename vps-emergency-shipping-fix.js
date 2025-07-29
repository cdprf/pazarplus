#!/usr/bin/env node
/**
 * VPS Emergency Shipping Route Fix - Targeted for your specific server.js
 * This script adds the shipping route right after the app import line
 */

const fs = require('fs');
const path = require('path');

console.log('🚨 VPS EMERGENCY SHIPPING ROUTE FIX');
console.log('====================================');

const currentDir = process.cwd();
const serverJsPath = path.join(currentDir, 'server', 'server.js');

console.log(`Target file: ${serverJsPath}`);

if (!fs.existsSync(serverJsPath)) {
  console.log('❌ server.js not found');
  process.exit(1);
}

// Read current server.js content
let serverContent = fs.readFileSync(serverJsPath, 'utf8');

// Check if shipping route is already added
if (serverContent.includes('app.use("/shipping"') || serverContent.includes("app.use('/shipping'")) {
  console.log('✅ Shipping route already exists in server.js');
  process.exit(0);
}

// Look for the specific app import line in your server.js
const targetLine = 'const { app, initializeWebSocketServer } = require(\'./app\');';
const insertionPoint = serverContent.indexOf(targetLine);

if (insertionPoint === -1) {
  console.log('❌ Could not find the app import line');
  console.log('Expected:', targetLine);
  console.log('\\nFirst 500 characters of file:');
  console.log(serverContent.substring(0, 500));
  process.exit(1);
}

// Find the end of that line (after the semicolon)
const lineEnd = serverContent.indexOf(';', insertionPoint) + 1;

// Code to insert right after the app import
const shippingRouteCode = `

// === EMERGENCY SHIPPING ROUTE FIX ===
// Added to fix PDF 404 errors on VPS
const express = require('express');
const path = require('path');
const fs = require('fs');

// Ensure shipping directory exists
const shippingPath = path.join(__dirname, 'public', 'shipping');
if (!fs.existsSync(shippingPath)) {
  fs.mkdirSync(shippingPath, { recursive: true });
  console.log('📁 Created shipping directory:', shippingPath);
}

// Add shipping route with PDF headers
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
console.log('🚀 EMERGENCY: Shipping route configured at:', shippingPath);
// === END EMERGENCY FIX ===
`;

// Insert the shipping route code
const newServerContent = 
  serverContent.slice(0, lineEnd) + 
  shippingRouteCode + 
  serverContent.slice(lineEnd);

// Create backup
const timestamp = Date.now();
const backupPath = serverJsPath + '.backup.' + timestamp;
fs.writeFileSync(backupPath, serverContent);
console.log(`✅ Created backup: ${backupPath}`);

// Write modified server.js
fs.writeFileSync(serverJsPath, newServerContent);
console.log('✅ Emergency shipping route added successfully!');

// Create test PDF for verification
const testPdfContent = '%PDF-1.4\\n1 0 obj\\n<<\\n/Type /Catalog\\n/Pages 2 0 R\\n>>\\nendobj\\n2 0 obj\\n<<\\n/Type /Pages\\n/Kids [3 0 R]\\n/Count 1\\n>>\\nendobj\\n3 0 obj\\n<<\\n/Type /Page\\n/Parent 2 0 R\\n/MediaBox [0 0 612 792]\\n>>\\nendobj\\nxref\\n0 4\\n0000000000 65535 f \\n0000000009 00000 n \\n0000000058 00000 n \\n0000000115 00000 n \\ntrailer\\n<<\\n/Size 4\\n/Root 1 0 R\\n>>\\nstartxref\\n174\\n%%EOF';
const testPdfPath = path.join(currentDir, 'server', 'public', 'shipping', 'emergency-test.pdf');

try {
  fs.writeFileSync(testPdfPath, testPdfContent);
  console.log(`✅ Created test PDF: ${testPdfPath}`);
} catch (err) {
  console.log(`⚠️  Could not create test PDF: ${err.message}`);
}

console.log('\\n🎯 IMMEDIATE NEXT STEPS:');
console.log('=========================');
console.log('1. 🔄 Restart your Node.js server on VPS');
console.log('   - If using PM2: pm2 restart all');
console.log('   - If using systemctl: sudo systemctl restart pazar-plus');
console.log('   - If running directly: kill current process and restart');
console.log('');
console.log('2. 🧪 Test the emergency route:');
console.log('   https://yarukai.com/shipping/emergency-test.pdf');
console.log('');
console.log('3. 🎯 Test your original PDF:');
console.log('   https://yarukai.com/shipping/shipping_slip_92de620d-a52c-4f3a-9724-d4820a1dd463_1753787639585.pdf');
console.log('');
console.log('4. 📋 Check server logs for:');
console.log('   "🚀 EMERGENCY: Shipping route configured at:"');
console.log('');
console.log('🎉 The fix should work immediately after restart!');
