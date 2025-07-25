import React, { useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Plus,
  RefreshCw,
  Package,
  CheckCircle,
  AlertTriangle,
  TrendingDown,
  Download,
  Upload,
} from "lucide-react";

// Context and hooks
import { useAlert } from "../../contexts/AlertContext";
import { useProductState } from "./hooks/useProductState";
import { useProductAPI } from "./hooks/useProductAPI";
import { useProductPerformance } from "./hooks/useProductPerformance";

// Services
// import variantDetectionAPI from "../../services/variantDetectionAPI"; // Removed: variant detection no longer supported

// UI Components
import { Button, Modal } from "../ui";
import ProductDisplay from "./components/ProductDisplay";
import { ImagePreviewModal } from "./components/ProductModals";
import ProductAnalytics from "./components/ProductAnalytics";
import BulkEditModal from "./components/BulkEditModal";
import SearchPanel from "./components/SearchPanel";
import PlatformVariantModal from "./components/PlatformVariantModal";
import ExportModal from "./components/ExportModal";
import ProductManagementErrorBoundary, {
  ErrorDisplay,
  useErrorHandler,
} from "./components/ErrorBoundary";

// Utils and constants
import { CATEGORIES } from "./utils/constants";
import "./ProductManagement.css";

/**
 * Enhanced Product Form Component - Matches Platform Sync Service Fields
 */
