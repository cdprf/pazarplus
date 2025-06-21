/**
 * Order Registry - Centralized order type and action registry
 * Implements Factory Pattern for order operations
 */

export const ORDER_TYPES = {
  VIEW: "view",
  EDIT: "edit",
  CREATE: "create",
};

export const ORDER_STATUSES = {
  NEW: "new",
  PENDING: "pending",
  PROCESSING: "processing",
  SHIPPED: "shipped",
  IN_TRANSIT: "in_transit",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
  RETURNED: "returned",
  FAILED: "failed",
  CLAIM_CREATED: "claim_created",
  CLAIM_APPROVED: "claim_approved",
  CLAIM_REJECTED: "claim_rejected",
  REFUNDED: "refunded",
  CONSOLIDATED: "consolidated",
  IN_BATCH: "in_batch",
};

export const PLATFORMS = {
  TRENDYOL: "trendyol",
  HEPSIBURADA: "hepsiburada",
  N11: "n11",
  PAZARAMA: "pazarama",
};

export const CURRENCIES = {
  TRY: "TRY",
  USD: "USD",
  EUR: "EUR",
};

// Status configurations
export const STATUS_CONFIG = {
  [ORDER_STATUSES.NEW]: {
    label: "Yeni",
    variant: "info",
    color: "blue",
    icon: "plus",
  },
  [ORDER_STATUSES.PENDING]: {
    label: "Bekleyen",
    variant: "warning",
    color: "yellow",
    icon: "clock",
  },
  [ORDER_STATUSES.PROCESSING]: {
    label: "Hazırlanıyor",
    variant: "info",
    color: "blue",
    icon: "package",
  },
  [ORDER_STATUSES.SHIPPED]: {
    label: "Kargoda",
    variant: "primary",
    color: "purple",
    icon: "truck",
  },
  [ORDER_STATUSES.IN_TRANSIT]: {
    label: "Yolda",
    variant: "primary",
    color: "indigo",
    icon: "truck",
  },
  [ORDER_STATUSES.DELIVERED]: {
    label: "Teslim Edildi",
    variant: "success",
    color: "green",
    icon: "check-circle",
  },
  [ORDER_STATUSES.CANCELLED]: {
    label: "İptal Edildi",
    variant: "destructive",
    color: "red",
    icon: "x-circle",
  },
  [ORDER_STATUSES.RETURNED]: {
    label: "İade Edildi",
    variant: "secondary",
    color: "gray",
    icon: "undo",
  },
  [ORDER_STATUSES.FAILED]: {
    label: "Başarısız",
    variant: "destructive",
    color: "red",
    icon: "alert-circle",
  },
  [ORDER_STATUSES.REFUNDED]: {
    label: "İade Edildi",
    variant: "secondary",
    color: "gray",
    icon: "dollar-sign",
  },
};

// Platform configurations
export const PLATFORM_CONFIG = {
  [PLATFORMS.TRENDYOL]: {
    label: "Trendyol",
    variant: "warning",
    color: "orange",
    icon: "shopping-bag",
  },
  [PLATFORMS.HEPSIBURADA]: {
    label: "Hepsiburada",
    variant: "info",
    color: "blue",
    icon: "shopping-cart",
  },
  [PLATFORMS.N11]: {
    label: "N11",
    variant: "secondary",
    color: "gray",
    icon: "store",
  },
  [PLATFORMS.PAZARAMA]: {
    label: "Pazarama",
    variant: "primary",
    color: "purple",
    icon: "shopping-bag",
  },
};

/**
 * Order Registry Class - Factory for order operations
 */
export class OrderRegistry {
  static getStatusConfig(status) {
    return STATUS_CONFIG[status] || STATUS_CONFIG[ORDER_STATUSES.PENDING];
  }

  static getPlatformConfig(platform) {
    return PLATFORM_CONFIG[platform] || PLATFORM_CONFIG[PLATFORMS.TRENDYOL];
  }

  static getStatusOptions() {
    return Object.entries(STATUS_CONFIG).map(([value, config]) => ({
      value,
      label: config.label,
      variant: config.variant,
    }));
  }

  static getPlatformOptions() {
    return Object.entries(PLATFORM_CONFIG).map(([value, config]) => ({
      value,
      label: config.label,
      variant: config.variant,
    }));
  }

  static getCurrencyOptions() {
    return Object.values(CURRENCIES).map((currency) => ({
      value: currency,
      label: currency,
    }));
  }

  static getAvailableActions(status, platform) {
    const actions = [];

    switch (status) {
      case ORDER_STATUSES.PENDING:
        actions.push("accept", "cancel", "edit");
        break;
      case ORDER_STATUSES.PROCESSING:
        actions.push("ship", "cancel", "edit");
        break;
      case ORDER_STATUSES.SHIPPED:
        actions.push("track", "deliver");
        break;
      case ORDER_STATUSES.DELIVERED:
        actions.push("invoice", "return_request");
        break;
      default:
        actions.push("view");
    }

    return actions;
  }

  static validateStatusTransition(fromStatus, toStatus) {
    const allowedTransitions = {
      [ORDER_STATUSES.NEW]: [ORDER_STATUSES.PENDING, ORDER_STATUSES.CANCELLED],
      [ORDER_STATUSES.PENDING]: [
        ORDER_STATUSES.PROCESSING,
        ORDER_STATUSES.CANCELLED,
      ],
      [ORDER_STATUSES.PROCESSING]: [
        ORDER_STATUSES.SHIPPED,
        ORDER_STATUSES.CANCELLED,
      ],
      [ORDER_STATUSES.SHIPPED]: [
        ORDER_STATUSES.IN_TRANSIT,
        ORDER_STATUSES.DELIVERED,
      ],
      [ORDER_STATUSES.IN_TRANSIT]: [
        ORDER_STATUSES.DELIVERED,
        ORDER_STATUSES.RETURNED,
      ],
      [ORDER_STATUSES.DELIVERED]: [ORDER_STATUSES.RETURNED],
      // Terminal states
      [ORDER_STATUSES.CANCELLED]: [],
      [ORDER_STATUSES.RETURNED]: [ORDER_STATUSES.REFUNDED],
      [ORDER_STATUSES.REFUNDED]: [],
    };

    return allowedTransitions[fromStatus]?.includes(toStatus) || false;
  }
}
