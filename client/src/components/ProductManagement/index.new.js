import React, { useState, useEffect, useCallback, useMemo } from "react";
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

// API integration
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

// Simple Product Form Component
const ProductForm = ({ product, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: product?.name || "",
    sku: product?.sku || "",
    description: product?.description || "",
    category: product?.category || "",
    price: product?.price || 0,
    stockQuantity: product?.stockQuantity || 0,
    status: product?.status || "active",
  });

  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(formData);
    } catch (error) {
      console.error("Error saving product:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ürün Adı *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, name: e.target.value }))
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ürün adını girin"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            SKU *
          </label>
          <input
            type="text"
            value={formData.sku}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, sku: e.target.value }))
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ürün kodunu girin"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Kategori *
          </label>
          <select
            value={formData.category}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, category: e.target.value }))
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Kategori seçin</option>
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fiyat (₺) *
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={formData.price}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                price: parseFloat(e.target.value) || 0,
              }))
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0.00"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Stok Miktarı *
          </label>
          <input
            type="number"
            min="0"
            value={formData.stockQuantity}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                stockQuantity: parseInt(e.target.value) || 0,
              }))
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Durum
          </label>
          <select
            value={formData.status}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, status: e.target.value }))
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="active">Aktif</option>
            <option value="inactive">Pasif</option>
            <option value="draft">Taslak</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Açıklama
        </label>
        <textarea
          value={formData.description}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, description: e.target.value }))
          }
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Ürün açıklaması"
        />
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
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

