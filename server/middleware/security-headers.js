const helmet = require('helmet');

const securityHeaders = [
  // Basic security with helmet
  helmet(),
  
  // Custom security headers
  (req, res, next) => {
    // Strict-Transport-Security
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    
    // Content-Security-Policy
    res.setHeader('Content-Security-Policy', 
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https:; " +
      "font-src 'self' data:; " +
      "frame-ancestors 'none';"
    );
    
    // Permissions-Policy
    res.setHeader('Permissions-Policy', 
      'camera=(), ' +
      'microphone=(), ' +
      'geolocation=()'
    );
    
    // Cache-Control
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    next();
  }
];

module.exports = securityHeaders;