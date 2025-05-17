// src/scripts/prestart.js
const fs = require('fs');
const path = require('path');

// Ensure necessary directories exist
const dirs = [
  path.join(__dirname, '../../logs'),
  path.join(__dirname, '../../public'),
  path.join(__dirname, '../../public/exports'),
  path.join(__dirname, '../../public/shipping'),
  path.join(__dirname, '../uploads')
];

dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    console.log(`Creating directory: ${dir}`);
    fs.mkdirSync(dir, { recursive: true });
  }
});

console.log('Pre-start checks completed.');