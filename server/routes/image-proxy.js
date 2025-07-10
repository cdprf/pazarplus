const express = require('express');
const https = require('https');
const http = require('http');
const { URL } = require('url');
const router = express.Router();
const logger = require('../utils/logger');

// Image proxy endpoint to handle SSL certificate issues
router.get('/proxy', async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    let urlObj;
    try {
      urlObj = new URL(url);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    // Validate that it's an image URL
    const allowedDomains = [
      'n11scdn3.akamaized.net',
      'salmanbilgisayar.sentos.com.tr',
      'cdn.dsmcdn.com',
      'productimages.hepsiburada.net'
    ];

    const isAllowed = allowedDomains.some(
      (domain) =>
        urlObj.hostname === domain || urlObj.hostname.endsWith('.' + domain)
    );

    if (!isAllowed) {
      return res.status(403).json({ error: 'Domain not allowed' });
    }

    const isHttps = urlObj.protocol === 'https:';
    const requestModule = isHttps ? https : http;

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ImageProxy/1.0)',
        Accept: 'image/*,*/*;q=0.8'
      },
      timeout: 15000 // Increased timeout to 15 seconds
    };

    // For HTTPS, disable certificate verification
    if (isHttps) {
      options.rejectUnauthorized = false;
    }

    const request = requestModule.request(options, (response) => {
      // Check if response is successful
      if (response.statusCode < 200 || response.statusCode >= 300) {
        logger.warn(`Image proxy: HTTP ${response.statusCode} for ${url}`);
        return res.status(response.statusCode).json({
          error: `Image server returned ${response.statusCode}`,
          originalUrl: url
        });
      }

      // Set appropriate headers
      const contentType = response.headers['content-type'];
      if (contentType && contentType.startsWith('image/')) {
        res.set('Content-Type', contentType);
      } else {
        res.set('Content-Type', 'image/jpeg'); // Default fallback
      }

      // Set cache headers
      res.set({
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
        'Access-Control-Allow-Origin': '*'
      });

      // Pipe the image data
      response.pipe(res);
    });

    request.on('error', (error) => {
      logger.warn('Image proxy request error:', error.message);
      if (!res.headersSent) {
        res.status(500).json({
          error: 'Failed to fetch image',
          details: error.message,
          originalUrl: url
        });
      }
    });

    request.on('timeout', () => {
      logger.warn('Image proxy timeout for:', url);
      request.destroy();
      if (!res.headersSent) {
        res.status(408).json({
          error: 'Request timeout',
          originalUrl: url
        });
      }
    });

    request.end();
  } catch (error) {
    logger.error('Image proxy error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Internal server error',
        details: error.message
      });
    }
  }
});

module.exports = router;
