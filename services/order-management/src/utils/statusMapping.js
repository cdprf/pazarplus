/**
 * Order Status Mapping Registry
 * Provides centralized order status mapping for various platforms
 */

// Internal status constants
const INTERNAL_STATUSES = {
  NEW: 'new',
  PROCESSING: 'processing',
  AWAITING_PAYMENT: 'awaiting_payment',
  AWAITING_SHIPMENT: 'awaiting_shipment',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
  RETURNED: 'returned',
  FAILED: 'failed',
  ON_HOLD: 'on_hold',
  UNKNOWN: 'unknown'
};

// Platform-specific status mappings
const PLATFORM_STATUS_MAPS = {
  // Trendyol status mappings
  trendyol: {
    // Platform to internal
    toInternal: {
      'Created': INTERNAL_STATUSES.NEW,
      'Picking': INTERNAL_STATUSES.PROCESSING,
      'Invoiced': INTERNAL_STATUSES.PROCESSING,
      'Shipped': INTERNAL_STATUSES.SHIPPED,
      'Delivered': INTERNAL_STATUSES.DELIVERED,
      'Cancelled': INTERNAL_STATUSES.CANCELLED,
      'UnDelivered': INTERNAL_STATUSES.FAILED,
      'Returned': INTERNAL_STATUSES.RETURNED
    },
    // Internal to platform
    fromInternal: {
      [INTERNAL_STATUSES.NEW]: 'Created',
      [INTERNAL_STATUSES.PROCESSING]: 'Picking',
      [INTERNAL_STATUSES.AWAITING_SHIPMENT]: 'Picking',
      [INTERNAL_STATUSES.SHIPPED]: 'Shipped',
      [INTERNAL_STATUSES.DELIVERED]: 'Delivered',
      [INTERNAL_STATUSES.CANCELLED]: 'Cancelled',
      [INTERNAL_STATUSES.RETURNED]: 'Returned',
      [INTERNAL_STATUSES.FAILED]: 'UnDelivered'
    }
  },
  
  // Hepsiburada status mappings
  hepsiburada: {
    // Platform to internal
    toInternal: {
      'Created': INTERNAL_STATUSES.NEW,
      'Packaging': INTERNAL_STATUSES.PROCESSING,
      'ReadyToShip': INTERNAL_STATUSES.AWAITING_SHIPMENT,
      'Shipped': INTERNAL_STATUSES.SHIPPED,
      'Delivered': INTERNAL_STATUSES.DELIVERED,
      'Cancelled': INTERNAL_STATUSES.CANCELLED,
      'UnDelivered': INTERNAL_STATUSES.FAILED,
      'Returned': INTERNAL_STATUSES.RETURNED
    },
    // Internal to platform
    fromInternal: {
      [INTERNAL_STATUSES.NEW]: 'Created',
      [INTERNAL_STATUSES.PROCESSING]: 'Packaging',
      [INTERNAL_STATUSES.AWAITING_SHIPMENT]: 'ReadyToShip',
      [INTERNAL_STATUSES.SHIPPED]: 'Shipped',
      [INTERNAL_STATUSES.DELIVERED]: 'Delivered',
      [INTERNAL_STATUSES.CANCELLED]: 'Cancelled',
      [INTERNAL_STATUSES.RETURNED]: 'Returned',
      [INTERNAL_STATUSES.FAILED]: 'UnDelivered'
    }
  },
  
  // Default mappings used for platforms without specific mappings
  default: {
    toInternal: {},
    fromInternal: {}
  }
};

/**
 * Map platform-specific status to internal status
 * @param {String} platformType - Type of platform (e.g., 'trendyol', 'hepsiburada')
 * @param {String} platformStatus - Platform-specific status
 * @returns {String} Internal status
 */
const toInternalStatus = (platformType, platformStatus) => {
  const platformMap = PLATFORM_STATUS_MAPS[platformType] || PLATFORM_STATUS_MAPS.default;
  return platformMap.toInternal[platformStatus] || INTERNAL_STATUSES.UNKNOWN;
};

/**
 * Map internal status to platform-specific status
 * @param {String} platformType - Type of platform (e.g., 'trendyol', 'hepsiburada')
 * @param {String} internalStatus - Internal status
 * @returns {String|null} Platform-specific status, or null if mapping doesn't exist
 */
const toPlatformStatus = (platformType, internalStatus) => {
  const platformMap = PLATFORM_STATUS_MAPS[platformType] || PLATFORM_STATUS_MAPS.default;
  return platformMap.fromInternal[internalStatus] || null;
};

/**
 * Register a new platform status mapping
 * @param {String} platformType - Type of platform to register
 * @param {Object} toInternalMap - Mapping from platform status to internal status
 * @param {Object} fromInternalMap - Mapping from internal status to platform status
 */
const registerPlatformStatusMap = (platformType, toInternalMap, fromInternalMap) => {
  PLATFORM_STATUS_MAPS[platformType] = {
    toInternal: toInternalMap,
    fromInternal: fromInternalMap
  };
};

module.exports = {
  INTERNAL_STATUSES,
  toInternalStatus,
  toPlatformStatus,
  registerPlatformStatusMap
};