import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Plus,
  RefreshCw,
  Loader,
  X,
  Package,
  CheckCircle,
  AlertTriangle,
  TrendingDown,
  Download,
  Upload,
  Edit,
} from "lucide-react";
import { API_BASE_URL } from "./utils/constants";
import { useAlert } from "../../contexts/AlertContext";
import ProductDisplay from "./components/ProductDisplay";
import { ImagePreviewModal } from "./components/ProductModals";
import EnhancedProductAnalytics from "./components/ProductAnalyticsFixed";
import BulkEditModal from "./components/BulkEditModal";

import AdvancedSearchPanel from "./components/AdvancedSearchPanel";
import { productUtils } from "./utils/productUtils";
import "./ProductManagement.css";

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
  variant = "secondary",
  size = "md",
  icon: Icon,
  disabled,
  className = "",
  ...props
}) => {
  const variantClass =
    {
      primary: "btn-primary",
      secondary: "btn-secondary",
      ghost: "btn-ghost",
      danger: "btn-danger",
      outline: "btn-secondary",
    }[variant] || "btn-secondary";

  const sizeClass =
    {
      sm: "btn-sm",
      md: "",
      lg: "btn-lg",
    }[size] || "";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`btn ${variantClass} ${sizeClass} ${className}`}
      {...props}
    >
      {Icon && <Icon className="w-4 h-4 mr-2" />}
      {children}
    </button>
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
    sm: "sm:max-w-md",
    md: "sm:max-w-lg",
    lg: "sm:max-w-2xl",
    xl: "sm:max-w-4xl",
    full: "sm:max-w-7xl",
  };

  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-backdrop" onClick={onClose} />
      <div className={`modal-container ${sizes[size]} ${className}`}>
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button onClick={onClose} className="modal-close">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="modal-body">{children}</div>
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
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="form-group">
          <label className="form-label" htmlFor="name">
            Ürün Adı <span className="form-required">*</span>
          </label>
          <input
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, name: e.target.value }))
            }
            className="form-input"
            placeholder="Ürün adını girin"
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="sku">
            SKU <span className="form-required">*</span>
          </label>
          <input
            id="sku"
            type="text"
            value={formData.sku}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, sku: e.target.value }))
            }
            className="form-input"
            placeholder="Ürün kodunu girin"
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="category">
            Kategori <span className="form-required">*</span>
          </label>
          <select
            id="category"
            value={formData.category}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, category: e.target.value }))
            }
            className="form-input"
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
        <div className="form-group">
          <label className="form-label" htmlFor="price">
            Fiyat (₺) <span className="form-required">*</span>
          </label>
          <input
            id="price"
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
            className="form-input"
            placeholder="0.00"
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="stock">
            Stok Miktarı <span className="form-required">*</span>
          </label>
          <input
            id="stock"
            type="number"
            min="0"
            value={formData.stockQuantity}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                stockQuantity: parseInt(e.target.value) || 0,
              }))
            }
            className="form-input"
            placeholder="0"
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="status">
            Durum
          </label>
          <select
            id="status"
            value={formData.status}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, status: e.target.value }))
            }
            className="form-input"
          >
            <option value="active">Aktif</option>
            <option value="inactive">Pasif</option>
            <option value="draft">Taslak</option>
          </select>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="description">
          Açıklama
        </label>
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, description: e.target.value }))
          }
          rows={3}
          className="form-input"
          placeholder="Ürün açıklaması"
        />
      </div>

      <div className="modal-footer">
        <Button onClick={onCancel} variant="ghost" disabled={saving}>
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
  console.log("🚀 [COMPONENT] ProductManagement component rendered!");
  console.log("🔧 [COMPONENT] API_BASE_URL:", API_BASE_URL);

  const { showAlert } = useAlert();
  const navigate = useNavigate();
  const { id: productId } = useParams();

  // State management
  const [state, setState] = useState({
    products: [],
    loading: true,
    selectedProducts: [],
    searchValue: "",
    filters: {
      category: "",
      status: "",
      stockStatus: "",
      minPrice: "",
      maxPrice: "",
      minStock: "",
      maxStock: "",
      platform: "all",
    },
    sortField: "updatedAt",
    sortOrder: "desc",
    viewMode: "table",
    showAnalytics: false,
    syncing: false,
    importing: false,
    exporting: false,
    currentPage: 1,
    itemsPerPage: 20,
    totalPages: 1,
    totalItems: 0,
    productModal: { open: false, product: null },
    detailsModal: { open: false, product: null },
    imageModal: {
      open: false,
      imageUrl: "",
      productName: "",
      images: [],
      currentIndex: 0,
    },
    activeTab: "all",
    showBulkEditModal: false,
    recentSearches: [],
    analyticsTimeRange: "week",
  });

  // Add state for all products statistics - Enhanced with comprehensive status tracking
  const [allProductsStats, setAllProductsStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    draft: 0,
    pending: 0,
    rejected: 0,
    outOfStock: 0,
    lowStock: 0,
  });

  console.log("📊 [STATE] allProductsStats current value:", allProductsStats);

  // Update state helper
  const updateState = useCallback((updates) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  // Fetch products with enhanced parameters
  const fetchProducts = useCallback(async () => {
    updateState({ loading: true });
    try {
      const params = new URLSearchParams({
        page: state.currentPage - 1, // API uses 0-based pagination
        limit: state.itemsPerPage,
        sortBy: state.sortField,
        sortOrder: state.sortOrder.toUpperCase(),
      });

      // Add search parameter
      if (state.searchValue) params.append("search", state.searchValue);

      // Add filter parameters
      if (state.filters.category)
        params.append("category", state.filters.category);
      if (state.filters.status) params.append("status", state.filters.status);
      if (state.filters.platform && state.filters.platform !== "all")
        params.append("platform", state.filters.platform);
      if (state.filters.minPrice)
        params.append("minPrice", state.filters.minPrice);
      if (state.filters.maxPrice)
        params.append("maxPrice", state.filters.maxPrice);
      if (state.filters.minStock)
        params.append("minStock", state.filters.minStock);
      if (state.filters.maxStock)
        params.append("maxStock", state.filters.maxStock);

      const response = await api.get(
        `${API_BASE_URL}/products?${params.toString()}`
      );

      if (response.success) {
        updateState({
          products: response.data?.products || [],
          totalItems: response.data?.pagination?.totalItems || 0,
          totalPages: response.data?.pagination?.totalPages || 1,
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
    state.filters,
    state.currentPage,
    state.itemsPerPage,
    showAlert,
    updateState,
  ]);

  // Function to fetch all products statistics
  const fetchAllProductsStats = useCallback(async () => {
    try {
      console.log("🔍 Fetching product statistics...");
      console.log("📍 API_BASE_URL:", API_BASE_URL);
      console.log("🔑 Token exists:", !!localStorage.getItem("token"));

      // Try to get stats from a dedicated endpoint first
      const response = await api.get(`${API_BASE_URL}/products/stats`);
      console.log("📊 Stats API response:", response);

      if (response.success && response.data?.overview) {
        // Map server response to client format with enhanced status tracking
        const { overview } = response.data;
        console.log("📈 Overview data:", overview);

        const newStats = {
          total: overview.totalProducts || 0,
          active: overview.activeProducts || 0,
          inactive: overview.inactiveProducts || 0,
          draft: overview.draftProducts || 0,
          pending: overview.pendingProducts || 0,
          rejected: overview.rejectedProducts || 0,
          outOfStock: overview.outOfStockProducts || 0,
          lowStock: overview.lowStockProducts || 0,
        };

        console.log("🎯 Setting stats to:", newStats);
        setAllProductsStats(newStats);
        return;
      } else {
        console.log("⚠️ Stats API failed, using fallback...");
        console.log("📝 Stats response structure:", response);

        // Fallback: fetch all products without pagination to count them
        console.log("🔄 Fetching all products for counting...");
        const allProductsResponse = await api.get(
          `${API_BASE_URL}/products?limit=999999&page=0`
        );
        console.log("📦 All products response:", allProductsResponse);

        if (allProductsResponse.success) {
          const allProducts = allProductsResponse.data?.products || [];
          console.log("📊 Found products:", allProducts.length);

          // Use enhanced productUtils for comprehensive counting
          console.log("🧮 Calculating stats with productUtils...");
          const comprehensiveStats = productUtils.getStatusCounts(allProducts);
          console.log("📋 Comprehensive stats:", comprehensiveStats);

          const stats = {
            total: allProducts.length,
            active: comprehensiveStats.active,
            inactive: comprehensiveStats.inactive,
            draft: comprehensiveStats.draft,
            pending: comprehensiveStats.pending,
            rejected: comprehensiveStats.rejected,
            outOfStock: comprehensiveStats.outOfStock,
            lowStock: comprehensiveStats.lowStock,
          };

          console.log("🎯 Setting fallback stats to:", stats);
          setAllProductsStats(stats);
        } else {
          console.error("❌ Fallback API call failed:", allProductsResponse);
        }
      }
    } catch (error) {
      console.error("❌ Error fetching product statistics:", error);
      console.error("🔍 Error details:", error.message);
      console.error("📋 Error stack:", error.stack);
      // Keep current stats if fetch fails
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Fetch stats on component mount
  useEffect(() => {
    fetchAllProductsStats();
  }, [fetchAllProductsStats]);

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
      console.log("🚀 handleDeleteProduct called with productId:", productId);

      if (window.confirm("Bu ürünü silmek istediğinizden emin misiniz?")) {
        try {
          console.log("✅ User confirmed deletion, making API call...");
          const response = await api.delete(
            `${API_BASE_URL}/products/${productId}`
          );
          console.log("📡 API response:", response);

          showAlert("Ürün başarıyla silindi", "success");
          fetchProducts();
          fetchAllProductsStats(); // Refresh stats
        } catch (error) {
          console.error("❌ Delete error:", error);
          showAlert("Ürün silinirken hata oluştu: " + error.message, "error");
        }
      } else {
        console.log("❌ User cancelled deletion");
      }
    },
    [showAlert, fetchProducts, fetchAllProductsStats]
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
        fetchAllProductsStats(); // Refresh stats
      } catch (error) {
        showAlert("İşlem sırasında hata oluştu: " + error.message, "error");
      }
    },
    [
      state.productModal.product,
      showAlert,
      fetchProducts,
      updateState,
      fetchAllProductsStats,
    ]
  );

  const handleViewProduct = useCallback(
    (product) => {
      updateState({ detailsModal: { open: true, product } });
    },
    [updateState]
  );

  const handleImageClick = useCallback(
    (imageUrl, productName, product) => {
      updateState({
        imageModal: {
          open: true,
          imageUrl,
          productName,
          images: product?.images || [imageUrl],
          currentIndex: product?.images?.indexOf(imageUrl) || 0,
        },
      });
    },
    [updateState]
  );

  const handleProductNameClick = useCallback(
    (product) => {
      navigate(`/products/${product.id}/edit`);
    },
    [navigate]
  );

  // Handle productId URL parameter for direct edit navigation
  useEffect(() => {
    if (productId && state.products.length > 0) {
      console.log("Looking for product with ID:", productId);
      console.log(
        "Available products:",
        state.products.map((p) => ({ id: p.id, name: p.name }))
      );

      const product = state.products.find(
        (p) =>
          p.id === parseInt(productId) ||
          p.id === productId ||
          p.id.toString() === productId
      );
      if (product) {
        console.log("Found product:", product.name);
        handleEditProduct(product);
        // Navigate back to clean URL after opening the modal
        navigate("/products", { replace: true });
      } else {
        console.log("Product not found for ID:", productId);
        showAlert("Ürün bulunamadı", "error");
        navigate("/products");
      }
    }
  }, [productId, state.products, navigate, showAlert, handleEditProduct]);

  // Filter handling
  const handleFilterChange = useCallback(
    (filters) => {
      updateState({ filters, currentPage: 1 });
      // Trigger immediate fetch after filter change
      setTimeout(() => fetchProducts(), 0);
    },
    [updateState, fetchProducts]
  );

  const handleClearFilters = useCallback(() => {
    updateState({
      filters: {
        category: "",
        status: "",
        stockStatus: "",
        minPrice: "",
        maxPrice: "",
        minStock: "",
        maxStock: "",
        platform: "all",
      },
      currentPage: 1,
    });
    // Trigger immediate fetch after clearing filters
    setTimeout(() => fetchProducts(), 0);
  }, [updateState, fetchProducts]);

  // Pagination handling
  const handlePageChange = useCallback(
    (page) => {
      updateState({ currentPage: page });
    },
    [updateState]
  );

  const handlePageSizeChange = useCallback(
    (size) => {
      updateState({ itemsPerPage: size, currentPage: 1 });
    },
    [updateState]
  );

  // Sort handling with refetch
  const handleSort = useCallback(
    (field) => {
      const newOrder =
        state.sortField === field && state.sortOrder === "asc" ? "desc" : "asc";
      updateState({
        sortField: field,
        sortOrder: newOrder,
      });
      // fetchProducts will be called via useEffect
    },
    [state.sortField, state.sortOrder, updateState]
  );

  // Bulk operations
  const handleBulkDelete = useCallback(async () => {
    if (state.selectedProducts.length === 0) return;

    const count = state.selectedProducts.length;
    if (
      window.confirm(
        `${count} ürünü silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`
      )
    ) {
      updateState({ loading: true });

      try {
        // Process in batches for better performance
        const batchSize = 10;
        const batches = [];
        for (let i = 0; i < state.selectedProducts.length; i += batchSize) {
          batches.push(state.selectedProducts.slice(i, i + batchSize));
        }

        let processed = 0;
        for (const batch of batches) {
          await Promise.all(
            batch.map((id) => api.delete(`${API_BASE_URL}/products/${id}`))
          );
          processed += batch.length;

          // Update progress for large operations
          if (count > 20) {
            showAlert(`İlerleme: ${processed}/${count} ürün silindi`, "info");
          }
        }

        showAlert(`${count} ürün başarıyla silindi`, "success");
        updateState({ selectedProducts: [] });
        fetchProducts();
        fetchAllProductsStats(); // Refresh stats
      } catch (error) {
        showAlert(
          "Toplu silme işlemi sırasında hata oluştu: " + error.message,
          "error"
        );
      } finally {
        updateState({ loading: false });
      }
    }
  }, [
    state.selectedProducts,
    showAlert,
    updateState,
    fetchProducts,
    fetchAllProductsStats,
  ]);

  const handleBulkStatusChange = useCallback(
    async (status) => {
      if (state.selectedProducts.length === 0) return;

      const count = state.selectedProducts.length;
      updateState({ loading: true });

      try {
        // Process in batches for better performance
        const batchSize = 10;
        const batches = [];
        for (let i = 0; i < state.selectedProducts.length; i += batchSize) {
          batches.push(state.selectedProducts.slice(i, i + batchSize));
        }

        let processed = 0;
        for (const batch of batches) {
          await Promise.all(
            batch.map((id) =>
              api.put(`${API_BASE_URL}/products/${id}`, { status })
            )
          );
          processed += batch.length;

          // Update progress for large operations
          if (count > 20) {
            showAlert(
              `İlerleme: ${processed}/${count} ürün güncellendi`,
              "info"
            );
          }
        }

        showAlert(
          `${count} ürünün durumu "${status}" olarak güncellendi`,
          "success"
        );
        updateState({ selectedProducts: [] });
        fetchProducts();
        fetchAllProductsStats(); // Refresh stats
      } catch (error) {
        showAlert(
          "Toplu durum güncelleme sırasında hata oluştu: " + error.message,
          "error"
        );
      } finally {
        updateState({ loading: false });
      }
    },
    [
      state.selectedProducts,
      showAlert,
      updateState,
      fetchProducts,
      fetchAllProductsStats,
    ]
  );

  const handleBulkExport = useCallback(async () => {
    if (state.selectedProducts.length === 0) return;

    updateState({ exporting: true });
    try {
      const response = await api.post(`${API_BASE_URL}/products/export`, {
        productIds: state.selectedProducts,
        format: "csv",
      });

      if (response.success && response.data?.downloadUrl) {
        // Trigger download
        const link = document.createElement("a");
        link.href = response.data.downloadUrl;
        link.download = `products_export_${
          new Date().toISOString().split("T")[0]
        }.csv`;
        link.click();
        showAlert("Ürünler başarıyla dışa aktarıldı", "success");
      }
    } catch (error) {
      showAlert(
        "Dışa aktarma sırasında hata oluştu: " + error.message,
        "error"
      );
    } finally {
      updateState({ exporting: false });
    }
  }, [state.selectedProducts, showAlert, updateState]);

  // Import/Export functionality
  const handleImport = useCallback(
    async (file) => {
      if (!file) return;

      // Validate file type
      const allowedTypes = [
        "text/csv",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ];

      if (!allowedTypes.includes(file.type)) {
        showAlert("Sadece CSV ve Excel dosyaları desteklenir", "error");
        return;
      }

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        showAlert("Dosya boyutu 10MB'dan küçük olmalıdır", "error");
        return;
      }

      updateState({ importing: true });
      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch(`${API_BASE_URL}/products/import`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: formData,
        });

        if (response.ok) {
          const result = await response.json();
          const imported = result.data?.imported || 0;
          const failed = result.data?.failed || 0;

          if (failed > 0) {
            showAlert(
              `${imported} ürün başarıyla içe aktarıldı, ${failed} ürün başarısız oldu`,
              "warning"
            );
          } else {
            showAlert(`${imported} ürün başarıyla içe aktarıldı`, "success");
          }

          fetchProducts();
          fetchAllProductsStats();
        } else {
          const errorData = await response.json();
          throw new Error(errorData.message || "Import failed");
        }
      } catch (error) {
        showAlert(
          "İçe aktarma sırasında hata oluştu: " + error.message,
          "error"
        );
      } finally {
        updateState({ importing: false });
      }
    },
    [showAlert, updateState, fetchProducts, fetchAllProductsStats]
  );

  const handleExportAll = useCallback(async () => {
    updateState({ exporting: true });
    try {
      const response = await api.post(`${API_BASE_URL}/products/export`, {
        format: "csv",
        filters: state.filters,
      });

      if (response.success && response.data?.downloadUrl) {
        const link = document.createElement("a");
        link.href = response.data.downloadUrl;
        link.download = `all_products_export_${
          new Date().toISOString().split("T")[0]
        }.csv`;
        link.click();
        showAlert("Tüm ürünler başarıyla dışa aktarıldı", "success");
      }
    } catch (error) {
      showAlert(
        "Dışa aktarma sırasında hata oluştu: " + error.message,
        "error"
      );
    } finally {
      updateState({ exporting: false });
    }
  }, [state.filters, showAlert, updateState]);

  // Refetch when dependencies change
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Skip if user is typing in an input field
      if (
        event.target.tagName === "INPUT" ||
        event.target.tagName === "TEXTAREA"
      ) {
        return;
      }

      // Cmd/Ctrl + N: Add new product
      if ((event.metaKey || event.ctrlKey) && event.key === "n") {
        event.preventDefault();
        handleAddProduct();
      }

      // Cmd/Ctrl + R: Refresh products
      if ((event.metaKey || event.ctrlKey) && event.key === "r") {
        event.preventDefault();
        fetchProducts();
      }

      // Delete key: Delete selected products (with confirmation)
      if (event.key === "Delete" && state.selectedProducts.length > 0) {
        event.preventDefault();
        handleBulkDelete();
      }

      // Escape: Clear selection and close modals
      if (event.key === "Escape") {
        updateState({
          selectedProducts: [],
          productModal: { open: false, product: null },
          detailsModal: { open: false, product: null },
        });
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [
    handleAddProduct,
    fetchProducts,
    handleBulkDelete,
    state.selectedProducts.length,
    updateState,
  ]);

  // Status counts for tabs - Enhanced with global stats from all products
  const statusCounts = useMemo(() => {
    // Use global stats for all tab counts to ensure consistency
    // Tab counts should reflect total counts across all products, not just current page
    console.log(
      "🔢 Computing statusCounts with allProductsStats:",
      allProductsStats
    );

    const counts = {
      all: allProductsStats.total,
      active: allProductsStats.active,
      inactive: allProductsStats.inactive,
      draft: allProductsStats.draft,
      pending: allProductsStats.pending,
      rejected: allProductsStats.rejected,
      outOfStock: allProductsStats.outOfStock,
      lowStock: allProductsStats.lowStock,
    };

    console.log("📊 Final statusCounts:", counts);
    return counts;
  }, [allProductsStats]);

  // File input handler for import
  const handleFileImport = useCallback(
    (event) => {
      const file = event.target.files[0];
      if (file) {
        handleImport(file);
        // Reset the input
        event.target.value = "";
      }
    },
    [handleImport]
  );

  // Variant management handlers
  const handleAcceptVariantSuggestion = useCallback(
    async (suggestion) => {
      console.log("🎯 Accept variant suggestion clicked:", suggestion);
      try {
        // Create variant group from suggestion
        const groupData = {
          groupName: `${suggestion.products[0].name} Grubu`,
          baseProduct: suggestion.products[0],
          variants: suggestion.products.slice(1),
          confidence: suggestion.confidence,
          reason: suggestion.reason,
        };

        console.log("📝 Creating variant group:", groupData);

        // Call API to create variant group
        const response = await api.post(
          `${API_BASE_URL}/products/variants/groups`,
          groupData
        );

        if (response.success) {
          showAlert("Varyant grubu başarıyla oluşturuldu", "success");
          fetchProducts(); // Refresh the product list
        } else {
          throw new Error(response.message || "Varyant grubu oluşturulamadı");
        }
      } catch (error) {
        console.error("❌ Error accepting variant suggestion:", error);
        showAlert(
          "Varyant önerisi kabul edilirken hata oluştu: " + error.message,
          "error"
        );
      }
    },
    [showAlert, fetchProducts]
  );

  const handleRejectVariantSuggestion = useCallback(
    async (suggestion) => {
      try {
        // Log rejection for future improvements
        await api.post(`${API_BASE_URL}/products/variants/suggestions/reject`, {
          suggestionId: suggestion.id,
          products: suggestion.products,
          reason: "user_rejected",
        });

        showAlert("Varyant önerisi reddedildi", "info");
        // Note: We don't need to refresh products as this is just a suggestion rejection
      } catch (error) {
        console.error("Error rejecting variant suggestion:", error);
        // Don't show error to user as rejection should always work
        showAlert("Varyant önerisi reddedildi", "info");
      }
    },
    [showAlert]
  );

  const handleCreateVariantGroup = useCallback(
    async (groupData) => {
      try {
        const response = await api.post(
          `${API_BASE_URL}/products/variants/groups`,
          groupData
        );

        if (response.success) {
          showAlert("Varyant grubu başarıyla oluşturuldu", "success");
          fetchProducts();
        } else {
          throw new Error(response.message || "Varyant grubu oluşturulamadı");
        }
      } catch (error) {
        console.error("Error creating variant group:", error);
        showAlert(
          "Varyant grubu oluşturulurken hata oluştu: " + error.message,
          "error"
        );
      }
    },
    [showAlert, fetchProducts]
  );

  const handleUpdateVariantGroup = useCallback(
    async (groupData) => {
      try {
        const response = await api.put(
          `${API_BASE_URL}/products/variants/groups/${groupData.id}`,
          groupData
        );

        if (response.success) {
          showAlert("Varyant grubu başarıyla güncellendi", "success");
          fetchProducts();
        } else {
          throw new Error(response.message || "Varyant grubu güncellenemedi");
        }
      } catch (error) {
        console.error("Error updating variant group:", error);
        showAlert(
          "Varyant grubu güncellenirken hata oluştu: " + error.message,
          "error"
        );
      }
    },
    [showAlert, fetchProducts]
  );

  const handleDeleteVariantGroup = useCallback(
    async (product) => {
      try {
        const response = await api.delete(
          `${API_BASE_URL}/products/variants/groups/${product.variantGroupId}`
        );

        if (response.success) {
          showAlert("Varyant grubu başarıyla silindi", "success");
          fetchProducts();
        } else {
          throw new Error(response.message || "Varyant grubu silinemedi");
        }
      } catch (error) {
        console.error("Error deleting variant group:", error);
        showAlert(
          "Varyant grubu silinirken hata oluştu: " + error.message,
          "error"
        );
      }
    },
    [showAlert, fetchProducts]
  );

  const handleInlineEdit = useCallback(
    async (productId, field, value, isVariant = false) => {
      try {
        const endpoint = isVariant
          ? `${API_BASE_URL}/products/variants/${productId}`
          : `${API_BASE_URL}/products/${productId}`;

        const updateData = { [field]: value };
        const response = await api.put(endpoint, updateData);

        if (response.success) {
          showAlert(`${field} başarıyla güncellendi`, "success");
          fetchProducts();
        } else {
          throw new Error(response.message || "Güncelleme başarısız");
        }
      } catch (error) {
        console.error("Error in inline edit:", error);
        showAlert(
          "Güncelleme sırasında hata oluştu: " + error.message,
          "error"
        );
      }
    },
    [showAlert, fetchProducts]
  );

  // Tab change handler - Enhanced for comprehensive status filtering
  const handleTabChange = useCallback(
    (tab) => {
      let newFilters = { ...state.filters };

      // Clear previous tab filters
      delete newFilters.status;
      delete newFilters.stockStatus;
      delete newFilters.approvalStatus;
      delete newFilters.maxStock;
      delete newFilters.minStock;

      // Apply new tab filter based on enhanced status system
      switch (tab) {
        case "active":
          newFilters.status = "active";
          break;
        case "inactive":
          newFilters.status = "inactive";
          break;
        case "draft":
          newFilters.status = "draft";
          break;
        case "pending":
          // Filter for approval pending status
          newFilters.status = "pending";
          break;
        case "rejected":
          newFilters.approvalStatus = "rejected";
          break;
        case "out_of_stock":
          newFilters.maxStock = "0"; // Filter for products with 0 stock
          break;
        case "low_stock":
          newFilters.stockStatus = "low_stock";
          break;
        case "all":
        default:
          // "all" tab doesn't add any filters
          break;
      }

      updateState({
        activeTab: tab,
        currentPage: 1,
        filters: newFilters,
      });

      // Trigger immediate fetch after tab change
      setTimeout(() => fetchProducts(), 0);
    },
    [updateState, state.filters, fetchProducts]
  );

  // Search handling
  const handleSearch = useCallback(
    (searchValue) => {
      updateState({ searchValue, currentPage: 1 });
      // fetchProducts will be called via useEffect dependency
    },
    [updateState]
  );

  return (
    <>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header Section - Enhanced like Orders */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Package className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      Ürün Yönetimi
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Tüm platform ürünlerinizi tek yerden yönetin
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Button
                    onClick={handleSync}
                    variant="outline"
                    disabled={state.syncing}
                    className="flex items-center space-x-2"
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${
                        state.syncing ? "animate-spin" : ""
                      }`}
                    />
                    <span>
                      {state.syncing
                        ? "Senkronize Ediliyor..."
                        : "Senkronize Et"}
                    </span>
                  </Button>

                  <Button
                    onClick={handleExportAll}
                    variant="outline"
                    className="flex items-center space-x-2"
                    disabled={state.exporting}
                  >
                    <Download className="h-4 w-4" />
                    <span>
                      {state.exporting ? "Dışa Aktarılıyor..." : "Dışa Aktar"}
                    </span>
                  </Button>

                  <div className="relative">
                    <input
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileImport}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={state.importing}
                    />
                    <Button
                      variant="outline"
                      disabled={state.importing}
                      className="flex items-center space-x-2"
                    >
                      <Upload className="h-4 w-4" />
                      <span>
                        {state.importing ? "İçe Aktarılıyor..." : "İçe Aktar"}
                      </span>
                    </Button>
                  </div>

                  <Button
                    onClick={handleAddProduct}
                    variant="primary"
                    className="flex items-center space-x-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Yeni Ürün</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards Section - Enhanced like Orders */}
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-4">
                <div className="flex items-center">
                  <Package className="h-8 w-8 text-blue-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Toplam Ürün
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {allProductsStats.total}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-4">
                <div className="flex items-center">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Aktif Ürün
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {allProductsStats.active}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-4">
                <div className="flex items-center">
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Stokta Yok
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {allProductsStats.outOfStock}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-4">
                <div className="flex items-center">
                  <TrendingDown className="h-8 w-8 text-yellow-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Düşük Stok
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {allProductsStats.lowStock}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Search and Filters Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
            <div className="p-4">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                <div className="flex-1 mr-4">
                  <AdvancedSearchPanel
                    searchValue={state.searchValue}
                    filters={state.filters}
                    onFilterChange={handleFilterChange}
                    onClearFilters={handleClearFilters}
                    categories={CATEGORIES}
                    onSearch={handleSearch}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {state.products.length} / {state.totalItems} ürün
                  </span>
                  {state.selectedProducts.length > 0 && (
                    <Button
                      onClick={() => updateState({ showBulkEditModal: true })}
                      variant="primary"
                      size="sm"
                      className="flex items-center space-x-2"
                    >
                      <Edit className="h-4 w-4" />
                      <span>
                        Toplu Düzenle ({state.selectedProducts.length})
                      </span>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
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
              onImageClick={handleImageClick}
              onProductNameClick={handleProductNameClick}
              onAddProduct={handleAddProduct}
              onSync={handleSync}
              sortField={state.sortField}
              sortOrder={state.sortOrder}
              onSort={handleSort}
              productQuota={{
                current: state.products.length,
                max: 75000,
                level: 2,
              }}
              statusCounts={statusCounts}
              filters={state.filters}
              onFilterChange={handleFilterChange}
              onClearFilters={handleClearFilters}
              activeTab={state.activeTab}
              onTabChange={handleTabChange}
              categories={CATEGORIES}
              brands={[]}
              onViewModeChange={(mode) => updateState({ viewMode: mode })}
              // Pagination props
              currentPage={state.currentPage}
              totalPages={state.totalPages}
              totalItems={state.totalItems}
              itemsPerPage={state.itemsPerPage}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
              // Bulk operations
              onBulkDelete={handleBulkDelete}
              onBulkStatusChange={handleBulkStatusChange}
              onBulkExport={handleBulkExport}
              onBulkEdit={() => updateState({ showBulkEditModal: true })}
              // Import/Export
              onImport={handleImport}
              onExportAll={handleExportAll}
              // Loading states
              importing={state.importing}
              exporting={state.exporting}
              // Variant management props
              enableVariantManagement={true}
              onCreateVariantGroup={handleCreateVariantGroup}
              onUpdateVariantGroup={handleUpdateVariantGroup}
              onDeleteVariantGroup={handleDeleteVariantGroup}
              onAcceptVariantSuggestion={handleAcceptVariantSuggestion}
              onRejectVariantSuggestion={handleRejectVariantSuggestion}
              onInlineEdit={handleInlineEdit}
              // Analytics
              onToggleAnalytics={() =>
                updateState({ showAnalytics: !state.showAnalytics })
              }
            />
          </div>
        </div>

        {/* Modals */}
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
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="section">
                  <div className="section-header">
                    <h4 className="section-title text-base">Temel Bilgiler</h4>
                  </div>
                  <div className="section-content space-y-3">
                    <div className="flex justify-between">
                      <span className="font-medium">Ad:</span>
                      <span>{state.detailsModal.product.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">SKU:</span>
                      <span className="font-mono text-sm">
                        {state.detailsModal.product.sku}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Kategori:</span>
                      <span>{state.detailsModal.product.category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Fiyat:</span>
                      <div className="currency-display">
                        <span className="currency-amount">
                          {state.detailsModal.product.price}
                        </span>
                        <span className="currency-code">TRY</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="section">
                  <div className="section-header">
                    <h4 className="section-title text-base">Stok Bilgileri</h4>
                  </div>
                  <div className="section-content space-y-3">
                    <div className="flex justify-between">
                      <span className="font-medium">Stok:</span>
                      <span>{state.detailsModal.product.stockQuantity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Durum:</span>
                      <span
                        className={`badge badge-${
                          state.detailsModal.product.status === "active"
                            ? "success"
                            : state.detailsModal.product.status === "inactive"
                            ? "danger"
                            : "warning"
                        }`}
                      >
                        {state.detailsModal.product.status === "active"
                          ? "Aktif"
                          : state.detailsModal.product.status === "inactive"
                          ? "Pasif"
                          : "Taslak"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              {state.detailsModal.product.description && (
                <div className="section">
                  <div className="section-header">
                    <h4 className="section-title text-base">Açıklama</h4>
                  </div>
                  <div className="section-content">
                    <p className="text-gray-600 dark:text-gray-400">
                      {state.detailsModal.product.description}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </Modal>

        {/* File import input (hidden) */}
        <input
          type="file"
          accept=".csv, .xlsx"
          onChange={handleFileImport}
          className="hidden"
          id="file-import"
        />

        {/* Image Preview Modal */}
        <ImagePreviewModal
          isOpen={state.imageModal.open}
          onClose={() =>
            updateState({
              imageModal: {
                open: false,
                imageUrl: "",
                productName: "",
                images: [],
                currentIndex: 0,
              },
            })
          }
          imageUrl={state.imageModal.imageUrl}
          productName={state.imageModal.productName}
          images={state.imageModal.images}
          currentIndex={state.imageModal.currentIndex}
        />

        {/* Bulk Edit Modal */}
        <BulkEditModal
          isOpen={state.showBulkEditModal}
          onClose={() => updateState({ showBulkEditModal: false })}
          selectedProducts={state.selectedProducts}
          products={state.products}
          onSave={async (selectedProducts, updateData) => {
            updateState({ loading: true });
            try {
              // Process bulk updates
              await Promise.all(
                selectedProducts.map((id) => {
                  const data = {};

                  // Handle price updates
                  if (updateData.price) {
                    if (updateData.price.operation === "set") {
                      data.price = updateData.price.value;
                    } else {
                      const product = state.products.find((p) => p.id === id);
                      const currentPrice = product?.price || 0;
                      const percentage = updateData.price.value / 100;

                      if (updateData.price.operation === "increase") {
                        data.price = currentPrice * (1 + percentage);
                      } else {
                        data.price = currentPrice * (1 - percentage);
                      }
                    }
                  }

                  // Handle status updates
                  if (updateData.status) {
                    data.status = updateData.status;
                  }

                  // Handle category updates
                  if (updateData.category) {
                    data.category = updateData.category;
                  }

                  // Handle stock updates
                  if (updateData.stock) {
                    if (updateData.stock.operation === "set") {
                      data.stockQuantity = updateData.stock.value;
                    } else {
                      const product = state.products.find((p) => p.id === id);
                      const currentStock = product?.stockQuantity || 0;

                      if (updateData.stock.operation === "increase") {
                        data.stockQuantity =
                          currentStock + updateData.stock.value;
                      } else {
                        data.stockQuantity = Math.max(
                          0,
                          currentStock - updateData.stock.value
                        );
                      }
                    }
                  }

                  return api.put(`${API_BASE_URL}/products/${id}`, data);
                })
              );

              showAlert(
                `${selectedProducts.length} ürün başarıyla güncellendi`,
                "success"
              );
              fetchProducts();
              fetchAllProductsStats();
            } catch (error) {
              showAlert(
                "Toplu güncelleme sırasında hata oluştu: " + error.message,
                "error"
              );
            } finally {
              updateState({ loading: false, showBulkEditModal: false });
            }
          }}
        />

        {/* Enhanced Product Analytics */}
        <EnhancedProductAnalytics
          isOpen={state.showAnalytics}
          onClose={() => updateState({ showAnalytics: false })}
          timeRange={state.analyticsTimeRange}
          onTimeRangeChange={(range) =>
            updateState({ analyticsTimeRange: range })
          }
          productId={state.detailsModal.product?.id}
        />
      </div>
    </>
  );
};

export default ProductManagement;
