import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  Plus,
  RefreshCw,
  TrendingUp,
  Package,
  Loader,
  Eye,
  Edit,
  Trash2,
  X,
} from "lucide-react";
import { API_BASE_URL } from "./utils/constants";
import { useAlert } from "../../contexts/AlertContext";
import ProductDisplay from "./components/ProductDisplay";

// API integration with proper error handling
const api = {
  get: async (url) => {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
    if (!response.ok)
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    return response.json();
  },
  post: async (url, data) => {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify(data),
    });
    if (!response.ok)
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    return response.json();
  },
  put: async (url, data) => {
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify(data),
    });
    if (!response.ok)
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    return response.json();
  },
  delete: async (url) => {
    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
    if (!response.ok)
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    return response.json();
  },
};

// Alert hook for notifications
const useAlert = () => ({
  showAlert: (message, type) => {
    // In a real app, this would integrate with a toast/notification system
    if (type === "error") {
      console.error(message);
      alert(`Error: ${message}`);
    } else if (type === "success") {
      console.log(`Success: ${message}`);
    } else {
      console.log(`${type}: ${message}`);
    }
  },
});

// UI Components
const Button = ({
  children,
  onClick,
  variant = "default",
  size = "md",
  icon: Icon,
  disabled,
  className = "",
  ...props
}) => {
  const variants = {
    default:
      "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-blue-500",
    primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
    outline:
      "border border-gray-300 bg-transparent text-gray-700 hover:bg-gray-50 focus:ring-blue-500",
    ghost: "text-gray-700 hover:bg-gray-100 focus:ring-blue-500",
    danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
    success: "bg-green-600 text-white hover:bg-green-700 focus:ring-green-500",
  };
  const sizes = {
    sm: "px-2 py-1 text-sm h-8",
    md: "px-4 py-2 text-sm h-10",
    lg: "px-6 py-3 text-base h-12",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {Icon && <Icon className="w-4 h-4 mr-2" />}
      {children}
    </button>
  );
};

