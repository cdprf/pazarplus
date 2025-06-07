import React, { useState, useCallback, useMemo } from "react";
import {
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  FileText,
  ShoppingBag,
  Globe,
} from "lucide-react";
import { API_BASE_URL } from "./constants";

// Mock UI Components
const Badge = ({ children, variant = "default", className = "" }) => {
  const variants = {
    default: "bg-gray-100 text-gray-800",
    primary: "bg-blue-100 text-blue-800",
    secondary: "bg-gray-100 text-gray-600",
    success: "bg-green-100 text-green-800",
    warning: "bg-amber-100 text-amber-800",
    danger: "bg-red-100 text-red-800",
    info: "bg-cyan-100 text-cyan-800",
    outline: "border border-gray-300 text-gray-700",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
};

const Tooltip = ({ children, content }) => (
  <div className="relative group">
    {children}
    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
      {content}
    </div>
  </div>
);

// Constants and Configuration
const PLATFORM_CONFIG = {
  trendyol: {
    label: "Trendyol",
    variant: "default",
    color: "#ff6000",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="#ff6000"
        className="flex-shrink-0"
      >
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
      </svg>
    ),
  },
  hepsiburada: {
    label: "Hepsiburada",
    variant: "info",
    color: "#FF6000",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="#FF6000"
        className="flex-shrink-0"
      >
        <path d="M20 6H4V18H20V6Z" />
      </svg>
    ),
  },
  n11: {
    label: "N11",
    variant: "secondary",
    color: "#CC0000",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="#CC0000"
        className="flex-shrink-0"
      >
        <path d="M12 2L2 12l10 10 10-10L12 2z" />
      </svg>
    ),
  },
  amazon: {
    label: "Amazon",
    variant: "warning",
    color: "#FF9900",
    icon: <Globe className="h-4 w-4 flex-shrink-0 text-orange-500" />,
  },
  csv: {
    label: "CSV",
    variant: "outline",
    color: "#6B7280",
    icon: <FileText className="h-4 w-4 flex-shrink-0 text-gray-500" />,
  },
  local: {
    label: "Yerel",
    variant: "secondary",
    color: "#6B7280",
    icon: <ShoppingBag className="h-4 w-4 flex-shrink-0 text-gray-500" />,
  },
};

const STOCK_STATUS_CONFIG = {
  in_stock: {
    value: "in_stock",
    label: "Stokta",
    variant: "success",
    icon: CheckCircle,
    color: "text-green-500",
  },
  low_stock: {
    value: "low_stock",
    label: "Az Stok",
    variant: "warning",
    icon: AlertTriangle,
    color: "text-amber-500",
  },
  out_of_stock: {
    value: "out_of_stock",
    label: "Stok Yok",
    variant: "danger",
    icon: AlertCircle,
    color: "text-red-500",
  },
};

const PRODUCT_CATEGORIES = [
  "Elektronik",
  "Giyim & Aksesuar",
  "Ev & Yaşam",
  "Kozmetik & Kişisel Bakım",
  "Spor & Outdoor",
  "Kitap & Müzik",
  "Anne & Bebek",
  "Otomotiv",
  "Süpermarket",
  "Petshop",
  "Oyuncak & Hobi",
  "Yapı Market",
];

const PRODUCT_STATUSES = [
  { value: "active", label: "Aktif", variant: "success" },
  { value: "inactive", label: "Pasif", variant: "secondary" },
  { value: "draft", label: "Taslak", variant: "warning" },
];