const ProductForm = React.memo(({ product, onSave, onCancel }) => {
  const [formData, setFormData] = React.useState({
    // Basic product info
    name: product?.name || "",
    sku: product?.sku || "",
    barcode: product?.barcode || "",
    description: product?.description || "",
    
    // Categorization & Brand
    category: product?.category || "",
    brand: product?.brand || "",
    manufacturer: product?.manufacturer || "",
    
    // Pricing
    price: product?.price || 0,
    costPrice: product?.costPrice || 0,
    basePrice: product?.basePrice || product?.price || 0,
    
    // Stock management
    stockQuantity: product?.stockQuantity || 0,
    minStockLevel: product?.minStockLevel || 0,
    
    // Physical attributes
    weight: product?.weight || "",
    dimensions: product?.dimensions || { length: "", width: "", height: "" },
    
    // Product status
    status: product?.status || "active",
    
    // Media & Images
    images: product?.images || [],
    
    // Additional attributes
    tags: product?.tags || [],
    vatRate: product?.vatRate || 18,
    
    // Platform sync fields
    attributes: product?.attributes || {},
  });

  const [saving, setSaving] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("basic");

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Enhanced validation
    if (!formData.name.trim() || !formData.sku.trim() || !formData.category) {
      return;
    }

    setSaving(true);
    try {
      // Clean data before sending
      const cleanData = {
        ...formData,
        price: parseFloat(formData.price) || 0,
        costPrice: parseFloat(formData.costPrice) || 0,
        basePrice: parseFloat(formData.basePrice) || 0,
        stockQuantity: parseInt(formData.stockQuantity) || 0,
        minStockLevel: parseInt(formData.minStockLevel) || 0,
        weight: parseFloat(formData.weight) || null,
        vatRate: parseFloat(formData.vatRate) || 18,
        dimensions: formData.dimensions.length && formData.dimensions.width && formData.dimensions.height 
          ? formData.dimensions 
          : null,
      };
      
      await onSave(cleanData);
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleDimensionChange = useCallback((dimension, value) => {
    setFormData((prev) => ({
      ...prev,
      dimensions: {
        ...prev.dimensions,
        [dimension]: value
      }
    }));
  }, []);

  const tabs = [
    { id: "basic", label: "Temel Bilgiler", icon: "📦" },
    { id: "pricing", label: "Fiyat & Stok", icon: "💰" },
    { id: "details", label: "Detaylar", icon: "📋" },
    { id: "platforms", label: "Platform Ayarları", icon: "🌐" },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Basic Information Tab */}
      {activeTab === "basic" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="form-group">
            <label className="form-label" htmlFor="name">
              Ürün Adı <span className="form-required">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
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
              onChange={(e) => handleInputChange("sku", e.target.value)}
              className="form-input"
              placeholder="Ürün kodunu girin"
              required
              disabled={!!product} // SKU shouldn't be editable for existing products
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="barcode">
              Barkod
            </label>
            <input
              id="barcode"
              type="text"
              value={formData.barcode}
              onChange={(e) => handleInputChange("barcode", e.target.value)}
              className="form-input"
              placeholder="Ürün barkodu"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="category">
              Kategori <span className="form-required">*</span>
            </label>
            <select
              id="category"
              value={formData.category}
              onChange={(e) => handleInputChange("category", e.target.value)}
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
            <label className="form-label" htmlFor="brand">
              Marka
            </label>
            <input
              id="brand"
              type="text"
              value={formData.brand}
              onChange={(e) => handleInputChange("brand", e.target.value)}
              className="form-input"
              placeholder="Ürün markası"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="manufacturer">
              Üretici
            </label>
            <input
              id="manufacturer"
              type="text"
              value={formData.manufacturer}
              onChange={(e) => handleInputChange("manufacturer", e.target.value)}
              className="form-input"
              placeholder="Ürün üreticisi"
            />
          </div>

          <div className="form-group md:col-span-2">
            <label className="form-label" htmlFor="description">
              Açıklama
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              rows={4}
              className="form-input"
              placeholder="Ürün açıklaması"
            />
          </div>
        </div>
      )}

      {/* Pricing & Stock Tab */}
      {activeTab === "pricing" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="form-group">
            <label className="form-label" htmlFor="price">
              Satış Fiyatı (₺) <span className="form-required">*</span>
            </label>
            <input
              id="price"
              type="number"
              step="0.01"
              min="0"
              value={formData.price}
              onChange={(e) =>
                handleInputChange("price", parseFloat(e.target.value) || 0)
              }
              className="form-input"
              placeholder="0.00"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="costPrice">
              Alış Fiyatı (₺)
            </label>
            <input
              id="costPrice"
              type="number"
              step="0.01"
              min="0"
              value={formData.costPrice}
              onChange={(e) =>
                handleInputChange("costPrice", parseFloat(e.target.value) || 0)
              }
              className="form-input"
              placeholder="0.00"
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
                handleInputChange("stockQuantity", parseInt(e.target.value) || 0)
              }
              className="form-input"
              placeholder="0"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="minStock">
              Minimum Stok Seviyesi
            </label>
            <input
              id="minStock"
              type="number"
              min="0"
              value={formData.minStockLevel}
              onChange={(e) =>
                handleInputChange("minStockLevel", parseInt(e.target.value) || 0)
              }
              className="form-input"
              placeholder="0"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="vatRate">
              KDV Oranı (%)
            </label>
            <input
              id="vatRate"
              type="number"
              min="0"
              max="100"
              value={formData.vatRate}
              onChange={(e) =>
                handleInputChange("vatRate", parseFloat(e.target.value) || 18)
              }
              className="form-input"
              placeholder="18"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="status">
              Durum
            </label>
            <select
              id="status"
              value={formData.status}
              onChange={(e) => handleInputChange("status", e.target.value)}
              className="form-input"
            >
              <option value="active">Aktif</option>
              <option value="inactive">Pasif</option>
              <option value="draft">Taslak</option>
            </select>
          </div>
        </div>
      )}

      {/* Details Tab */}
      {activeTab === "details" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="form-group">
            <label className="form-label" htmlFor="weight">
              Ağırlık (gr)
            </label>
            <input
              id="weight"
              type="number"
              min="0"
              step="0.1"
              value={formData.weight}
              onChange={(e) => handleInputChange("weight", e.target.value)}
              className="form-input"
              placeholder="0"
            />
          </div>

          <div className="form-group md:col-span-2">
            <label className="form-label">Boyutlar (cm)</label>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="number"
                placeholder="Uzunluk"
                value={formData.dimensions?.length || ""}
                onChange={(e) => handleDimensionChange("length", e.target.value)}
                className="form-input"
                min="0"
                step="0.1"
              />
              <input
                type="number"
                placeholder="Genişlik"
                value={formData.dimensions?.width || ""}
                onChange={(e) => handleDimensionChange("width", e.target.value)}
                className="form-input"
                min="0"
                step="0.1"
              />
              <input
                type="number"
                placeholder="Yükseklik"
                value={formData.dimensions?.height || ""}
                onChange={(e) => handleDimensionChange("height", e.target.value)}
                className="form-input"
                min="0"
                step="0.1"
              />
            </div>
          </div>
        </div>
      )}

      {/* Platform Settings Tab */}
      {activeTab === "platforms" && (
        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
              Platform Senkronizasyon Ayarları
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Bu ayarlar ürünün e-ticaret platformlarıyla nasıl senkronize edileceğini belirler.
            </p>
          </div>

          <div className="form-group">
            <label className="form-label">Platform Özellikleri</label>
            <div className="space-y-2">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="autoSync"
                  className="form-checkbox"
                  defaultChecked
                />
                <label htmlFor="autoSync" className="ml-2 text-sm">
                  Otomatik platform senkronizasyonu
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="stockSync"
                  className="form-checkbox"
                  defaultChecked
                />
                <label htmlFor="stockSync" className="ml-2 text-sm">
                  Stok seviyesi senkronizasyonu
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Form Actions */}
      <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={saving}
        >
          İptal
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={saving}
        >
          {saving && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
          {product ? "Güncelle" : "Kaydet"}
        </Button>
      </div>
    </form>
  );
});

