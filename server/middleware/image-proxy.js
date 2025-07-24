const express = require('express');
const logger = require("../utils/logger");
const https = require('https');
const http = require('http');
const { URL } = require('url');
const crypto = require('crypto');

const router = express.Router();

// Cache for processed images (in production, use Redis or similar)
const imageCache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Image proxy middleware to handle external images with SSL issues
 * Usage: /api/image-proxy?url=https://example.com/image.jpg
 */
router.get('/image-proxy', async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    // Validate URL
    let imageUrl;
    try {
      imageUrl = new URL(url);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid URL provided' });
    }

    // Create cache key
    const cacheKey = crypto.createHash('md5').update(url).digest('hex');

    // Check cache first
    if (imageCache.has(cacheKey)) {
      const cached = imageCache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        res.set({
          'Content-Type': cached.contentType,
          'Cache-Control': 'public, max-age=86400', // 24 hours
          'X-Cache': 'HIT'
        });
        return res.send(cached.data);
      } else {
        imageCache.delete(cacheKey);
      }
    }

    // Set up request options
    const isHttps = imageUrl.protocol === 'https:';
    const requestModule = isHttps ? https : http;

    const options = {
      hostname: imageUrl.hostname,
      port: imageUrl.port || (isHttps ? 443 : 80),
      path: imageUrl.pathname + imageUrl.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ImageProxy/1.0)',
        Accept: 'image/*,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate'
      },
      timeout: 10000
    };

    // For HTTPS, ignore certificate errors
    if (isHttps) {
      options.rejectUnauthorized = false;
      options.secureProtocol = 'TLSv1_2_method';
    }

    const request = requestModule.request(options, (response) => {
      const { statusCode, headers } = response;

      // Handle redirects
      if (statusCode >= 300 && statusCode < 400 && headers.location) {
        const redirectUrl = new URL(headers.location, url).href;
        return res.redirect(
          302,
          `/api/image-proxy?url=${encodeURIComponent(redirectUrl)}`
        );
      }

      // Check if response is successful
      if (statusCode !== 200) {
        return res.status(statusCode).json({
          error: `Failed to fetch image: HTTP ${statusCode}`
        });
      }

      // Validate content type
      const contentType = headers['content-type'] || '';
      if (!contentType.startsWith('image/')) {
        return res.status(400).json({
          error: 'URL does not point to an image'
        });
      }

      // Set response headers
      res.set({
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400', // 24 hours
        'X-Cache': 'MISS',
        'X-Original-URL': url
      });

      // Handle content encoding
      let responseStream = response;
      const encoding = headers['content-encoding'];

      if (encoding === 'gzip') {
        const zlib = require('zlib');
        responseStream = response.pipe(zlib.createGunzip());
      } else if (encoding === 'deflate') {
        const zlib = require('zlib');
        responseStream = response.pipe(zlib.createInflate());
      }

      // Collect data for caching
      const chunks = [];
      let responseEnded = false;

      responseStream.on('data', (chunk) => {
        if (!responseEnded) {
          chunks.push(chunk);
          try {
            res.write(chunk);
          } catch (writeError) {
            logger.error('Error writing chunk:', writeError);
            responseEnded = true;
          }
        }
      });

      responseStream.on('end', () => {
        if (!responseEnded) {
          responseEnded = true;
          try {
            res.end();
          } catch (endError) {
            logger.error('Error ending response:', endError);
          }
        }

        // Cache the image data
        const imageData = Buffer.concat(chunks);
        if (imageData.length < 5 * 1024 * 1024) {
          // Cache images smaller than 5MB
          imageCache.set(cacheKey, {
            data: imageData,
            contentType,
            timestamp: Date.now()
          });
        }
      });

      responseStream.on('error', (error) => {
        logger.error('Error reading image stream:', error);
        if (!res.headersSent && !responseEnded) {
          responseEnded = true;
          try {
            res.status(500).json({ error: 'Error processing image' });
          } catch (errorResponseError) {
            logger.error('Error sending error response:', errorResponseError);
          }
        }
      });
    });

    request.on('error', (error) => {
      logger.error('Error fetching image:', error);
      if (!res.headersSent) {
        try {
          res.status(500).json({
            error: 'Failed to fetch image',
            details: error.message
          });
        } catch (errorResponseError) {
          logger.error('Error sending error response:', errorResponseError);
        }
      }
    });

    request.on('timeout', () => {
      request.destroy();
      if (!res.headersSent) {
        try {
          res.status(408).json({ error: 'Image request timeout' });
        } catch (errorResponseError) {
          logger.error('Error sending timeout response:', errorResponseError);
        }
      }
    });

    request.end();
  } catch (error) {
    logger.error('Image proxy error:', error);
    if (!res.headersSent) {
      try {
        res.status(500).json({
          error: 'Internal server error',
          details: error.message
        });
      } catch (errorResponseError) {
        logger.error('Error sending error response:', errorResponseError);
      }
    }
  }
});

/**
 * Health check endpoint
 */
router.get('/image-proxy/health', (req, res) => {
  res.json({
    status: 'OK',
    cache: {
      size: imageCache.size,
      maxAge: CACHE_TTL
    }
  });
});

/**
 * Clear cache endpoint (for debugging)
 */
router.post('/image-proxy/clear-cache', (req, res) => {
  imageCache.clear();
  res.json({ message: 'Cache cleared successfully' });
});

module.exports = router;
