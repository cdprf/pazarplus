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
  Edit,
} from "lucide-react";

// Context and hooks
import { useAlert } from "../../contexts/AlertContext";
import { useProductState } from "./hooks/useProductState";
import { useProductAPI } from "./hooks/useProductAPI";
import { useProductPerformance } from "./hooks/useProductPerformance";

// UI Components
import { Button } from "../ui";
import { Modal } from "../ui";
import ProductDisplay from "./components/ProductDisplay";
import { ImagePreviewModal } from "./components/ProductModals";
import EnhancedProductAnalytics from "./components/ProductAnalytics";
import BulkEditModal from "./components/BulkEditModal";
import SearchPanel from "./components/SearchPanel";
import ProductManagementErrorBoundary, {
  ErrorDisplay,
  useErrorHandler,
} from "./components/ErrorBoundary";

// Utils and constants
import { CATEGORIES, API_BASE_URL } from "./utils/constants";
import "./ProductManagement.css";

/**
 * Optimized Product Form Component
 */
const ProductForm = React.memo(({ product, onSave, onCancel }) => {
  const [formData, setFormData] = React.useState({
    name: product?.name || "",
    sku: product?.sku || "",
    description: product?.description || "",
    category: product?.category || "",
    price: product?.price || 0,
    stockQuantity: product?.stockQuantity || 0,
    status: product?.status || "active",
  });

  const [saving, setSaving] = React.useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic validation
    if (!formData.name.trim() || !formData.sku.trim() || !formData.category) {
      return;
    }

    setSaving(true);
    try {
      await onSave(formData);
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

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
            onChange={(e) => handleInputChange("name", e.target.value)}
            className="form-input"
            placeholder="Ürün adını girin"
            required
            aria-describedby="name-help"
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
            aria-describedby="sku-help"
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
            aria-describedby="category-help"
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
              handleInputChange("price", parseFloat(e.target.value) || 0)
            }
            className="form-input"
            placeholder="0.00"
            required
            aria-describedby="price-help"
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
            aria-describedby="stock-help"
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
            aria-describedby="status-help"
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
          onChange={(e) => handleInputChange("description", e.target.value)}
          rows={3}
          className="form-input"
          placeholder="Ürün açıklaması"
          aria-describedby="description-help"
        />
      </div>

      <div className="modal-footer">
        <Button
          onClick={onCancel}
          variant="ghost"
          disabled={saving}
          type="button"
        >
          İptal
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={saving}
          aria-describedby="save-help"
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
  const {
    optimizedUpdateState,
    debouncedSearch,
    handleSelectProduct,
    handleSelectAll,
    batchUpdate,
  } = useProductPerformance(state, actions.updateMultiple, showAlert);

  // Memoized values
  const statusCounts = useMemo(() => selectors.getStatusCounts(), [selectors]);
  const selectedProductsData = useMemo(
    () => selectors.getSelectedProductsData(),
    [selectors]
  );
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
  }, []);

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
    if (productId && state.products.length > 0 && !state.loading) {
      const product = state.products.find((p) => p.id === productId);
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

    try {
      actions.setBulkState({ exporting: true });
      await exportProducts({ productIds: state.selectedProducts });
    } catch (error) {
      handleError(error, " - Bulk export");
    } finally {
      actions.setBulkState({ exporting: false });
    }
  }, [state.selectedProducts, exportProducts, actions, handleError]);

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
    try {
      actions.setBulkState({ exporting: true });
      await exportProducts(state.filters);
    } catch (error) {
      handleError(error, " - Export all");
    } finally {
      actions.setBulkState({ exporting: false });
    }
  }, [exportProducts, state.filters, actions, handleError]);

  // Tab change handler
  const handleTabChange = useCallback(
    (tab) => {
      let newFilters = { ...state.filters };

      // Clear previous tab filters
      delete newFilters.status;
      delete newFilters.stockStatus;

      // Apply new tab filter
      switch (tab) {
        case "active":
          newFilters.stockStatus = "aktif";
          break;
        case "draft":
          newFilters.stockStatus = "draft";
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
                      {state.allProductsStats.total}
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
                      {state.allProductsStats.active}
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
                      {state.allProductsStats.outOfStock}
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
                      {state.allProductsStats.lowStock}
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

              {/* Stats and Actions Row */}
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {state.products.length} / {state.totalItems} ürün
                  </span>
                  {activeFiltersCount > 0 && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                      {activeFiltersCount} filtre aktif
                    </span>
                  )}
                </div>
                <div>
                  {state.selectedProducts.length > 0 && (
                    <Button
                      onClick={() =>
                        actions.setModals({ showBulkEditModal: true })
                      }
                      variant="primary"
                      size="sm"
                      className="flex items-center space-x-2"
                      aria-label={`${state.selectedProducts.length} ürünü toplu düzenle`}
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
              onSelectProduct={handleSelectProduct}
              onSelectAll={handleSelectAll}
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
                    const product = state.products.find((p) => p.id === id);
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
                    const product = state.products.find((p) => p.id === id);
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
        <EnhancedProductAnalytics
          isOpen={state.showAnalytics}
          onClose={() => actions.setModals({ showAnalytics: false })}
          timeRange={state.analyticsTimeRange}
          onTimeRangeChange={(range) =>
            actions.updateMultiple({ analyticsTimeRange: range })
          }
          productId={state.detailsModal.product?.id}
        />
      </div>
    </ProductManagementErrorBoundary>
  );
};

export default React.memo(ProductManagement);