// Main ProductManagement Component
const ProductManagement = () => {
  const { showAlert } = useAlert();

  // State management
  const [state, setState] = useState({
    products: [],
    loading: true,
    selectedProducts: [],
    searchValue: "",
    filters: {},
    sortField: "updatedAt",
    sortOrder: "desc",
    viewMode: "table",
    showAnalytics: false,
    syncing: false,
    productModal: { open: false, product: null },
    detailsModal: { open: false, product: null },
  });

  // Update state helper
  const updateState = useCallback((updates) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  // Fetch products
  const fetchProducts = useCallback(async () => {
    updateState({ loading: true });
    try {
      const params = new URLSearchParams({
        page: "0",
        limit: "50",
        sortBy: state.sortField,
        sortOrder: state.sortOrder.toUpperCase(),
      });

      if (state.searchValue) params.append("search", state.searchValue);

      const response = await api.get(
        `${API_BASE_URL}/products?${params.toString()}`
      );

      if (response.success) {
        updateState({
          products: response.data?.products || [],
          loading: false,
        });
      } else {
        throw new Error("Failed to fetch products");
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      showAlert("Ürünler yüklenirken hata oluştu: " + error.message, "error");
      updateState({ products: [], loading: false });
    }
  }, [
    state.sortField,
    state.sortOrder,
    state.searchValue,
    showAlert,
    updateState,
  ]);

  // Initial fetch
  useEffect(() => {
    fetchProducts();
  }, []);

  // Event Handlers
  const handleSync = useCallback(async () => {
    updateState({ syncing: true });
    try {
      const response = await api.post(`${API_BASE_URL}/products/sync`);
      if (response.success) {
        showAlert("Ürünler başarıyla senkronize edildi", "success");
        fetchProducts();
      }
    } catch (error) {
      showAlert("Senkronizasyon hatası: " + error.message, "error");
    } finally {
      updateState({ syncing: false });
    }
  }, [updateState, showAlert, fetchProducts]);

  const handleAddProduct = useCallback(() => {
    updateState({ productModal: { open: true, product: null } });
  }, [updateState]);

  const handleEditProduct = useCallback(
    (product) => {
      updateState({ productModal: { open: true, product } });
    },
    [updateState]
  );

  const handleDeleteProduct = useCallback(
    async (productId) => {
      if (window.confirm("Bu ürünü silmek istediğinizden emin misiniz?")) {
        try {
          await api.delete(`${API_BASE_URL}/products/${productId}`);
          showAlert("Ürün başarıyla silindi", "success");
          fetchProducts();
        } catch (error) {
          showAlert("Ürün silinirken hata oluştu: " + error.message, "error");
        }
      }
    },
    [showAlert, fetchProducts]
  );

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
        updateState({ productModal: { open: false, product: null } });
        fetchProducts();
      } catch (error) {
        showAlert("İşlem sırasında hata oluştu: " + error.message, "error");
      }
    },
    [state.productModal.product, showAlert, fetchProducts, updateState]
  );

  const handleViewProduct = useCallback(
    (product) => {
      updateState({ detailsModal: { open: true, product } });
    },
    [updateState]
  );

  // Status counts for tabs
  const statusCounts = useMemo(() => {
    const counts = {
      all: state.products.length,
      active: 0,
      pending: 0,
      inactive: 0,
    };
    state.products.forEach((product) => {
      if (product.status === "active") counts.active++;
      else if (product.status === "inactive") counts.inactive++;
      else counts.pending++;
    });
    return counts;
  }, [state.products]);

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
                Analytics
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
                Senkronize Et
              </Button>
              <Button onClick={handleAddProduct} variant="primary" icon={Plus}>
                Yeni Ürün
              </Button>
            </div>
          </div>
        </div>

        {/* Product Display */}
        <ProductDisplay
          products={state.products}
          loading={state.loading}
          viewMode={state.viewMode}
          selectedProducts={state.selectedProducts}
          onSelectProduct={(productId) => {
            const selected = state.selectedProducts.includes(productId)
              ? state.selectedProducts.filter((id) => id !== productId)
              : [...state.selectedProducts, productId];
            updateState({ selectedProducts: selected });
          }}
          onSelectAll={() => {
            const allSelected =
              state.selectedProducts.length === state.products.length;
            updateState({
              selectedProducts: allSelected
                ? []
                : state.products.map((p) => p.id),
            });
          }}
          onView={handleViewProduct}
          onEdit={handleEditProduct}
          onDelete={handleDeleteProduct}
          onAddProduct={handleAddProduct}
          onSync={handleSync}
          sortField={state.sortField}
          sortOrder={state.sortOrder}
          onSort={(field) => {
            updateState({
              sortField: field,
              sortOrder:
                state.sortField === field && state.sortOrder === "asc"
                  ? "desc"
                  : "asc",
            });
          }}
          productQuota={{
            current: state.products.length,
            max: 75000,
            level: 2,
          }}
          statusCounts={statusCounts}
          filters={state.filters}
          onFilterChange={(filters) => updateState({ filters })}
          onClearFilters={() => updateState({ filters: {} })}
          activeTab="all"
          onTabChange={() => {}}
          categories={CATEGORIES}
          brands={[]}
          onViewModeChange={(mode) => updateState({ viewMode: mode })}
        />

        {/* Product Form Modal */}
        <Modal
          isOpen={state.productModal.open}
          onClose={() =>
            updateState({ productModal: { open: false, product: null } })
          }
          title={state.productModal.product ? "Ürün Düzenle" : "Yeni Ürün Ekle"}
          size="xl"
        >
          <ProductForm
            product={state.productModal.product}
            onSave={handleSaveProduct}
            onCancel={() =>
              updateState({ productModal: { open: false, product: null } })
            }
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
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">
                    Temel Bilgiler
                  </h4>
                  <div className="space-y-1 text-sm">
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
                      <span className="font-medium">Fiyat:</span> ₺
                      {state.detailsModal.product.price}
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">
                    Stok Bilgileri
                  </h4>
                  <div className="space-y-1 text-sm">
                    <div>
                      <span className="font-medium">Stok:</span>{" "}
                      {state.detailsModal.product.stockQuantity}
                    </div>
                    <div>
                      <span className="font-medium">Durum:</span>{" "}
                      {state.detailsModal.product.status}
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
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
};

export default ProductManagement;
