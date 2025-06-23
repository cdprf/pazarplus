import { CheckCircle, AlertTriangle, AlertCircle, Globe } from "lucide-react";
import { PlatformIcons } from "./constants";

// Utility Functions
export const getStockStatus = (product) => {
  if (!product || typeof product.stockQuantity !== "number") {
    return {
      value: "out_of_stock",
      label: "Stok Yok",
      variant: "danger",
      icon: <AlertCircle className="h-4 w-4 mr-1 text-red-500" />,
    };
  }

  if (product.stockQuantity <= 0) {
    return {
      value: "out_of_stock",
      label: "Stok Yok",
      variant: "danger",
      icon: <AlertTriangle className="h-4 w-4 mr-1 text-red-500" />,
    };
  }

  if (product.stockQuantity <= (product.minStockLevel || 0)) {
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

export const getPlatformBadges = (product) => {
  const activePlatforms = new Map();

  // Check platformData (from backend associations)
  if (product.platformData && Array.isArray(product.platformData)) {
    product.platformData.forEach((platformData) => {
      if (platformData.status === "active") {
        activePlatforms.set(platformData.platformType, {
          value: platformData.platformType,
          label:
            platformData.platformType.charAt(0).toUpperCase() +
            platformData.platformType.slice(1),
          variant: "default",
          sku: platformData.platformSku,
          price: platformData.platformPrice,
          stockQuantity: platformData.platformQuantity,
          icon: PlatformIcons[platformData.platformType] || (
            <Globe className="h-4 w-4" />
          ),
        });
      }
    });
  }

  // Check legacy platforms field
  if (product.platforms && typeof product.platforms === "object") {
    Object.entries(product.platforms).forEach(([platformKey, platformData]) => {
      if (platformData?.enabled && !activePlatforms.has(platformKey)) {
        activePlatforms.set(platformKey, {
          value: platformKey,
          label: platformKey.charAt(0).toUpperCase() + platformKey.slice(1),
          variant: "default",
          sku: platformData.platformSku,
          price: platformData.price,
          icon: PlatformIcons[platformKey] || <Globe className="h-4 w-4" />,
        });
      }
    });
  }

  // Check sources field
  if (product.sources && Array.isArray(product.sources)) {
    product.sources.forEach((source) => {
      if (!activePlatforms.has(source.platform)) {
        activePlatforms.set(source.platform, {
          value: source.platform,
          label: source.connectionName || source.platform,
          variant: "info",
          sku: source.sku,
          stockQuantity: source.stockQuantity,
          icon: PlatformIcons[source.platform] || <Globe className="h-4 w-4" />,
        });
      }
    });
  }

  return Array.from(activePlatforms.values());
};

export const formatPrice = (price, currency = "₺") => {
  if (typeof price !== "number" || isNaN(price)) return `${currency}0,00`;
  return `${currency}${price.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("tr-TR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const generateSKU = (prefix = "PRD") => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `${prefix}-${timestamp}-${random}`.toUpperCase();
};

export const validateProduct = (product) => {
  const errors = {};

  if (!product.name?.trim()) {
    errors.name = "Ürün adı gereklidir";
  }

  if (!product.sku?.trim()) {
    errors.sku = "SKU gereklidir";
  }

  if (!product.category) {
    errors.category = "Kategori gereklidir";
  }

  if (!product.price || Number(product.price) <= 0) {
    errors.price = "Geçerli bir fiyat gereklidir";
  }

  if (product.stockQuantity === "" || Number(product.stockQuantity) < 0) {
    errors.stockQuantity = "Geçerli bir stok miktarı gereklidir";
  }

  if (product.costPrice && Number(product.costPrice) < 0) {
    errors.costPrice = "Maliyet fiyatı negatif olamaz";
  }

  if (product.minStockLevel && Number(product.minStockLevel) < 0) {
    errors.minStockLevel = "Minimum stok seviyesi negatif olamaz";
  }

  return errors;
};

export const filterProducts = (products, filters) => {
  return products.filter((product) => {
    // Search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      const searchFields = [
        product.name,
        product.sku,
        product.description,
        product.category,
        ...(product.tags || []),
      ].filter(Boolean);

      const matchesSearch = searchFields.some((field) =>
        field.toLowerCase().includes(searchTerm)
      );

      if (!matchesSearch) return false;
    }

    // Category filter
    if (filters.category && product.category !== filters.category) {
      return false;
    }

    // Status filter
    if (filters.status && product.status !== filters.status) {
      return false;
    }

    // Stock status filter
    if (filters.stockStatus) {
      const stockStatus = getStockStatus(product);
      if (stockStatus.value !== filters.stockStatus) {
        return false;
      }
    }

    // Price range filter
    if (filters.minPrice && Number(product.price) < Number(filters.minPrice)) {
      return false;
    }
    if (filters.maxPrice && Number(product.price) > Number(filters.maxPrice)) {
      return false;
    }

    // Stock range filter
    if (
      filters.minStock &&
      Number(product.stockQuantity) < Number(filters.minStock)
    ) {
      return false;
    }
    if (
      filters.maxStock &&
      Number(product.stockQuantity) > Number(filters.maxStock)
    ) {
      return false;
    }

    return true;
  });
};

export const sortProducts = (products, sortValue) => {
  const [field, direction] = sortValue.split("-");

  return [...products].sort((a, b) => {
    let valueA = a[field];
    let valueB = b[field];

    // Handle different data types
    if (field === "name" || field === "sku" || field === "category") {
      valueA = (valueA || "").toLowerCase();
      valueB = (valueB || "").toLowerCase();
    } else if (field === "price" || field === "stockQuantity") {
      valueA = Number(valueA) || 0;
      valueB = Number(valueB) || 0;
    } else if (field === "updatedAt" || field === "createdAt") {
      valueA = new Date(valueA || 0);
      valueB = new Date(valueB || 0);
    }

    if (valueA < valueB) {
      return direction === "asc" ? -1 : 1;
    }
    if (valueA > valueB) {
      return direction === "asc" ? 1 : -1;
    }
    return 0;
  });
};

export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

export const downloadCSV = (data, filename = "products.csv") => {
  if (!data || data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          // Escape commas and quotes in values
          if (
            typeof value === "string" &&
            (value.includes(",") || value.includes('"'))
          ) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        })
        .join(",")
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
