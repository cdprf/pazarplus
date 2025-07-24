const axios = require('axios');
const axiosRetry = require('axios-retry');
const logger = require('../utils/logger');

class ApiService {
  constructor() {
    this.clients = new Map();
    this.defaultRetryConfig = {
      retries: 3,
      retryDelay: axiosRetry.exponentialDelay,
      retryCondition: (error) => {
        return (
          axiosRetry.isNetworkOrIdempotentRequestError(error) ||
          error.response?.status === 429 || // Too Many Requests
          error.response?.status === 502 || // Bad Gateway
          error.response?.status === 503 || // Service Unavailable
          error.response?.status === 504
        ); // Gateway Timeout
      }
    };
  }

  /**
   * Get or create an axios client for a platform
   * @param {string} platform - Platform name (hepsiburada, trendyol, n11)
   * @param {Object} config - Axios configuration
   * @returns {Object} Configured axios client
   */
  getClient(platform, config = {}) {
    const clientKey = `${platform}_${JSON.stringify(config)}`;

    if (!this.clients.has(clientKey)) {
      const client = axios.create({
        timeout: 30000, // 30 seconds timeout
        ...config
      });

      // Add retry logic
      axiosRetry(client, {
        ...this.defaultRetryConfig,
        onRetry: (retryCount, error, requestConfig) => {
          logger.warn(`API request retry attempt ${retryCount}`, {
            platform,
            url: requestConfig.url,
            error: error.message,
            status: error.response?.status
          });
        }
      });

      // Add request interceptor for logging
      client.interceptors.request.use(
        (config) => {
          logger.info('API request', {
            platform,
            method: config.method?.toUpperCase(),
            url: config.url,
            headers: this.sanitizeHeaders(config.headers)
          });
          return config;
        },
        (error) => {
          logger.error('API request error', { platform, error: error.message });
          return Promise.reject(error);
        }
      );

      // Add response interceptor for logging and error handling
      client.interceptors.response.use(
        (response) => {
          logger.info('API response', {
            platform,
            status: response.status,
            url: response.config.url,
            dataSize: JSON.stringify(response.data).length
          });
          return response;
        },
        (error) => {
          this.handleApiError(error, platform);
          return Promise.reject(error);
        }
      );

      this.clients.set(clientKey, client);
    }

    return this.clients.get(clientKey);
  }

  /**
   * Handle API errors with specific platform logic
   * @param {Error} error - Axios error object
   * @param {string} platform - Platform name
   */
  handleApiError(error, platform) {
    const { response, request, message } = error;

    if (response) {
      // Server responded with error status
      const { status, data } = response;

      switch (status) {
      case 401:
        logger.error(`Authentication failed for ${platform}`, {
          platform,
          status,
          url: response.config.url,
          suggestion: 'Check API credentials and tokens'
        });
        break;

      case 403:
        logger.error(`Authorization failed for ${platform}`, {
          platform,
          status,
          url: response.config.url,
          data: this.sanitizeErrorData(data),
          suggestion: 'Check API permissions and refresh tokens'
        });
        break;

      case 404:
        logger.warn(`Resource not found on ${platform}`, {
          platform,
          status,
          url: response.config.url
        });
        break;

      case 429:
        logger.warn(`Rate limit exceeded for ${platform}`, {
          platform,
          status,
          retryAfter: response.headers['retry-after'],
          suggestion: 'Implement rate limiting or increase delays'
        });
        break;

      case 500:
      case 502:
      case 503:
      case 504:
        logger.error(`Server error from ${platform}`, {
          platform,
          status,
          url: response.config.url,
          suggestion: 'Platform may be experiencing issues'
        });
        break;

      default:
        logger.error(`API error from ${platform}`, {
          platform,
          status,
          url: response.config.url,
          data: this.sanitizeErrorData(data)
        });
      }
    } else if (request) {
      // Request was made but no response received
      logger.error(`Network error for ${platform}`, {
        platform,
        error: message,
        suggestion: 'Check network connectivity'
      });
    } else {
      // Something else happened
      logger.error(`Request setup error for ${platform}`, {
        platform,
        error: message
      });
    }
  }

  /**
   * Sanitize headers for logging (remove sensitive data)
   * @param {Object} headers - Request headers
   * @returns {Object} Sanitized headers
   */
  sanitizeHeaders(headers) {
    const sensitiveHeaders = [
      'authorization',
      'x-api-key',
      'x-api-secret',
      'cookie'
    ];
    const sanitized = { ...headers };

    sensitiveHeaders.forEach((header) => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  /**
   * Sanitize error data for logging
   * @param {Object} data - Error response data
   * @returns {Object} Sanitized data
   */
  sanitizeErrorData(data) {
    if (typeof data === 'string') {
      return data.length > 500 ? data.substring(0, 500) + '...' : data;
    }
    return data;
  }

  /**
   * Make a request with enhanced error handling
   * @param {string} platform - Platform name
   * @param {Object} requestConfig - Axios request configuration
   * @returns {Promise} API response
   */
  async makeRequest(platform, requestConfig) {
    const client = this.getClient(platform, requestConfig.baseConfig);

    try {
      const response = await client(requestConfig);
      return response;
    } catch (error) {
      // Additional error context
      error.platform = platform;
      error.timestamp = new Date().toISOString();
      throw error;
    }
  }

  /**
   * Clear cached clients (useful for token refresh)
   * @param {string} platform - Platform to clear (optional, clears all if not specified)
   */
  clearClientCache(platform = null) {
    if (platform) {
      // Clear all clients for a specific platform
      for (const [key] of this.clients) {
        if (key.startsWith(platform)) {
          this.clients.delete(key);
        }
      }
    } else {
      // Clear all clients
      this.clients.clear();
    }

    logger.info('API client cache cleared', { platform: platform || 'all' });
  }
}

module.exports = new ApiService();