// Utility Functions
export const productUtils = {
  // Get stock status for a product
  getStockStatus: (product) => {
    if (!product || typeof product.stockQuantity !== "number") {
      return STOCK_STATUS_CONFIG.out_of_stock;
    }

    if (product.stockQuantity <= 0) {
      return STOCK_STATUS_CONFIG.out_of_stock;
    }

    if (product.stockQuantity <= (product.minStockLevel || 0)) {
      return STOCK_STATUS_CONFIG.low_stock;
    }

    return STOCK_STATUS_CONFIG.in_stock;
  },

  // Get platform badges for a product
  getPlatformBadges: (product) => {
    const activePlatforms = new Map();

    // Check source platforms first (from sync)
    if (product.sources && Array.isArray(product.sources)) {
      product.sources.forEach((source) => {
        if (source.platform && PLATFORM_CONFIG[source.platform]) {
          activePlatforms.set(source.platform, {
            ...PLATFORM_CONFIG[source.platform],
            connectionName: source.connectionName,
            sku: source.sku,
            stockQuantity: source.stockQuantity,
          });
        }
      });
    }

    // Check for regular platform connections
    if (product.platforms) {
      Object.entries(product.platforms).forEach(
        ([platformKey, platformData]) => {
          if (
            platformData?.enabled &&
            PLATFORM_CONFIG[platformKey] &&
            !activePlatforms.has(platformKey)
          ) {
            activePlatforms.set(platformKey, {
              ...PLATFORM_CONFIG[platformKey],
              sku: platformData.platformSku,
              price: platformData.price,
            });
          }
        }
      );
    }

    return Array.from(activePlatforms.values());
  },

  // Get status variant for styling
  getStatusVariant: (status) => {
    const statusConfig = PRODUCT_STATUSES.find((s) => s.value === status);
    return statusConfig?.variant || "secondary";
  },

  // Get status label
  getStatusLabel: (status) => {
    const statusConfig = PRODUCT_STATUSES.find((s) => s.value === status);
    return statusConfig?.label || status;
  },

  // Format price
  formatPrice: (price) => {
    if (typeof price !== "number") return "₺0.00";
    return `₺${price.toLocaleString("tr-TR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  },

  // Format stock quantity with icon
  formatStockDisplay: (product) => {
    const stockStatus = productUtils.getStockStatus(product);
    const IconComponent = stockStatus.icon;

    return {
      icon: <IconComponent className={`h-4 w-4 mr-1 ${stockStatus.color}`} />,
      badge: (
        <Badge variant={stockStatus.variant} className="text-xs">
          {product.stockQuantity || 0}
        </Badge>
      ),
      status: stockStatus,
    };
  },

  // Check if product matches platform filter
  matchesPlatformFilter: (product, platformFilter) => {
    if (platformFilter === "all") return true;

    // Check sources
    if (product.sources?.some((source) => source.platform === platformFilter)) {
      return true;
    }

    // Check platform connections
    if (product.platforms?.[platformFilter]?.enabled) {
      return true;
    }

    // Check for local products
    if (platformFilter === "local") {
      const hasExternalPlatforms =
        product.sources?.length > 0 ||
        Object.values(product.platforms || {}).some((p) => p?.enabled);
      return !hasExternalPlatforms;
    }

    return false;
  },

  // Advanced search function
  searchProducts: (products, searchTerm) => {
    if (!searchTerm?.trim()) return products;

    const term = searchTerm.toLowerCase().trim();

    return products.filter((product) => {
      // Search in basic fields
      const searchFields = [
        product.name,
        product.sku,
        product.description,
        product.category,
      ]
        .filter(Boolean)
        .map((field) => field.toLowerCase());

      // Search in tags
      const tags = product.tags || [];

      // Search in platform SKUs
      const platformSkus = [];
      if (product.sources) {
        platformSkus.push(...product.sources.map((s) => s.sku).filter(Boolean));
      }
      if (product.platforms) {
        Object.values(product.platforms).forEach((p) => {
          if (p?.platformSku) platformSkus.push(p.platformSku);
        });
      }

      // Combine all searchable content
      const allSearchableText = [
        ...searchFields,
        ...tags.map((tag) => tag.toLowerCase()),
        ...platformSkus.map((sku) => sku.toLowerCase()),
      ].join(" ");

      return allSearchableText.includes(term);
    });
  },

  // Sort products
  sortProducts: (products, sortField, sortOrder) => {
    const sortedProducts = [...products].sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // Handle special cases
      if (sortField === "price" || sortField === "stockQuantity") {
        aValue = Number(aValue) || 0;
        bValue = Number(bValue) || 0;
      } else if (sortField === "updatedAt") {
        aValue = new Date(aValue || 0);
        bValue = new Date(bValue || 0);
      } else {
        aValue = String(aValue || "").toLowerCase();
        bValue = String(bValue || "").toLowerCase();
      }

      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return sortedProducts;
  },

  // Filter products by multiple criteria
  filterProducts: (products, filters) => {
    return products.filter((product) => {
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
        const stockStatus = productUtils.getStockStatus(product);
        if (stockStatus.value !== filters.stockStatus) {
          return false;
        }
      }

      return true;
    });
  },

  // Generate SKU
  generateSKU: (productName, category) => {
    const categoryCode = category?.substring(0, 3).toUpperCase() || "PRD";
    const nameCode = productName?.substring(0, 3).toUpperCase() || "XXX";
    const timestamp = Date.now().toString().slice(-4);
    return `${categoryCode}-${nameCode}-${timestamp}`;
  },

  // Validate product data
  validateProduct: (productData) => {
    const errors = [];

    if (!productData.name?.trim()) {
      errors.push("Ürün adı gereklidir");
    }

    if (!productData.sku?.trim()) {
      errors.push("SKU gereklidir");
    }

    if (!productData.category?.trim()) {
      errors.push("Kategori gereklidir");
    }

    if (!productData.price || Number(productData.price) <= 0) {
      errors.push("Geçerli bir satış fiyatı gereklidir");
    }

    if (
      productData.stockQuantity === "" ||
      Number(productData.stockQuantity) < 0
    ) {
      errors.push("Geçerli bir stok miktarı gereklidir");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  // Calculate profit margin
  calculateProfitMargin: (price, costPrice) => {
    if (!price || !costPrice || price <= 0 || costPrice <= 0) return 0;
    return (((price - costPrice) / price) * 100).toFixed(2);
  },

  // Get low stock products
  getLowStockProducts: (products) => {
    return products.filter((product) => {
      const stockStatus = productUtils.getStockStatus(product);
      return (
        stockStatus.value === "low_stock" ||
        stockStatus.value === "out_of_stock"
      );
    });
  },

  // Get platform summary
  getPlatformSummary: (products) => {
    const summary = {};

    products.forEach((product) => {
      const platforms = productUtils.getPlatformBadges(product);
      platforms.forEach((platform) => {
        const key = platform.label || "Unknown";
        if (!summary[key]) {
          summary[key] = { count: 0, totalValue: 0 };
        }
        summary[key].count++;
        summary[key].totalValue += Number(product.price) || 0;
      });
    });

    return summary;
  },
};

// Data Operations Hook
export const useProductOperations = () => {
  const [operationState, setOperationState] = useState({
    syncing: false,
    importing: false,
    deleting: [],
    updating: [],
  });

  const setOperationStatus = useCallback(
    (operation, status, productIds = []) => {
      setOperationState((prev) => ({
        ...prev,
        [operation]:
          operation === "deleting" || operation === "updating"
            ? status
              ? [...prev[operation], ...productIds]
              : prev[operation].filter((id) => !productIds.includes(id))
            : status,
      }));
    },
    []
  );

  const syncFromPlatforms = useCallback(
    async (api) => {
      setOperationStatus("syncing", true);
      try {
        const response = await api.post(`${API_BASE_URL}/products/sync`);
        return {
          success: response.data.success,
          data: response.data.data,
          message: `Başarıyla ${
            response.data.data?.totalSaved || 0
          } ürün senkronize edildi`,
        };
      } catch (error) {
        return {
          success: false,
          error: error.message,
          message: `Senkronizasyon hatası: ${error.message}`,
        };
      } finally {
        setOperationStatus("syncing", false);
      }
    },
    [setOperationStatus]
  );

  const importFromCSV = useCallback(
    async (api, file) => {
      setOperationStatus("importing", true);
      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await api.post(
          `${API_BASE_URL}/products/import/csv`,
          formData,
          {
            headers: { "Content-Type": "multipart/form-data" },
          }
        );

        return {
          success: response.data.success,
          data: response.data.data,
          message: `Başarıyla ${
            response.data.data?.imported || 0
          } ürün içe aktarıldı`,
        };
      } catch (error) {
        return {
          success: false,
          error: error.message,
          message: `CSV içe aktarım hatası: ${error.message}`,
        };
      } finally {
        setOperationStatus("importing", false);
      }
    },
    [setOperationStatus]
  );

  const deleteProducts = useCallback(
    async (api, productIds) => {
      setOperationStatus("deleting", true, productIds);
      try {
        const promises = productIds.map((id) => api.products.deleteProduct(id));
        await Promise.all(promises);

        return {
          success: true,
          message: `${productIds.length} ürün başarıyla silindi`,
        };
      } catch (error) {
        return {
          success: false,
          error: error.message,
          message: `Silme hatası: ${error.message}`,
        };
      } finally {
        setOperationStatus("deleting", false, productIds);
      }
    },
    [setOperationStatus]
  );

  const updateProduct = useCallback(
    async (api, productId, productData) => {
      setOperationStatus("updating", true, [productId]);
      try {
        await api.products.updateProduct(productId, productData);
        return {
          success: true,
          message: "Ürün başarıyla güncellendi",
        };
      } catch (error) {
        return {
          success: false,
          error: error.message,
          message: `Güncelleme hatası: ${error.message}`,
        };
      } finally {
        setOperationStatus("updating", false, [productId]);
      }
    },
    [setOperationStatus]
  );

  return {
    operationState,
    syncFromPlatforms,
    importFromCSV,
    deleteProducts,
    updateProduct,
  };
};

// Demo Component showing the utilities
const UtilitiesDemo = () => {
  // Sample product data
  const sampleProduct = {
    id: 1,
    name: "Wireless Bluetooth Headphones",
    sku: "WBH-001",
    price: 299.99,
    costPrice: 150.0,
    stockQuantity: 3,
    minStockLevel: 5,
    category: "Elektronik",
    status: "active",
    platforms: {
      trendyol: { enabled: true, platformSku: "TY-WBH-001", price: "319.99" },
    },
    sources: [
      { platform: "trendyol", connectionName: "My Store", sku: "TY-WBH-001" },
    ],
    tags: ["bluetooth", "wireless", "premium"],
  };

  const stockDisplay = productUtils.formatStockDisplay(sampleProduct);
  const platformBadges = productUtils.getPlatformBadges(sampleProduct);
  const profitMargin = productUtils.calculateProfitMargin(
    sampleProduct.price,
    sampleProduct.costPrice
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Product Management - Utilities & Data Operations
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Stock Status Demo */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Stock Status
            </h3>
            <div className="flex items-center space-x-2">
              {stockDisplay.icon}
              {stockDisplay.badge}
              <span className="text-sm text-gray-600">
                ({stockDisplay.status.label})
              </span>
            </div>
          </div>

          {/* Platform Badges Demo */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Platform Badges
            </h3>
            <div className="flex flex-wrap gap-2">
              {platformBadges.map((platform, index) => (
                <Tooltip
                  key={index}
                  content={platform.connectionName || platform.label}
                >
                  <Badge
                    variant={platform.variant}
                    className="flex items-center gap-1"
                  >
                    {platform.icon}
                    {platform.label}
                  </Badge>
                </Tooltip>
              ))}
            </div>
          </div>

          {/* Price Formatting Demo */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Price & Profit
            </h3>
            <div className="space-y-2">
              <p>
                <span className="text-gray-600">Satış Fiyatı:</span>{" "}
                {productUtils.formatPrice(sampleProduct.price)}
              </p>
              <p>
                <span className="text-gray-600">Maliyet:</span>{" "}
                {productUtils.formatPrice(sampleProduct.costPrice)}
              </p>
              <p>
                <span className="text-gray-600">Kar Marjı:</span> %
                {profitMargin}
              </p>
            </div>
          </div>

          {/* Validation Demo */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Product Validation
            </h3>
            <div className="space-y-2">
              <Badge variant="success">✓ Ürün adı geçerli</Badge>
              <Badge variant="success">✓ SKU geçerli</Badge>
              <Badge variant="success">✓ Fiyat geçerli</Badge>
              <Badge variant="warning">⚠ Stok seviyesi düşük</Badge>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-4">
            ✨ Part 2 Features
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <h4 className="font-medium mb-2">Utility Functions:</h4>
              <ul className="space-y-1">
                <li>• Stock status calculation</li>
                <li>• Platform badge generation</li>
                <li>• Advanced search & filtering</li>
                <li>• Product validation</li>
                <li>• Price formatting</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Data Operations:</h4>
              <ul className="space-y-1">
                <li>• Platform synchronization</li>
                <li>• CSV import/export</li>
                <li>• Bulk operations</li>
                <li>• Error handling</li>
                <li>• Operation state management</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UtilitiesDemo;
