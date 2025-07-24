const logger = require("../utils/logger");
/**
 * Enum validation and mapping utilities
 * Prevents enum-related database errors by validating and mapping values
 */

// Valid platform types for PlatformData.platformType enum
const VALID_PLATFORM_TYPES = [
  'trendyol',
  'hepsiburada',
  'n11',
  'pazarama',
  'amazon',
  'csv',
  'shopify',
  'woocommerce',
  'magento',
  'etsy',
  'ebay',
  'lazada',
  'jumia',
  'shopee',
  'aliexpress',
  'cimri',
  'akakce',
  'ciceksepeti',
  'idefix'
];

// Valid order statuses for Order.orderStatus enum
const VALID_ORDER_STATUSES = [
  'new',
  'pending',
  'processing',
  'shipped',
  'in_transit',
  'delivered',
  'cancelled',
  'returned',
  'failed',
  'unknown',
  'claim_created',
  'claim_approved',
  'claim_rejected',
  'refunded',
  'consolidated',
  'in_batch'
];

// External to internal order status mapping
const ORDER_STATUS_MAPPING = {
  // Trendyol statuses
  Created: 'new',
  Picking: 'processing',
  Shipped: 'shipped',
  Delivered: 'delivered',
  Cancelled: 'cancelled',
  Returned: 'returned',
  UnPacked: 'processing',
  Invoiced: 'pending',

  // Hepsiburada statuses
  Open: 'pending',
  Açık: 'pending',
  PaymentCompleted: 'processing',
  'Ödeme Tamamlandı': 'processing',
  Packaged: 'shipped',
  Paketlendi: 'shipped',
  ReadyToShip: 'processing',
  'Kargoya Hazır': 'processing',
  InTransit: 'in_transit',
  Kargoda: 'in_transit',
  Delivered: 'delivered',
  'Teslim Edildi': 'delivered',
  CancelledByMerchant: 'cancelled',
  'Satıcı Tarafından İptal': 'cancelled',
  CancelledByCustomer: 'cancelled',
  'Müşteri Tarafından İptal': 'cancelled',
  CancelledBySap: 'cancelled',
  'Sistem Tarafından İptal': 'cancelled',
  'İptal Edildi': 'cancelled',
  ClaimCreated: 'claim_created',
  'Talep Oluşturuldu': 'claim_created',
  'İade Edildi': 'returned',
  Onaylandı: 'pending',
  Hazırlanıyor: 'processing',
  'Kargoya Verildi': 'shipped',

  // N11 statuses
  Yeni: 'new',
  New: 'new',
  Approved: 'processing',
  Onaylandı: 'pending',
  Picking: 'processing',
  Hazırlanıyor: 'processing',
  Shipped: 'shipped',
  Kargoda: 'in_transit',
  Delivered: 'delivered',
  'Teslim Edildi': 'delivered',
  Cancelled: 'cancelled',
  İptal: 'cancelled',
  'İptal Edildi': 'cancelled',
  Returned: 'returned',
  İade: 'returned',
  'İade Edildi': 'returned',
  Created: 'new',
  Oluşturuldu: 'new',
  UnPacked: 'processing',
  Paketlenmedi: 'processing',
  UnSupplied: 'cancelled',
  'Tedarik Edilmedi': 'cancelled',
  Failed: 'failed',
  Başarısız: 'failed',
  Expired: 'cancelled',
  'Süresi Doldu': 'cancelled',
  Confirmed: 'processing',
  InProgress: 'processing',
  'Devam Ediyor': 'processing',
  ReadyToShip: 'processing',
  'Gönderilmeye Hazır': 'processing',
  InTransit: 'in_transit',
  Yolda: 'in_transit',
  PartiallyShipped: 'shipped',
  'Kısmi Gönderildi': 'shipped',
  Completed: 'delivered',
  Tamamlandı: 'delivered',
  Rejected: 'cancelled',
  Reddedildi: 'cancelled',
  Refunded: 'refunded',

  // Generic statuses
  NEW: 'new',
  PENDING: 'pending',
  CONFIRMED: 'pending',
  PROCESSING: 'processing',
  PREPARING: 'processing',
  PACKED: 'processing',
  SHIPPED: 'shipped',
  IN_TRANSIT: 'in_transit',
  DELIVERED: 'delivered',
  COMPLETED: 'delivered',
  CANCELLED: 'cancelled',
  CANCELED: 'cancelled',
  RETURNED: 'returned',
  REFUNDED: 'refunded',
  FAILED: 'failed',
  UNKNOWN: 'unknown'
};