ProductForm.displayName = "ProductForm";

/**
 * Main Optimized Product Management Component
 */
const ProductManagement = () => {
  const { showAlert } = useAlert();
  const navigate = useNavigate();
  const { id: productId } = useParams();

  // Custom hooks for state management
  const { state, actions, selectors } = useProductState();
  const { error, handleError, resetError } = useErrorHandler();

  // API operations
  const {
    fetchProducts,
    fetchProductStats,
    createProduct,
    updateProduct,
    deleteProduct,
    bulkUpdateProducts,
    bulkDeleteProducts,
    syncProducts,
    importProducts,
    exportProducts,
    cleanup,
  } = useProductAPI(actions.updateMultiple, showAlert, handleError);

  // Performance optimizations
  const { debouncedSearch, handleSelectProduct, handleSelectAll, batchUpdate } =
    useProductPerformance(state, actions, showAlert);

  // Memoized values
  const statusCounts = useMemo(() => selectors.getStatusCounts(), [selectors]);
  const activeFiltersCount = useMemo(
    () => selectors.getActiveFiltersCount(),
    [selectors]
  );

  // Effect for initial data loading
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Load products and stats in parallel
        await Promise.all([
          fetchProducts({
            page: state.currentPage,
            limit: state.itemsPerPage,
            sortField: state.sortField,
            sortOrder: state.sortOrder,
            filters: state.filters,
            search: state.searchValue,
          }),
          fetchProductStats().then((stats) => actions.setProductStats(stats)),
        ]);
      } catch (error) {
        handleError(error, " - Initial load");
      }
    };

    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Effect for data refetch when dependencies change
  useEffect(() => {
    if (!state.loading) {
      fetchProducts({
        page: state.currentPage,
        limit: state.itemsPerPage,
        sortField: state.sortField,
        sortOrder: state.sortOrder,
        filters: state.filters,
        search: state.searchValue,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    state.currentPage,
    state.itemsPerPage,
    state.sortField,
    state.sortOrder,
    state.filters,
    state.searchValue,
  ]);

  // Product URL parameter handling
  useEffect(() => {
    if (productId && state?.products?.length > 0 && !state.loading) {
      const product = state?.products?.find((p) => p.id === productId);
      if (product) {
        actions.setModals({ productModal: { open: true, product } });
      } else {
        showAlert("Ürün bulunamadı", "error");
        navigate("/products");
      }
    }
  }, [productId, state.products, state.loading, navigate, showAlert, actions]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // Event handlers
  const handleSync = useCallback(async () => {
    try {
      actions.setBulkState({ syncing: true });
      await syncProducts();
      await fetchProducts();
      await fetchProductStats().then((stats) => actions.setProductStats(stats));
    } catch (error) {
      handleError(error, " - Sync");
    } finally {
      actions.setBulkState({ syncing: false });
    }
  }, [actions, syncProducts, fetchProducts, fetchProductStats, handleError]);

  const handleAddProduct = useCallback(() => {
    actions.setModals({ productModal: { open: true, product: null } });
  }, [actions]);

  const handleEditProduct = useCallback(
    (product) => {
      actions.setModals({ productModal: { open: true, product } });
    },
    [actions]
  );

  const handleDeleteProduct = useCallback(
    async (productId) => {
      if (!window.confirm("Bu ürünü silmek istediğinizden emin misiniz?")) {
        return;
      }

      try {
        await deleteProduct(productId);
        await fetchProducts();
        await fetchProductStats().then((stats) =>
          actions.setProductStats(stats)
        );
      } catch (error) {
        handleError(error, " - Delete product");
      }
    },
    [deleteProduct, fetchProducts, fetchProductStats, actions, handleError]
  );

  const handleSaveProduct = useCallback(
    async (productData) => {
      try {
        const isEditing = !!state.productModal.product;

        if (isEditing) {
          await updateProduct(state.productModal.product.id, productData);
        } else {
          await createProduct(productData);
        }

        actions.setModals({ productModal: { open: false, product: null } });
        await fetchProducts();
        await fetchProductStats().then((stats) =>
          actions.setProductStats(stats)
        );
      } catch (error) {
        handleError(error, " - Save product");
      }
    },
    [
      state.productModal.product,
      updateProduct,
      createProduct,
      actions,
      fetchProducts,
      fetchProductStats,
      handleError,
    ]
  );

  const handleViewProduct = useCallback(
    (product) => {
      navigate(`/products/${product.id}`);
    },
    [navigate]
  );

  const handleImageClick = useCallback(
    (imageUrl, productName, product) => {
      const images = product.images || [imageUrl];
      const currentIndex = images.findIndex((img) => img === imageUrl);

      actions.setModals({
        imageModal: {
          open: true,
          imageUrl,
          productName,
          images,
          currentIndex: Math.max(0, currentIndex),
        },
      });
    },
    [actions]
  );

  const handleProductNameClick = useCallback(
    (product) => {
      navigate(`/products/${product.id}`);
    },
    [navigate]
  );

  const handleCreateVariant = useCallback(
    (product) => {
      actions.setModals({
        platformVariantModal: { open: true, product },
      });
    },
    [actions]
  );

  // Filter and search handlers
  const handleFilterChange = useCallback(
    (filters) => {
      actions.setFilters(filters);
    },
    [actions]
  );

  const handleClearFilters = useCallback(() => {
    actions.resetFilters();
  }, [actions]);

  const handleSearch = useCallback(
    (searchValue) => {
      debouncedSearch(searchValue);
    },
    [debouncedSearch]
  );

  // Pagination handlers
  const handlePageChange = useCallback(
    (page) => {
      actions.setPagination({ page });
    },
    [actions]
  );

  const handlePageSizeChange = useCallback(
    (itemsPerPage) => {
      actions.setPagination({ itemsPerPage, page: 1 });
    },
    [actions]
  );

  // Sort handler
  const handleSort = useCallback(
    (field) => {
      const newOrder =
        state.sortField === field && state.sortOrder === "asc" ? "desc" : "asc";
      actions.setSort(field, newOrder);
    },
    [state.sortField, state.sortOrder, actions]
  );

  // Bulk operations
  const handleBulkDelete = useCallback(async () => {
    if (state.selectedProducts.length === 0) return;

    if (
      !window.confirm(
        `${state.selectedProducts.length} ürünü silmek istediğinizden emin misiniz?`
      )
    ) {
      return;
    }

    try {
      await bulkDeleteProducts(state.selectedProducts);
      actions.setSelectedProducts([]);
      await fetchProducts();
      await fetchProductStats().then((stats) => actions.setProductStats(stats));
    } catch (error) {
      handleError(error, " - Bulk delete");
    }
  }, [
    state.selectedProducts,
    bulkDeleteProducts,
    actions,
    fetchProducts,
    fetchProductStats,
    handleError,
  ]);

  const handleBulkStatusChange = useCallback(
    async (status) => {
      if (state.selectedProducts.length === 0) return;

      try {
        await bulkUpdateProducts(state.selectedProducts, { status });
        actions.setSelectedProducts([]);
        await fetchProducts();
        await fetchProductStats().then((stats) =>
          actions.setProductStats(stats)
        );
      } catch (error) {
        handleError(error, " - Bulk status change");
      }
    },
    [
      state.selectedProducts,
      bulkUpdateProducts,
      actions,
      fetchProducts,
      fetchProductStats,
      handleError,
    ]
  );

  const handleBulkExport = useCallback(async () => {
    if (state.selectedProducts.length === 0) return;
    actions.updateState({ showExportModal: true });
  }, [state.selectedProducts, actions]);

  // Handle export with options from modal
  const handleExportWithOptions = useCallback(
    async (exportOptions) => {
      try {
        actions.setBulkState({ exporting: true });
        actions.updateState({ showExportModal: false });

        let filters = { ...state.filters };

        // If exporting selected products
        if (
          exportOptions.type === "selected" &&
          state.selectedProducts.length > 0
        ) {
          filters = { productIds: state.selectedProducts };
        }

        await exportProducts(filters, exportOptions);
        showAlert("Products exported successfully!", "success");
      } catch (error) {
        handleError(error, " - Export products");
      } finally {
        actions.setBulkState({ exporting: false });
      }
    },
    [
      exportProducts,
      state.filters,
      state.selectedProducts,
      actions,
      handleError,
      showAlert,
    ]
  );

  // Import/Export handlers
  const handleImport = useCallback(
    async (file) => {
      // Validate file type
      const allowedTypes = [
        "text/csv",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ];

      if (!allowedTypes.includes(file.type)) {
        showAlert("Sadece CSV ve Excel dosyaları desteklenmektedir", "error");
        return;
      }

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        showAlert("Dosya boyutu 10MB'dan büyük olamaz", "error");
        return;
      }

      try {
        actions.setBulkState({ importing: true });
        await importProducts(file);
        await fetchProducts();
        await fetchProductStats().then((stats) =>
          actions.setProductStats(stats)
        );
      } catch (error) {
        handleError(error, " - Import");
      } finally {
        actions.setBulkState({ importing: false });
      }
    },
    [
      importProducts,
      actions,
      fetchProducts,
      fetchProductStats,
      showAlert,
      handleError,
    ]
  );

  const handleExportAll = useCallback(async () => {
    actions.updateState({ showExportModal: true });
  }, [actions]);

  // Tab change handler
  const handleTabChange = useCallback(
    (tab) => {
      let newFilters = { ...state.filters };

      // Clear previous tab filters
      delete newFilters.status;
      delete newFilters.stockStatus;

      // Apply new tab filter
      switch (tab) {
        case "draft":
          newFilters.stockStatus = "draft";
          break;
        case "pending":
          newFilters.stockStatus = "pending";
          break;
        case "rejected":
          newFilters.stockStatus = "rejected";
          break;
        case "out_of_stock":
          newFilters.stockStatus = "out_of_stock";
          break;
        case "low_stock":
          newFilters.stockStatus = "low_stock";
          break;
        case "in_stock":
          newFilters.stockStatus = "in_stock";
          break;
        case "pasif":
          newFilters.stockStatus = "pasif";
          break;
        case "aktif":
          newFilters.stockStatus = "aktif";
          break;
        default:
          // 'all' tab doesn't add filters
          break;
      }

      batchUpdate([
        { activeTab: tab },
        { filters: newFilters },
        { currentPage: 1 },
      ]);
    },
    [state.filters, batchUpdate]
  );

  // File input handler
  const handleFileImport = useCallback(
    (event) => {
      const file = event.target.files[0];
      if (file) {
        handleImport(file);
        event.target.value = ""; // Reset input
      }
    },
    [handleImport]
  );

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <ErrorDisplay
          error={error.error}
          onRetry={resetError}
          className="max-w-2xl mx-auto mt-8"
          size="lg"
        />
      </div>
    );
  }

  return (
    <ProductManagementErrorBoundary>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header Section */}
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
                    aria-label="Ürünleri senkronize et"
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
                    aria-label="Tüm ürünleri dışa aktar"
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
                      aria-label="Ürün dosyası seç"
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
                    aria-label="Yeni ürün ekle"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Yeni Ürün</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards Section */}
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div
                className="p-4"
                role="region"
                aria-label="Toplam ürün sayısı"
              >
                <div className="flex items-center">
                  <Package className="h-8 w-8 text-blue-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Toplam Ürün
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {state?.allProductsStats?.total || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-4" role="region" aria-label="Aktif ürün sayısı">
                <div className="flex items-center">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Aktif Ürün
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {state?.allProductsStats?.active || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div
                className="p-4"
                role="region"
                aria-label="Stokta olmayan ürün sayısı"
              >
                <div className="flex items-center">
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Stokta Yok
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {state?.allProductsStats?.outOfStock || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div
                className="p-4"
                role="region"
                aria-label="Düşük stoklu ürün sayısı"
              >
                <div className="flex items-center">
                  <TrendingDown className="h-8 w-8 text-yellow-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Düşük Stok
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {state?.allProductsStats?.lowStock || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Search and Filters Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
            <div className="p-4">
              {/* Search Bar - Full Width */}
              <div className="w-full mb-4">
                <SearchPanel
                  searchValue={state.searchValue}
                  filters={state.filters}
                  onFilterChange={handleFilterChange}
                  onClearFilters={handleClearFilters}
                  categories={CATEGORIES}
                  onSearch={handleSearch}
                />
              </div>

              {/* Stats Row */}
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {state?.products?.length || 0} / {state.totalItems} ürün
                  </span>
                  {activeFiltersCount > 0 && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                      {activeFiltersCount} filtre aktif
                    </span>
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
              onSelectProduct={handleSelectProduct}
              onSelectAll={handleSelectAll}
              onView={handleViewProduct}
              onEdit={handleEditProduct}
              onDelete={handleDeleteProduct}
              onImageClick={handleImageClick}
              onProductNameClick={handleProductNameClick}
              onCreateVariant={handleCreateVariant}
              onAddProduct={handleAddProduct}
              onSync={handleSync}
              sortField={state.sortField}
              sortOrder={state.sortOrder}
              onSort={handleSort}
              statusCounts={statusCounts}
              filters={state.filters}
              onFilterChange={handleFilterChange}
              onClearFilters={handleClearFilters}
              activeTab={state.activeTab}
              onTabChange={handleTabChange}
              categories={CATEGORIES}
              onViewModeChange={(mode) => actions.setViewMode(mode)}
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
              onBulkEdit={() => actions.setModals({ showBulkEditModal: true })}
              // Import/Export
              onImport={handleImport}
              onExportAll={handleExportAll}
              // Loading states
              importing={state.importing}
              exporting={state.exporting}
              // Analytics
              onToggleAnalytics={() =>
                actions.setModals({ showAnalytics: !state.showAnalytics })
              }
            />
          </div>
        </div>

        {/* Modals */}
        {/* Product Form Modal */}
        <Modal
          isOpen={state.productModal.open}
          onClose={() =>
            actions.setModals({ productModal: { open: false, product: null } })
          }
          title={state.productModal.product ? "Ürün Düzenle" : "Yeni Ürün Ekle"}
          size="xl"
          aria-label={
            state.productModal.product
              ? "Ürün düzenleme formu"
              : "Yeni ürün ekleme formu"
          }
        >
          <ProductForm
            product={state.productModal.product}
            onSave={handleSaveProduct}
            onCancel={() =>
              actions.setModals({
                productModal: { open: false, product: null },
              })
            }
          />
        </Modal>

        {/* Product Details Modal */}
        <Modal
          isOpen={state.detailsModal.open}
          onClose={() =>
            actions.setModals({ detailsModal: { open: false, product: null } })
          }
          title="Ürün Detayları"
          size="lg"
          aria-label="Ürün detayları görüntüleme"
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

        {/* Image Preview Modal */}
        <ImagePreviewModal
          isOpen={state.imageModal.open}
          onClose={() =>
            actions.setModals({
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
          onClose={() => actions.setModals({ showBulkEditModal: false })}
          selectedProducts={state.selectedProducts}
          products={state.products}
          onSave={async (selectedProducts, updateData) => {
            try {
              actions.setLoading(true);

              // Prepare bulk update data
              const bulkData = {};

              // Handle price updates
              if (updateData.price) {
                if (updateData.price.operation === "set") {
                  bulkData.price = updateData.price.value;
                } else {
                  // For percentage updates, we need to process each product individually
                  // since prices may differ between products
                  const updates = selectedProducts.map((id) => {
                    const product = state?.products?.find((p) => p.id === id);
                    const currentPrice = product?.price || 0;
                    const percentage = updateData.price.value / 100;

                    if (updateData.price.operation === "increase") {
                      return { id, price: currentPrice * (1 + percentage) };
                    } else {
                      return { id, price: currentPrice * (1 - percentage) };
                    }
                  });

                  // Process individual price updates
                  for (const update of updates) {
                    await bulkUpdateProducts([update.id], {
                      price: update.price,
                    });
                  }

                  // Clear selected products after successful update
                  actions.setSelectedProducts([]);
                  await fetchProducts();
                  await fetchProductStats().then((stats) =>
                    actions.setProductStats(stats)
                  );
                  return;
                }
              }

              // Handle status updates
              if (updateData.status) {
                bulkData.status = updateData.status;
              }

              // Handle category updates
              if (updateData.category) {
                bulkData.category = updateData.category;
              }

              // Handle stock updates
              if (updateData.stock) {
                if (updateData.stock.operation === "set") {
                  bulkData.stockQuantity = updateData.stock.value;
                } else {
                  // For relative stock updates, we need to process each product individually
                  const updates = selectedProducts.map((id) => {
                    const product = state?.products?.find((p) => p.id === id);
                    const currentStock = product?.stockQuantity || 0;

                    if (updateData.stock.operation === "increase") {
                      return {
                        id,
                        stockQuantity: currentStock + updateData.stock.value,
                      };
                    } else {
                      return {
                        id,
                        stockQuantity: Math.max(
                          0,
                          currentStock - updateData.stock.value
                        ),
                      };
                    }
                  });

                  // Process individual stock updates
                  for (const update of updates) {
                    await bulkUpdateProducts([update.id], {
                      stockQuantity: update.stockQuantity,
                    });
                  }

                  // Clear selected products after successful update
                  actions.setSelectedProducts([]);
                  await fetchProducts();
                  await fetchProductStats().then((stats) =>
                    actions.setProductStats(stats)
                  );
                  return;
                }
              }

              // Use the proper bulk update function
              await bulkUpdateProducts(selectedProducts, bulkData);

              // Clear selected products after successful update
              actions.setSelectedProducts([]);
              await fetchProducts();
              await fetchProductStats().then((stats) =>
                actions.setProductStats(stats)
              );
            } catch (error) {
              handleError(error, " - Bulk edit save");
            } finally {
              actions.setLoading(false);
              actions.setModals({ showBulkEditModal: false });
            }
          }}
        />

        {/* Enhanced Product Analytics */}
        <ProductAnalytics
          isOpen={state.showAnalytics}
          onClose={() => actions.setModals({ showAnalytics: false })}
          timeRange={state.analyticsTimeRange}
          onTimeRangeChange={(range) =>
            actions.updateMultiple({ analyticsTimeRange: range })
          }
          productId={state.detailsModal.product?.id}
        />

        {/* Platform Variant Modal */}
        <PlatformVariantModal
          isOpen={state.platformVariantModal?.open || false}
          onClose={() =>
            actions.setModals({
              platformVariantModal: { open: false, product: null },
            })
          }
          selectedProduct={state.platformVariantModal?.product}
          platformConnections={[
            // Mock platform connections - should come from actual platform connections
            { id: "1", platform: "trendyol" },
            { id: "2", platform: "hepsiburada" },
            { id: "3", platform: "n11" },
          ]}
        />

        {/* Export Modal */}
        <ExportModal
          isOpen={state.showExportModal}
          onClose={() => actions.updateState({ showExportModal: false })}
          onExport={handleExportWithOptions}
          isExporting={state.exporting}
        />
      </div>
    </ProductManagementErrorBoundary>
  );
};

export default React.memo(ProductManagement);