const Card = ({ children, className = "" }) => (
  <div
    className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`}
  >
    {children}
  </div>
);

const CardHeader = ({ children, className = "" }) => (
  <div className={`px-6 py-4 border-b border-gray-200 ${className}`}>
    {children}
  </div>
);

const CardContent = ({ children, className = "" }) => (
  <div className={`p-6 ${className}`}>{children}</div>
);

const Badge = ({ children, variant = "default", className = "" }) => {
  const variants = {
    default: "bg-gray-100 text-gray-800",
    primary: "bg-blue-100 text-blue-800",
    secondary: "bg-gray-100 text-gray-600",
    success: "bg-green-100 text-green-800",
    warning: "bg-amber-100 text-amber-800",
    danger: "bg-red-100 text-red-800",
    info: "bg-cyan-100 text-cyan-800",
    outline: "border border-gray-300 text-gray-700 bg-white",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
};

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  className = "",
}) => {
  const sizes = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
    full: "max-w-7xl",
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:p-0">
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />
        <div
          className={`inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle ${sizes[size]} sm:w-full ${className}`}
        >
          <div className="bg-white px-6 pt-6 pb-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">{title}</h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
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

// Constants
const CATEGORIES = [
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

const PLATFORMS = [
  { value: "all", label: "Tüm Platformlar" },
  { value: "trendyol", label: "Trendyol" },
  { value: "hepsiburada", label: "Hepsiburada" },
  { value: "n11", label: "N11" },
  { value: "amazon", label: "Amazon" },
  { value: "csv", label: "CSV" },
  { value: "local", label: "Yerel" },
];

// Platform Icons
const PlatformIcons = {
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

// Utility Functions
const getStockStatus = (product) => {
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

const getPlatformBadges = (product) => {
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

  return Array.from(activePlatforms.values());
};

const getStatusVariant = (status) => {
  switch (status) {
    case "active":
      return "success";
    case "inactive":
      return "secondary";
    case "draft":
      return "warning";
    default:
      return "secondary";
  }
};

const formatPrice = (price) => {
  if (typeof price !== "number") return "₺0.00";
  return `₺${price.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

// Product Form Component
const ProductForm = ({ product, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: product?.name || "",
    sku: product?.sku || "",
    barcode: product?.barcode || "",
    description: product?.description || "",
    category: product?.category || "",
    price: product?.price || 0,
    costPrice: product?.costPrice || 0,
    stockQuantity: product?.stockQuantity || 0,
    minStockLevel: product?.minStockLevel || 0,
    weight: product?.weight || 0,
    status: product?.status || "active",
    tags: product?.tags || [],
  });

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) newErrors.name = "Ürün adı gereklidir";
    if (!formData.sku.trim()) newErrors.sku = "SKU gereklidir";
    if (!formData.category.trim()) newErrors.category = "Kategori gereklidir";
    if (formData.price < 0) newErrors.price = "Fiyat negatif olamaz";
    if (formData.stockQuantity < 0)
      newErrors.stockQuantity = "Stok miktarı negatif olamaz";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSaving(true);
    try {
      await onSave(formData);
    } catch (error) {
      console.error("Error saving product:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ürün Adı *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.name ? "border-red-500" : "border-gray-300"
            }`}
            placeholder="Ürün adını girin"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            SKU *
          </label>
          <input
            type="text"
            value={formData.sku}
            onChange={(e) => handleChange("sku", e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.sku ? "border-red-500" : "border-gray-300"
            }`}
            placeholder="Ürün kodunu girin"
          />
          {errors.sku && (
            <p className="mt-1 text-sm text-red-600">{errors.sku}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Barkod
          </label>
          <input
            type="text"
            value={formData.barcode}
            onChange={(e) => handleChange("barcode", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Barkod numarası"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Kategori *
          </label>
          <select
            value={formData.category}
            onChange={(e) => handleChange("category", e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.category ? "border-red-500" : "border-gray-300"
            }`}
          >
            <option value="">Kategori seçin</option>
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          {errors.category && (
            <p className="mt-1 text-sm text-red-600">{errors.category}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Fiyat (₺) *
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={formData.price}
            onChange={(e) =>
              handleChange("price", parseFloat(e.target.value) || 0)
            }
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.price ? "border-red-500" : "border-gray-300"
            }`}
            placeholder="0.00"
          />
          {errors.price && (
            <p className="mt-1 text-sm text-red-600">{errors.price}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Maliyet Fiyatı (₺)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={formData.costPrice}
            onChange={(e) =>
              handleChange("costPrice", parseFloat(e.target.value) || 0)
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0.00"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Stok Miktarı *
          </label>
          <input
            type="number"
            min="0"
            value={formData.stockQuantity}
            onChange={(e) =>
              handleChange("stockQuantity", parseInt(e.target.value) || 0)
            }
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.stockQuantity ? "border-red-500" : "border-gray-300"
            }`}
            placeholder="0"
          />
          {errors.stockQuantity && (
            <p className="mt-1 text-sm text-red-600">{errors.stockQuantity}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Minimum Stok Seviyesi
          </label>
          <input
            type="number"
            min="0"
            value={formData.minStockLevel}
            onChange={(e) =>
              handleChange("minStockLevel", parseInt(e.target.value) || 0)
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ağırlık (kg)
          </label>
          <input
            type="number"
            step="0.001"
            min="0"
            value={formData.weight}
            onChange={(e) =>
              handleChange("weight", parseFloat(e.target.value) || 0)
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0.000"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Durum
          </label>
          <select
            value={formData.status}
            onChange={(e) => handleChange("status", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="active">Aktif</option>
            <option value="inactive">Pasif</option>
            <option value="draft">Taslak</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Açıklama
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => handleChange("description", e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Ürün açıklaması"
        />
      </div>

      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
        <Button onClick={onCancel} variant="outline" disabled={saving}>
          İptal
        </Button>
        <Button type="submit" variant="primary" disabled={saving}>
          {saving && <Loader className="w-4 h-4 mr-2 animate-spin" />}
          {product ? "Güncelle" : "Kaydet"}
        </Button>
      </div>
    </form>
  );
};

// Product Table Component
const ProductTable = ({
  products,
  selectedProducts,
  onSelectProduct,
  onSelectAll,
  onSort,
  sortField,
  sortOrder,
  onEdit,
  onDelete,
  onViewDetails,
}) => {
  const renderSortIcon = (field) => {
    if (sortField !== field)
      return <SortAsc className="h-4 w-4 opacity-0 group-hover:opacity-50" />;
    return sortOrder === "asc" ? (
      <SortAsc className="h-4 w-4" />
    ) : (
      <SortDesc className="h-4 w-4" />
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4">
              <input
                type="checkbox"
                checked={
                  selectedProducts.length === products.length &&
                  products.length > 0
                }
                onChange={onSelectAll}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </th>
            <th className="text-left py-3 px-4">
              <button
                onClick={() => onSort("name")}
                className="group flex items-center space-x-1 font-medium text-gray-900 hover:text-blue-600"
              >
                <span>Ürün</span>
                {renderSortIcon("name")}
              </button>
            </th>
            <th className="text-left py-3 px-4">SKU</th>
            <th className="text-left py-3 px-4">
              <button
                onClick={() => onSort("price")}
                className="group flex items-center space-x-1 font-medium text-gray-900 hover:text-blue-600"
              >
                <span>Fiyat</span>
                {renderSortIcon("price")}
              </button>
            </th>
            <th className="text-left py-3 px-4">
              <button
                onClick={() => onSort("stockQuantity")}
                className="group flex items-center space-x-1 font-medium text-gray-900 hover:text-blue-600"
              >
                <span>Stok</span>
                {renderSortIcon("stockQuantity")}
              </button>
            </th>
            <th className="text-left py-3 px-4">Platformlar</th>
            <th className="text-left py-3 px-4">Durum</th>
            <th className="text-right py-3 px-4">İşlemler</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => {
            const stockStatus = getStockStatus(product);
            const platformBadges = getPlatformBadges(product);

            return (
              <tr
                key={product.id}
                className="border-b border-gray-100 hover:bg-gray-50"
              >
                <td className="py-3 px-4">
                  <input
                    type="checkbox"
                    checked={selectedProducts.includes(product.id)}
                    onChange={() => onSelectProduct(product.id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center space-x-3">
                    {product.images && product.images.length > 0 ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="h-10 w-10 rounded-lg object-cover"
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="h-10 w-10 bg-gray-200 rounded-lg flex items-center justify-center">
                        <Package className="h-5 w-5 text-gray-400" />
                      </div>
                    )}
                    <div>
                      <div className="font-medium text-gray-900">
                        {product.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {product.category}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="text-sm font-mono text-gray-900">
                    {product.sku}
                  </div>
                  {product.barcode && (
                    <div className="text-xs text-gray-500">
                      {product.barcode}
                    </div>
                  )}
                </td>
                <td className="py-3 px-4">
                  <div className="text-sm font-medium text-gray-900">
                    {formatPrice(product.price)}
                  </div>
                  {product.costPrice && (
                    <div className="text-xs text-gray-500">
                      Maliyet: {formatPrice(product.costPrice)}
                    </div>
                  )}
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center space-x-2">
                    {stockStatus.icon}
                    <span className="text-sm font-medium">
                      {product.stockQuantity}
                    </span>
                  </div>
                  <Badge variant={stockStatus.variant} className="mt-1">
                    {stockStatus.label}
                  </Badge>
                </td>
                <td className="py-3 px-4">
                  <div className="flex flex-wrap gap-1">
                    {platformBadges.length > 0 ? (
                      platformBadges.map((platform) => (
                        <Tooltip
                          key={platform.value}
                          content={`${platform.label} - SKU: ${
                            platform.sku || "N/A"
                          }`}
                        >
                          <Badge
                            variant="outline"
                            className="flex items-center space-x-1"
                          >
                            {platform.icon}
                            <span>{platform.label}</span>
                          </Badge>
                        </Tooltip>
                      ))
                    ) : (
                      <Badge variant="secondary">Yerel</Badge>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <Badge variant={getStatusVariant(product.status)}>
                    {product.status === "active"
                      ? "Aktif"
                      : product.status === "inactive"
                      ? "Pasif"
                      : "Taslak"}
                  </Badge>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end space-x-2">
                    <Tooltip content="Detayları Görüntüle">
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={Eye}
                        onClick={() => onViewDetails(product)}
                      />
                    </Tooltip>
                    <Tooltip content="Düzenle">
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={Edit}
                        onClick={() => onEdit(product)}
                      />
                    </Tooltip>
                    <Tooltip content="Sil">
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={Trash2}
                        onClick={() => onDelete(product.id)}
                        className="text-red-600 hover:text-red-800"
                      />
                    </Tooltip>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// Main ProductManagement Component
const ProductManagement = () => {
  const { showAlert } = useAlert();

  // Consolidated State Management
  const [state, setState] = useState({
    // Core data
    products: [],
    loading: true,
    selectedProducts: [],

    // UI state
    viewMode: "table",
    showAnalytics: false,

    // Filter state
    searchValue: "",
    filters: {
      category: "",
      status: "",
      stockStatus: "",
      minPrice: "",
      maxPrice: "",
      minStock: "",
      maxStock: "",
    },
    platformFilter: "all",

    // Sort state
    sortField: "updatedAt",
    sortOrder: "desc",

    // Pagination
    pagination: { page: 0, limit: 50, total: 0, totalPages: 0 },

    // Modal states
    productModal: { open: false, product: null },
    detailsModal: { open: false, product: null },

    // Operation states
    syncing: false,
    syncStats: null,
  });

  // Update state helper
  const updateState = useCallback((updates) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  // Fetch products with proper memoization - FIXED VERSION
  const fetchProducts = useCallback(async () => {
    updateState({ loading: true });
    try {
      const { page, limit } = state.pagination;
      const sortBy = state.sortField;
      const sortOrder = state.sortOrder;

      // Build query params
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortBy,
        sortOrder: sortOrder.toUpperCase(),
      });

      if (state.searchValue) params.append("search", state.searchValue);
      if (state.filters.category)
        params.append("category", state.filters.category);
      if (state.filters.status) params.append("status", state.filters.status);
      if (state.platformFilter !== "all")
        params.append("platform", state.platformFilter);

      console.log(
        "Fetching products with URL:",
        `${API_BASE_URL}/products?${params.toString()}`
      );

      const response = await api.get(
        `${API_BASE_URL}/products?${params.toString()}`
      );

      console.log("API Response:", response);

      let products = [];
      let paginationData = {};

      if (response.success) {
        products = response.data?.products || [];
        paginationData = response.data?.pagination || {};
      }

      updateState({
        products,
        pagination: {
          page: state.pagination.page,
          limit: state.pagination.limit,
          total: paginationData.totalItems || products.length,
          totalPages: paginationData.totalPages || 1,
        },
        loading: false,
      });

      console.log("Products loaded successfully:", products.length);
    } catch (error) {
      console.error("Error fetching products:", error);
      showAlert("Ürünler yüklenirken hata oluştu: " + error.message, "error");
      updateState({ products: [], loading: false });
    }
  }, [
    state.pagination,
    state.sortField,
    state.sortOrder,
    state.searchValue,
    state.filters.category,
    state.filters.status,
    state.platformFilter,
    updateState,
    showAlert,
  ]);

  // FIXED: Initial fetch - only run once on mount
  useEffect(() => {
    let isMounted = true;

    const loadInitialProducts = async () => {
      if (isMounted) {
        try {
          // Use setState directly to avoid dependency issues
          setState((prev) => ({ ...prev, loading: true }));

          const params = new URLSearchParams({
            page: "0",
            limit: "50",
            sortBy: "updatedAt",
            sortOrder: "DESC",
          });

          console.log(
            "Initial fetch - Fetching products with URL:",
            `${API_BASE_URL}/products?${params.toString()}`
          );

          const response = await api.get(
            `${API_BASE_URL}/products?${params.toString()}`
          );
          console.log("Initial fetch - API Response:", response);

          let products = [];
          let paginationData = {};

          if (response.success) {
            products = response.data?.products || [];
            paginationData = response.data?.pagination || {};
          }

          if (isMounted) {
            setState((prev) => ({
              ...prev,
              products,
              pagination: {
                page: 0,
                limit: 50,
                total: paginationData.totalItems || products.length,
                totalPages: paginationData.totalPages || 1,
              },
              loading: false,
            }));

            console.log(
              "Initial fetch - Products loaded successfully:",
              products.length
            );
          }
        } catch (error) {
          console.error("Initial fetch - Error fetching products:", error);
          if (isMounted) {
            showAlert(
              "Ürünler yüklenirken hata oluştu: " + error.message,
              "error"
            );
            setState((prev) => ({ ...prev, products: [], loading: false }));
          }
        }
      }
    };

    loadInitialProducts();

    return () => {
      isMounted = false;
    };
  }, []); // FIXED: Empty dependency array for initial load only

  // FIXED: Separate effect for search/filter changes with proper debouncing
  const debouncedSearchValue = useMemo(() => {
    const timeoutId = setTimeout(() => state.searchValue, 300);
    return () => clearTimeout(timeoutId);
  }, [state.searchValue]);

  useEffect(() => {
    // Skip if this is the initial load or if no search/filter values have changed
    if (state.loading && state.products.length === 0) {
      return;
    }

    // Only fetch if we have actual filter/search changes
    if (
      state.searchValue ||
      state.filters.category ||
      state.filters.status ||
      state.platformFilter !== "all" ||
      state.pagination.page > 0 // Only refetch if page changed
    ) {
      const timeoutId = setTimeout(() => {
        fetchProducts();
      }, 300); // Debounce

      return () => clearTimeout(timeoutId);
    }
  }, [
    state.searchValue,
    state.filters.category,
    state.filters.status,
    state.platformFilter,
    state.sortField,
    state.sortOrder,
    state.pagination.page,
    fetchProducts,
    state.loading,
    state.products.length,
  ]);

  // Remove the problematic fetchProducts dependency effect

  // Memoized filtered and sorted products
  const processedProducts = useMemo(() => {
    let filtered = state.products;

    // Apply search filter
    if (state.searchValue.trim()) {
      const searchTerm = state.searchValue.toLowerCase();
      filtered = filtered.filter((product) => {
        const searchFields = [
          product.name,
          product.sku,
          product.barcode,
          product.description,
          product.category,
        ]
          .filter(Boolean)
          .map((field) => field.toLowerCase());

        const tags = product.tags || [];
        const platformSkus = [];

        // Search in platform data
        if (product.platformData) {
          platformSkus.push(
            ...product.platformData.map((p) => p.platformSku).filter(Boolean)
          );
        }

        const allSearchableText = [
          ...searchFields,
          ...tags.map((tag) => tag.toLowerCase()),
          ...platformSkus.map((sku) => sku.toLowerCase()),
        ].join(" ");

        return allSearchableText.includes(searchTerm);
      });
    }

    // Apply filters
    if (state.filters.category) {
      filtered = filtered.filter((p) => p.category === state.filters.category);
    }
    if (state.filters.status) {
      filtered = filtered.filter((p) => p.status === state.filters.status);
    }
    if (state.filters.stockStatus) {
      filtered = filtered.filter((p) => {
        const stockStatus = getStockStatus(p);
        return stockStatus.value === state.filters.stockStatus;
      });
    }
    if (state.filters.minPrice) {
      filtered = filtered.filter(
        (p) => Number(p.price) >= Number(state.filters.minPrice)
      );
    }
    if (state.filters.maxPrice) {
      filtered = filtered.filter(
        (p) => Number(p.price) <= Number(state.filters.maxPrice)
      );
    }
    if (state.filters.minStock) {
      filtered = filtered.filter(
        (p) => Number(p.stockQuantity) >= Number(state.filters.minStock)
      );
    }
    if (state.filters.maxStock) {
      filtered = filtered.filter(
        (p) => Number(p.stockQuantity) <= Number(state.filters.maxStock)
      );
    }

    // Apply platform filter
    if (state.platformFilter !== "all") {
      filtered = filtered.filter((p) => {
        if (state.platformFilter === "local") {
          const hasExternalPlatforms =
            p.platformData?.length > 0 ||
            Object.values(p.platforms || {}).some(
              (platform) => platform?.enabled
            );
          return !hasExternalPlatforms;
        }

        // Check platform data
        if (
          p.platformData?.some(
            (pd) =>
              pd.platformType === state.platformFilter && pd.status === "active"
          )
        ) {
          return true;
        }

        // Check legacy platform connections
        return p.platforms?.[state.platformFilter]?.enabled;
      });
    }

    // Apply sorting
    const sortedProducts = [...filtered].sort((a, b) => {
      let aValue = a[state.sortField];
      let bValue = b[state.sortField];

      if (state.sortField === "price" || state.sortField === "stockQuantity") {
        aValue = Number(aValue) || 0;
        bValue = Number(bValue) || 0;
      } else if (state.sortField === "updatedAt") {
        aValue = new Date(aValue || 0);
        bValue = new Date(bValue || 0);
      } else {
        aValue = String(aValue || "").toLowerCase();
        bValue = String(bValue || "").toLowerCase();
      }

      if (aValue < bValue) return state.sortOrder === "asc" ? -1 : 1;
      if (aValue > bValue) return state.sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return sortedProducts;
  }, [
    state.products,
    state.searchValue,
    state.filters,
    state.platformFilter,
    state.sortField,
    state.sortOrder,
  ]);

  // Event Handlers
  const handleSelectProduct = useCallback(
    (productId) => {
      updateState({
        selectedProducts: state.selectedProducts.includes(productId)
          ? state.selectedProducts.filter((id) => id !== productId)
          : [...state.selectedProducts, productId],
      });
    },
    [updateState, state.selectedProducts]
  );

  const handleSelectAll = useCallback(() => {
    updateState({
      selectedProducts:
        state.selectedProducts.length === processedProducts.length
          ? []
          : processedProducts.map((p) => p.id),
    });
  }, [updateState, state.selectedProducts, processedProducts]);

  const handleSort = useCallback(
    (field) => {
      updateState({
        sortField: field,
        sortOrder:
          state.sortField === field && state.sortOrder === "asc"
            ? "desc"
            : "asc",
      });
    },
    [updateState, state.sortField, state.sortOrder]
  );

  const handleOpenProductModal = useCallback(
    (product = null) => {
      updateState({ productModal: { open: true, product } });
    },
    [updateState]
  );

  const handleCloseProductModal = useCallback(() => {
    updateState({ productModal: { open: false, product: null } });
  }, [updateState]);

  const handleSaveProduct = useCallback(
    async (productData) => {
      try {
        if (state.productModal.product) {
          await api.put(
            `${API_BASE_URL}/products/${state.productModal.product.id}`,
            productData
          );
          showAlert("Ürün başarıyla güncellendi", "success");
        } else {
          await api.post(`${API_BASE_URL}/products`, productData);
          showAlert("Ürün başarıyla oluşturuldu", "success");
        }
        handleCloseProductModal();
        fetchProducts();
      } catch (error) {
        console.error("Error saving product:", error);
        showAlert("İşlem sırasında hata oluştu: " + error.message, "error");
      }
    },
    [
      state.productModal.product,
      showAlert,
      fetchProducts,
      handleCloseProductModal,
    ]
  );

  const handleDeleteProduct = useCallback(
    async (productId) => {
      if (window.confirm("Bu ürünü silmek istediğinizden emin misiniz?")) {
        try {
          await api.delete(`${API_BASE_URL}/products/${productId}`);
          showAlert("Ürün başarıyla silindi", "success");
          fetchProducts();
        } catch (error) {
          console.error("Error deleting product:", error);
          showAlert("Ürün silinirken hata oluştu: " + error.message, "error");
        }
      }
    },
    [showAlert, fetchProducts]
  );

  const handleSync = useCallback(async () => {
    updateState({ syncing: true });
    try {
      const response = await api.post(`${API_BASE_URL}/products/sync`);
      if (response.success) {
        updateState({ syncStats: response.data });
        showAlert(
          `Başarıyla ${response.data.totalSaved} ürün senkronize edildi`,
          "success"
        );
        fetchProducts();
      } else {
        showAlert("Ürün senkronizasyonunda hata oluştu", "error");
      }
    } catch (error) {
      console.error("Error syncing products:", error);
      showAlert(`Ürün senkronizasyonu hatası: ${error.message}`, "error");
    } finally {
      updateState({ syncing: false });
    }
  }, [updateState, showAlert, fetchProducts]);

  const handleViewDetails = useCallback(
    (product) => {
      updateState({ detailsModal: { open: true, product } });
    },
    [updateState]
  );

  const handleSearch = useCallback(() => {
    updateState({ pagination: { ...state.pagination, page: 0 } });
  }, [updateState, state.pagination]);

  // Helper functions for rendering
  const renderEmptyState = () => (
    <div className="text-center py-12">
      <Package className="mx-auto h-16 w-16 text-gray-400 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        Henüz ürün bulunmuyor
      </h3>
      <p className="text-gray-600 mb-6 max-w-md mx-auto">
        İlk ürününüzü ekleyerek başlayın veya mevcut platformlarınızdan ürünleri
        senkronize edin
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button
          onClick={() => handleOpenProductModal()}
          variant="primary"
          icon={Plus}
        >
          İlk Ürünü Ekle
        </Button>
        <Button
          onClick={handleSync}
          variant="outline"
          icon={RefreshCw}
          disabled={state.syncing}
        >
          Platformlardan Senkronize Et
        </Button>
      </div>
    </div>
  );

  const renderLoadingState = () => (
    <div className="text-center py-12">
      <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        Ürünler yükleniyor
      </h3>
      <p className="text-gray-600">
        Ürünleriniz hazırlanıyor, lütfen bekleyin...
      </p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="mb-4 lg:mb-0">
              <h1 className="text-3xl font-bold text-gray-900">
                Ürün Yönetimi
              </h1>
              <p className="mt-2 text-gray-600">
                Ürünlerinizi yönetin ve e-ticaret platformlarında senkronize
                edin
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                onClick={() =>
                  updateState({ showAnalytics: !state.showAnalytics })
                }
                variant="outline"
                icon={TrendingUp}
              >
                <span className="hidden sm:inline">Analytics</span>
              </Button>
              <Button
                onClick={handleSync}
                variant="outline"
                icon={RefreshCw}
                disabled={state.syncing}
              >
                {state.syncing && (
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                )}
                <span className="hidden sm:inline">Senkronize Et</span>
                <span className="sm:hidden">Sync</span>
              </Button>
              <Button
                onClick={() => handleOpenProductModal()}
                variant="primary"
                icon={Plus}
              >
                <span className="hidden sm:inline">Yeni Ürün</span>
                <span className="sm:hidden">Ekle</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Analytics Panel */}
        {state.showAnalytics && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2 text-blue-500" />
                  <h3 className="text-lg font-medium">Ürün Performansı</h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={X}
                  onClick={() => updateState({ showAnalytics: false })}
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {processedProducts.length}
                  </div>
                  <div className="text-sm text-blue-800">Toplam Ürün</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {
                      processedProducts.filter(
                        (p) => getStockStatus(p).value === "in_stock"
                      ).length
                    }
                  </div>
                  <div className="text-sm text-green-800">Stokta</div>
                </div>
                <div className="text-center p-4 bg-amber-50 rounded-lg">
                  <div className="text-2xl font-bold text-amber-600">
                    {
                      processedProducts.filter(
                        (p) => getStockStatus(p).value === "low_stock"
                      ).length
                    }
                  </div>
                  <div className="text-sm text-amber-800">Az Stok</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {
                      processedProducts.filter(
                        (p) => getStockStatus(p).value === "out_of_stock"
                      ).length
                    }
                  </div>
                  <div className="text-sm text-red-800">Stok Yok</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="pb-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4">
              <div className="flex-1 max-w-lg">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={state.searchValue}
                    onChange={(e) =>
                      updateState({ searchValue: e.target.value })
                    }
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    placeholder="Ürün adı, SKU veya barkod ile ara..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <select
                  value={state.filters.category}
                  onChange={(e) =>
                    updateState({
                      filters: { ...state.filters, category: e.target.value },
                    })
                  }
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Tüm Kategoriler</option>
                  {CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>

                <select
                  value={state.platformFilter}
                  onChange={(e) =>
                    updateState({ platformFilter: e.target.value })
                  }
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {PLATFORMS.map((platform) => (
                    <option key={platform.value} value={platform.value}>
                      {platform.label}
                    </option>
                  ))}
                </select>

                <Button onClick={handleSearch} variant="primary" icon={Search}>
                  Ara
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sync Stats */}
        {state.syncStats && (
          <Card className="mb-6">
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">
                    Senkronizasyon Sonuçları
                  </h4>
                  <p className="text-sm text-gray-600">
                    {state.syncStats.totalFetched} ürün getirildi,{" "}
                    {state.syncStats.totalSaved} ürün kaydedildi
                    {state.syncStats.totalMerged &&
                      `, ${state.syncStats.totalMerged} ürün birleştirildi`}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={X}
                  onClick={() => updateState({ syncStats: null })}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Product Display */}
        <Card className="mb-6">
          <CardContent className="p-0">
            {state.loading ? (
              renderLoadingState()
            ) : processedProducts.length === 0 ? (
              renderEmptyState()
            ) : (
              <div>
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      {processedProducts.length} ürün bulundu
                      {state.selectedProducts.length > 0 && (
                        <span className="ml-4 font-medium">
                          {state.selectedProducts.length} ürün seçildi
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button
                        variant={
                          state.viewMode === "table" ? "primary" : "outline"
                        }
                        size="sm"
                        icon={List}
                        onClick={() => updateState({ viewMode: "table" })}
                      >
                        Tablo
                      </Button>
                      <Button
                        variant={
                          state.viewMode === "grid" ? "primary" : "outline"
                        }
                        size="sm"
                        icon={Grid3X3}
                        onClick={() => updateState({ viewMode: "grid" })}
                      >
                        Kart
                      </Button>
                    </div>
                  </div>
                </div>

                <ProductTable
                  products={processedProducts}
                  selectedProducts={state.selectedProducts}
                  onSelectProduct={handleSelectProduct}
                  onSelectAll={handleSelectAll}
                  onSort={handleSort}
                  sortField={state.sortField}
                  sortOrder={state.sortOrder}
                  onEdit={handleOpenProductModal}
                  onDelete={handleDeleteProduct}
                  onViewDetails={handleViewDetails}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Product Form Modal */}
        <Modal
          isOpen={state.productModal.open}
          onClose={handleCloseProductModal}
          title={state.productModal.product ? "Ürün Düzenle" : "Yeni Ürün Ekle"}
          size="xl"
        >
          <ProductForm
            product={state.productModal.product}
            onSave={handleSaveProduct}
            onCancel={handleCloseProductModal}
          />
        </Modal>

        {/* Product Details Modal */}
        <Modal
          isOpen={state.detailsModal.open}
          onClose={() =>
            updateState({ detailsModal: { open: false, product: null } })
          }
          title="Ürün Detayları"
          size="lg"
        >
          {state.detailsModal.product && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">
                    Temel Bilgiler
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Ad:</span>{" "}
                      {state.detailsModal.product.name}
                    </div>
                    <div>
                      <span className="font-medium">SKU:</span>{" "}
                      {state.detailsModal.product.sku}
                    </div>
                    <div>
                      <span className="font-medium">Kategori:</span>{" "}
                      {state.detailsModal.product.category}
                    </div>
                    <div>
                      <span className="font-medium">Fiyat:</span>{" "}
                      {formatPrice(state.detailsModal.product.price)}
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">
                    Stok Bilgileri
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Stok:</span>{" "}
                      {state.detailsModal.product.stockQuantity}
                    </div>
                    <div>
                      <span className="font-medium">Min. Stok:</span>{" "}
                      {state.detailsModal.product.minStockLevel}
                    </div>
                    <div>
                      <span className="font-medium">Durum:</span>{" "}
                      {getStockStatus(state.detailsModal.product).label}
                    </div>
                  </div>
                </div>
              </div>

              {state.detailsModal.product.description && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Açıklama</h4>
                  <p className="text-sm text-gray-600">
                    {state.detailsModal.product.description}
                  </p>
                </div>
              )}

              {getPlatformBadges(state.detailsModal.product).length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">
                    Platform Bağlantıları
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {getPlatformBadges(state.detailsModal.product).map(
                      (platform) => (
                        <Badge
                          key={platform.value}
                          variant="outline"
                          className="flex items-center space-x-1"
                        >
                          {platform.icon}
                          <span>{platform.label}</span>
                        </Badge>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
};

export default ProductManagement;
