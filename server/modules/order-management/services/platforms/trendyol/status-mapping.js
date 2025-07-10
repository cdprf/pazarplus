// Trendyol status mapping utility
// Maps Trendyol order statuses to internal system statuses

const ORDER_STATUS_MAP = {
  Created: 'new',
  Picking: 'processing',
  Invoiced: 'processing',
  Shipped: 'shipped',
  AtCollectionPoint: 'shipped', // Package is available for pickup at collection point
  Delivered: 'delivered',
  Cancelled: 'cancelled',
  Returned: 'returned',
  UndeliveredAndReturned: 'returned',
  UnDelivered: 'failed'
  // Add more mappings as needed
};

function getStatusMapping(entityType, trendyolStatus) {
  if (entityType === 'order') {
    return ORDER_STATUS_MAP[trendyolStatus] || 'new';
  }
  // Add more entityType mappings if needed
  return trendyolStatus;
}

module.exports = { getStatusMapping };
