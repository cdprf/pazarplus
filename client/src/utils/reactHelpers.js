/**
 * React Helper Utilities
 * Provides utility functions for React components to prevent common issues
 */

/**
 * Creates a safe key for React list items that prevents NaN or undefined keys
 * @param {*} primaryKey - The primary key to use (item.id, item.sku, etc.)
 * @param {*} secondaryKey - The secondary key to use as fallback
 * @param {string} fallbackPrefix - The prefix for the fallback key
 * @param {number} index - The index to use for the fallback key
 * @returns {string} A safe key string
 */
export const createSafeKey = (
  primaryKey,
  secondaryKey,
  fallbackPrefix,
  index = 0
) => {
  // Check if primary key is valid (not null, undefined, NaN, or empty string)
  if (primaryKey != null && primaryKey !== "" && !isNaN(primaryKey)) {
    return String(primaryKey);
  }

  // Check if secondary key is valid
  if (secondaryKey != null && secondaryKey !== "" && !isNaN(secondaryKey)) {
    return String(secondaryKey);
  }

  // Return fallback key with prefix and index
  return `${fallbackPrefix}-${index}`;
};

/**
 * Creates a safe key for React list items with multiple fallback options
 * @param {Object} item - The item object
 * @param {Array<string>} keyFields - Array of field names to try as keys
 * @param {string} fallbackPrefix - The prefix for the fallback key
 * @param {number} index - The index to use for the fallback key
 * @returns {string} A safe key string
 */
export const createSafeKeyFromFields = (
  item,
  keyFields = ["id", "sku"],
  fallbackPrefix = "item",
  index = 0
) => {
  for (const field of keyFields) {
    const value = item[field];
    if (value != null && value !== "" && !isNaN(value)) {
      return String(value);
    }
  }

  return `${fallbackPrefix}-${index}`;
};

/**
 * Sanitizes a value to prevent NaN or undefined in React keys
 * @param {*} value - The value to sanitize
 * @param {string} fallback - The fallback value to use if sanitization fails
 * @returns {string} A sanitized string value
 */
export const sanitizeKey = (value, fallback = "unknown") => {
  if (value == null || value === "" || isNaN(value)) {
    return fallback;
  }
  return String(value);
};

/**
 * Checks if a value is safe to use as a React key
 * @param {*} value - The value to check
 * @returns {boolean} True if the value is safe to use as a key
 */
export const isSafeKey = (value) => {
  return value != null && value !== "" && !isNaN(value);
};
