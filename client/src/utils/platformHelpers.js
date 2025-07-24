import logger from "../utils/logger";
/**
 * Platform-specific helper utilities
 */

// Platform icons with image support
export const getPlatformIcon = (platform) => {
  const icons = {
    trendyol: (
      <img
        src="https://cdn.brandfetch.io/idEdTxkWAp/w/400/h/400/theme/dark/icon.jpeg?c=1dxbfHSJFAPEGdCLU4o5B"
        alt="Trendyol"
        className="inline h-7 w-7 align-middle"
        style={{ display: "inline", verticalAlign: "middle" }}
      />
    ),
    hepsiburada: (
      <img
        src="https://cdn.brandfetch.io/id9XTiaix8/theme/dark/logo.svg?c=1dxbfHSJFAPEGdCLU4o5B"
        alt="Hepsiburada"
        className="inline h-9 w-9 align-middle"
        style={{ display: "inline", verticalAlign: "middle" }}
      />
    ),
    n11: (
      <img
        src="https://cdn.brandfetch.io/idIWnXEme7/theme/dark/logo.svg?c=1dxbfHSJFAPEGdCLU4o5B"
        alt="N11"
        className="inline h-7 w-7 align-middle"
        style={{ display: "inline", verticalAlign: "middle" }}
      />
    ),
    pazarama: (
      <img
        src="https://cdn.pazaryerilogo.com/pazarama.svg"
        alt="Pazarama"
        className="inline h-7 w-7 align-middle"
        style={{ display: "inline", verticalAlign: "middle" }}
      />
    ),
    gittigidiyor: (
      <img
        src="https://cdn.pazaryerilogo.com/gittigidiyor.svg"
        alt="Gittigidiyor"
        className="inline h-7 w-7 align-middle"
        style={{ display: "inline", verticalAlign: "middle" }}
      />
    ),
  };
  return icons[platform?.toLowerCase()] || "📦";
};

// Platform badge variants
export const getPlatformVariant = (platform) => {
  const variantMap = {
    trendyol: "primary",
    hepsiburada: "warning",
    n11: "info",
    amazon: "dark",
    pazarama: "success",
    gittigidiyor: "secondary",
    default: "secondary",
  };
  return variantMap[platform?.toLowerCase()] || variantMap.default;
};

// Status helpers
export const getStatusIcon = (status) => {
  const iconMap = {
    new: "🆕",
    pending: "⏳",
    confirmed: "✅",
    processing: "⚙️",
    shipped: "🚚",
    in_transit: "🚚",
    delivered: "📦",
    cancelled: "❌",
    returned: "↩️",
    claimCreated: "🆕",
    claimApproved: "✅",
    claimRejected: "❌",
    refunded: "💰",
    failed: "⚠️",
    unknown: "❓",
    claim_created: "🆕",
    claim_approved: "✅",
    claim_rejected: "❌",
  };
  return iconMap[status] || "❓";
};

export const getStatusVariant = (status) => {
  const variantMap = {
    new: "info",
    pending: "warning",
    confirmed: "info",
    processing: "primary",
    shipped: "info",
    in_transit: "info",
    delivered: "success",
    cancelled: "danger",
    returned: "warning",
    claimCreated: "info",
    claimApproved: "success",
    claimRejected: "danger",
    refunded: "secondary",
    failed: "danger",
    unknown: "secondary",
    claim_created: "info",
    claim_approved: "success",
    claim_rejected: "danger",
  };
  return variantMap[status] || "secondary";
};

export const getStatusText = (status) => {
  const textMap = {
    new: "Yeni",
    pending: "Beklemede",
    confirmed: "Onaylandı",
    processing: "Hazırlanıyor",
    shipped: "Kargoda",
    in_transit: "Yolda",
    delivered: "Teslim Edildi",
    cancelled: "İptal Edildi",
    returned: "İade Edildi",
    claimCreated: "Talep Oluşturuldu",
    claimApproved: "Talep Onaylandı",
    claimRejected: "Talep Reddedildi",
    refunded: "İade Tamamlandı",
    failed: "Başarısız",
    unknown: "Bilinmeyen",
    claim_created: "Talep Oluşturuldu",
    claim_approved: "Talep Onaylandı",
    claim_rejected: "Talep Reddedildi",
  };
  return textMap[status] || status;
};

// Currency formatter
export const formatCurrency = (amount, currency = "TRY") => {
  if (!amount || isNaN(amount)) return "₺0,00";

  try {
    const numAmount = parseFloat(amount);
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: currency === "TRY" ? "TRY" : "USD",
      minimumFractionDigits: 2,
    }).format(numAmount);
  } catch (error) {
    logger.warn("Currency formatting error:", error);
    return `${currency} ${amount}`;
  }
};

// Date formatter - can handle both Date objects and order objects
export const formatDate = (dateInput) => {
  if (!dateInput) return "Tarih yok";

  let dateValue;

  // If it's already a Date object, use it directly
  if (dateInput instanceof Date) {
    dateValue = dateInput;
  } else if (typeof dateInput === "string") {
    // If it's a date string, parse it
    dateValue = new Date(dateInput);
  } else if (typeof dateInput === "object") {
    // If it's an order object, try different date fields with fallbacks
    const rawDate =
      dateInput.displayDate ||
      dateInput.orderDate ||
      dateInput.createdAt ||
      dateInput.date;
    if (!rawDate) return "Tarih yok";
    dateValue = new Date(rawDate);
  } else {
    return "Geçersiz tarih";
  }

  try {
    if (isNaN(dateValue.getTime())) return "Geçersiz tarih";

    return dateValue.toLocaleDateString("tr-TR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (error) {
    logger.warn("Date formatting error:", error);
    return "Tarih hatası";
  }
};