/**
 * Validates if a platform type is valid for database operations
 * @param {string} platformType - The platform type to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function isValidPlatformType(platformType) {
  if (!platformType || typeof platformType !== 'string') {
    return false;
  }
  return VALID_PLATFORM_TYPES.includes(platformType.toLowerCase());
}

/**
 * Validates if an order status is valid for database operations
 * @param {string} orderStatus - The order status to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function isValidOrderStatus(orderStatus) {
  if (!orderStatus || typeof orderStatus !== 'string') {
    return false;
  }
  return VALID_ORDER_STATUSES.includes(orderStatus.toLowerCase());
}

/**
 * Maps external order status to valid internal enum value
 * @param {string} externalStatus - The external order status
 * @param {string} platformType - The platform type for context
 * @returns {string} - Valid internal order status
 */
function mapOrderStatus(externalStatus, platformType = null) {
  if (!externalStatus || typeof externalStatus !== 'string') {
    return 'unknown';
  }

  // Direct mapping if already valid
  if (isValidOrderStatus(externalStatus)) {
    return externalStatus.toLowerCase();
  }

  // Look for mapping
  const mappedStatus = ORDER_STATUS_MAPPING[externalStatus];
  if (mappedStatus && isValidOrderStatus(mappedStatus)) {
    return mappedStatus;
  }

  // Case-insensitive mapping
  const upperExternalStatus = externalStatus.toUpperCase();
  const mappedUpperStatus = ORDER_STATUS_MAPPING[upperExternalStatus];
  if (mappedUpperStatus && isValidOrderStatus(mappedUpperStatus)) {
    return mappedUpperStatus;
  }

  logger.warn(
    `Unknown order status "${externalStatus}" from platform "${platformType}", defaulting to "unknown"`
  );
  return 'unknown';
}

/**
 * Sanitizes platform type for database operations
 * Prevents "all" and other invalid values from reaching the database
 * @param {string} platformType - The platform type to sanitize
 * @returns {string|null} - Valid platform type or null if invalid/filter value
 */
function sanitizePlatformType(platformType) {
  if (!platformType || typeof platformType !== 'string') {
    return null;
  }

  // Filter out special filter values that should not reach the database
  const filterValues = ['all', 'any', '*', ''];
  if (filterValues.includes(platformType.toLowerCase())) {
    return null;
  }

  // Return valid platform type
  if (isValidPlatformType(platformType)) {
    return platformType.toLowerCase();
  }

  logger.warn(
    `Invalid platform type "${platformType}", filtering out from database operation`
  );
  return null;
}

/**
 * Creates a safe query filter that excludes invalid enum values
 * @param {Object} queryFilter - The original query filter
 * @returns {Object} - Sanitized query filter
 */
function sanitizeQueryFilter(queryFilter) {
  if (!queryFilter || typeof queryFilter !== 'object') {
    return {};
  }

  const sanitized = { ...queryFilter };

  // Handle platformType
  if (sanitized.platformType) {
    const sanitizedPlatformType = sanitizePlatformType(sanitized.platformType);
    if (sanitizedPlatformType === null) {
      delete sanitized.platformType;
    } else {
      sanitized.platformType = sanitizedPlatformType;
    }
  }

  // Handle orderStatus
  if (sanitized.orderStatus) {
    if (!isValidOrderStatus(sanitized.orderStatus)) {
      logger.warn(
        `Invalid order status in query filter: "${sanitized.orderStatus}", removing from filter`
      );
      delete sanitized.orderStatus;
    }
  }

  return sanitized;
}

module.exports = {
  VALID_PLATFORM_TYPES,
  VALID_ORDER_STATUSES,
  ORDER_STATUS_MAPPING,
  isValidPlatformType,
  isValidOrderStatus,
  mapOrderStatus,
  sanitizePlatformType,
  sanitizeQueryFilter
};
