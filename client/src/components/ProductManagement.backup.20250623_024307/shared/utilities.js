import {
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Globe,
  FileText,
  ShoppingBag,
} from "lucide-react";

// Platform Icons
export const PlatformIcons = {
  trendyol: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="#ff6000"
      className="flex-shrink-0"
    >
      <circle cx="12" cy="12" r="10" />
    </svg>
  ),
  hepsiburada: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="#FF6000"
      className="flex-shrink-0"
    >
      <rect x="4" y="6" width="16" height="12" />
    </svg>
  ),
  n11: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="#CC0000"
      className="flex-shrink-0"
    >
      <polygon points="12,2 2,12 12,22 22,12" />
    </svg>
  ),
  amazon: <Globe className="h-4 w-4 flex-shrink-0 text-orange-500" />,
  csv: <FileText className="h-4 w-4 flex-shrink-0 text-gray-500" />,
  local: <ShoppingBag className="h-4 w-4 flex-shrink-0 text-gray-500" />,
};

// Stock status utility
export const getStockStatus = (product) => {
  if (product.stockQuantity <= 0) {
    return {
      value: "out_of_stock",
      label: "Stok Yok",
      variant: "danger",
      icon: <AlertCircle className="h-4 w-4 mr-1 text-red-500" />,
    };
  }
  if (product.stockQuantity <= product.minStockLevel) {
    return {
      value: "low_stock",
      label: "Az Stok",
      variant: "warning",
      icon: <AlertTriangle className="h-4 w-4 mr-1 text-amber-500" />,
    };
  }
  return {
    value: "in_stock",
    label: "Stokta",
    variant: "success",
    icon: <CheckCircle className="h-4 w-4 mr-1 text-green-500" />,
  };
};

// Platform badges utility
export const getPlatformBadges = (product) => {
  const activePlatforms = [];

  // Check sources first
  if (product.sources && Array.isArray(product.sources)) {
    const uniquePlatforms = new Set();

    product.sources.forEach((source) => {
      if (!uniquePlatforms.has(source.platform)) {
        uniquePlatforms.add(source.platform);
        activePlatforms.push({
          value: source.platform,
          label:
            source.platform.charAt(0).toUpperCase() + source.platform.slice(1),
          variant: "default",
          connectionName: source.connectionName,
          icon: PlatformIcons[source.platform] || <Globe className="h-4 w-4" />,
        });
      }
    });
  }

  // Check platform connections
  if (product.platforms) {
    Object.entries(product.platforms).forEach(([key, value]) => {
      if (
        value &&
        value.enabled &&
        !activePlatforms.some((p) => p.value === key)
      ) {
        activePlatforms.push({
          value: key,
          label: key.charAt(0).toUpperCase() + key.slice(1),
          variant: "default",
          icon: PlatformIcons[key] || <Globe className="h-4 w-4" />,
        });
      }
    });
  }

  return activePlatforms;
};

// Status variant utility
export const getStatusVariant = (status) => {
  switch (status) {
    case "active":
      return "success";
    case "inactive":
      return "secondary";
    default:
      return "warning";
  }
};
