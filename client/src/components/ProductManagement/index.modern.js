import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { API_BASE_URL } from "./utils/constants";
import { useAlert } from "../../contexts/AlertContext";
import ModernProductManagement from "./components/ModernProductManagement";
import { ImagePreviewModal } from "./components/ProductModals";
import ProductAnalytics from "./components/ProductAnalytics";
import BulkEditModal from "./components/BulkEditModal";
import MobileFilterDrawer from "./components/MobileFilterDrawer";
import AdvancedSearchPanel from "./components/AdvancedSearchPanel";
import { productUtils } from "./utils/productUtils";
import "./styles"; // Import all styles

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

// Enhanced Modern Product Management with Full Business Logic
const EnhancedModernProductManagement = () => {
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
    showMobileFilters: false,
    showBulkEditModal: false,
    recentSearches: [],
    analyticsTimeRange: "week",
  });

  // Add state for all products statistics
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
          totalPages: response.data?.pagination?.totalPages || 1,
          totalItems: response.data?.pagination?.totalItems || 0,
          loading: false,
        });
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      showAlert("Ürünler yüklenirken hata oluştu: " + error.message, "error");
      updateState({ loading: false });
    }
  }, [
    state.currentPage,
    state.itemsPerPage,
    state.sortField,
    state.sortOrder,
    state.searchValue,
    state.filters,
    showAlert,
    updateState,
  ]);

  // Fetch all products stats for accurate tab counts
  const fetchAllProductsStats = useCallback(async () => {
    try {
      const response = await api.get(`${API_BASE_URL}/products/stats`);
      if (response.success) {
        setAllProductsStats(response.data || {});
      }
    } catch (error) {
      console.error("Error fetching product stats:", error);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchProducts();
    fetchAllProductsStats();
  }, [fetchProducts, fetchAllProductsStats]);

  // Handle search with debouncing
  const [searchTimeout, setSearchTimeout] = useState(null);

  const handleSearchChange = useCallback(
    (value) => {
      updateState({ searchValue: value });

      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }

      const timeout = setTimeout(() => {
        // Trigger search after 300ms delay
        fetchProducts();
      }, 300);

      setSearchTimeout(timeout);
    },
    [updateState, searchTimeout, fetchProducts]
  );

  // Product operations
  const handleAddProduct = useCallback(() => {
    updateState({ productModal: { open: true, product: null } });
  }, [updateState]);

  const handleEditProduct = useCallback(
    (product) => {
      updateState({ productModal: { open: true, product } });
    },
    [updateState]
  );

  const handleViewProduct = useCallback(
    (product) => {
      updateState({ detailsModal: { open: true, product } });
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
          fetchAllProductsStats();
        } catch (error) {
          showAlert("Ürün silinirken hata oluştu: " + error.message, "error");
        }
      }
    },
    [showAlert, fetchProducts, fetchAllProductsStats]
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

  // Pagination handling
  const handlePageChange = useCallback(
    (page) => {
      updateState({ currentPage: page });
    },
    [updateState]
  );

  // Sort handling
  const handleSort = useCallback(
    (field) => {
      const newOrder =
        state.sortField === field && state.sortOrder === "asc" ? "desc" : "asc";
      updateState({
        sortField: field,
        sortOrder: newOrder,
      });
    },
    [state.sortField, state.sortOrder, updateState]
  );

  // Filter handling
  const handleFilterChange = useCallback(
    (newFilters) => {
      updateState({
        filters: newFilters,
        currentPage: 1, // Reset to first page when filters change
      });
    },
    [updateState]
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
      searchValue: "",
      currentPage: 1,
    });
  }, [updateState]);

  // Tab handling
  const handleTabChange = useCallback(
    (tab) => {
      updateState({ activeTab: tab, currentPage: 1 });

      // Apply filters based on tab
      let newFilters = { ...state.filters };

      // Clear previous status filters
      delete newFilters.status;
      delete newFilters.stockStatus;
      delete newFilters.maxStock;

      // Apply new filter based on tab
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
        case "out_of_stock":
          newFilters.maxStock = "0";
          break;
        case "low_stock":
          newFilters.stockStatus = "low_stock";
          break;
        default:
          // "all" tab doesn't add any filters
          break;
      }

      updateState({ filters: newFilters });
    },
    [updateState, state.filters]
  );

  // Bulk operations
  const handleBulkDelete = useCallback(async () => {
    if (state.selectedProducts.length === 0) return;

    const count = state.selectedProducts.length;
    if (window.confirm(`${count} ürünü silmek istediğinizden emin misiniz?`)) {
      try {
        await api.post(`${API_BASE_URL}/products/bulk-delete`, {
          productIds: state.selectedProducts,
        });
        showAlert(`${count} ürün başarıyla silindi`, "success");
        updateState({ selectedProducts: [] });
        fetchProducts();
        fetchAllProductsStats();
      } catch (error) {
        showAlert("Ürünler silinirken hata oluştu: " + error.message, "error");
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

      try {
        await api.post(`${API_BASE_URL}/products/bulk-update`, {
          productIds: state.selectedProducts,
          updates: { status },
        });
        showAlert(
          `${state.selectedProducts.length} ürünün durumu güncellendi`,
          "success"
        );
        updateState({ selectedProducts: [] });
        fetchProducts();
        fetchAllProductsStats();
      } catch (error) {
        showAlert(
          "Durum güncellenirken hata oluştu: " + error.message,
          "error"
        );
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

  // Sync operation
  const handleSync = useCallback(async () => {
    updateState({ syncing: true });
    try {
      const response = await api.post(`${API_BASE_URL}/products/sync`);
      if (response.success) {
        showAlert("Senkronizasyon başarılı", "success");
        fetchProducts();
        fetchAllProductsStats();
      }
    } catch (error) {
      showAlert("Senkronizasyon hatası: " + error.message, "error");
    } finally {
      updateState({ syncing: false });
    }
  }, [showAlert, updateState, fetchProducts, fetchAllProductsStats]);

  // Status counts for tabs
  const statusCounts = useMemo(() => {
    return {
      all: allProductsStats.total,
      active: allProductsStats.active,
      inactive: allProductsStats.inactive,
      draft: allProductsStats.draft,
      pending: allProductsStats.pending,
      rejected: allProductsStats.rejected,
      outOfStock: allProductsStats.outOfStock,
      lowStock: allProductsStats.lowStock,
    };
  }, [allProductsStats]);

  // Effect to handle productId URL parameter for direct edit navigation
  useEffect(() => {
    if (productId && state.products.length > 0) {
      const product = state.products.find(
        (p) =>
          p.id === parseInt(productId) ||
          p.id === productId ||
          p.id.toString() === productId
      );
      if (product) {
        handleEditProduct(product);
        navigate("/products", { replace: true });
      } else {
        showAlert("Ürün bulunamadı", "error");
        navigate("/products");
      }
    }
  }, [productId, state.products, navigate, showAlert, handleEditProduct]);

  // Cleanup search timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  return (
    <div className="space-y-4">
      <ModernProductManagement
        // Data props
        products={state.products}
        loading={state.loading}
        selectedProducts={state.selectedProducts}
        searchValue={state.searchValue}
        filters={state.filters}
        sortField={state.sortField}
        sortOrder={state.sortOrder}
        currentPage={state.currentPage}
        totalPages={state.totalPages}
        totalItems={state.totalItems}
        viewMode={state.viewMode}
        statusCounts={statusCounts}
        syncLoading={state.syncing}
        importLoading={state.importing}
        exportLoading={state.exporting}
        // Event handlers
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
        onSearchChange={handleSearchChange}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        onSort={handleSort}
        onPageChange={handlePageChange}
        onViewModeChange={(mode) => updateState({ viewMode: mode })}
        onBulkEdit={() => updateState({ showBulkEditModal: true })}
        onBulkDelete={handleBulkDelete}
        onBulkStatusChange={handleBulkStatusChange}
        onInlineEdit={(field, productId, value) => {
          // Handle inline editing
          console.log("Inline edit:", field, productId, value);
        }}
      />

      {/* Additional Modals and Components */}
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
            updateState({ selectedProducts: [], showBulkEditModal: false });
            fetchProducts();
            fetchAllProductsStats();
          } catch (error) {
            showAlert("Toplu güncelleme hatası: " + error.message, "error");
          } finally {
            updateState({ loading: false });
          }
        }}
      />

      <ProductAnalytics
        isOpen={state.showAnalytics}
        onClose={() => updateState({ showAnalytics: false })}
        timeRange={state.analyticsTimeRange}
        onTimeRangeChange={(range) =>
          updateState({ analyticsTimeRange: range })
        }
        productId={state.detailsModal.product?.id}
      />
    </div>
  );
};

export default EnhancedModernProductManagement;
