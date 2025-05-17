/**
 * Utility function for retrying failed API requests
 * 
 * @param {Function} requestFn - The async function to execute and potentially retry
 * @param {Number} maxRetries - Maximum number of retry attempts (default: 3)
 * @param {Number} delay - Base delay between retries in ms (default: 1000)
 * @param {Function} isRetryable - Function to determine if an error is retryable (default: 429 and 5xx errors)
 * @returns {Promise<any>} - Result of the successful request
 * @throws {Error} - If all retry attempts fail
 */
const retryRequest = async (requestFn, maxRetries = 3, delay = 1000, isRetryable = defaultIsRetryable) => {
  let retries = 0;
  let lastError = null;
  
  while (retries < maxRetries) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;
      
      // Check if error is retryable
      if (isRetryable(error)) {
        retries++;
        const logger = require('../logger');
        logger.warn(`Retrying API request (${retries}/${maxRetries}) after error: ${error.message}`);
        
        // Wait before retrying with exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, retries - 1)));
      } else {
        // Non-retryable error
        throw error;
      }
    }
  }
  
  // If we've exhausted retries
  throw lastError;
};

/**
 * Default function to determine if an error is retryable
 * @param {Error} error - The error to check
 * @returns {Boolean} - True if the error is retryable
 */
const defaultIsRetryable = (error) => {
  return error.response && (error.response.status === 429 || error.response.status >= 500);
};

module.exports = retryRequest;