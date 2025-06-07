import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Search, Plus, RefreshCw, Loader, X } from "lucide-react";
import { API_BASE_URL } from "./utils/constants";
import { useAlert } from "../../contexts/AlertContext";
import ProductDisplay from "./components/ProductDisplay";
import { ImagePreviewModal } from "./components/ProductModals";

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

  // Initial fetch
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

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

  // Search handling with debouncing
  const [searchTimeout, setSearchTimeout] = useState(null);

  const handleSearchChange = useCallback(
    (value) => {
      updateState({ searchValue: value, currentPage: 1 });

      // Clear previous timeout
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }

      // Set new timeout for API call
      const newTimeout = setTimeout(() => {
        fetchProducts();
      }, 300); // 300ms debounce

      setSearchTimeout(newTimeout);
    },
    [updateState, searchTimeout, fetchProducts]
  );

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
      } catch (error) {
        showAlert(
          "Toplu silme işlemi sırasında hata oluştu: " + error.message,
          "error"
        );
      } finally {
        updateState({ loading: false });
      }
    }
  }, [state.selectedProducts, showAlert, updateState, fetchProducts]);

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
      } catch (error) {
        showAlert(
          "Toplu durum güncelleme sırasında hata oluştu: " + error.message,
          "error"
        );
      } finally {
        updateState({ loading: false });
      }
    },
    [state.selectedProducts, showAlert, updateState, fetchProducts]
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
    [showAlert, updateState, fetchProducts]
  );

  const handleExportAll = useCallback(async () => {
    updateState({ exporting: true });
    try {
      const response = await api.post(`${API_BASE_URL}/products/export`, {
        format: "csv",
        filters: state.filters,
        searchValue: state.searchValue,
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
  }, [state.filters, state.searchValue, showAlert, updateState]);

  // Refetch when dependencies change
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Cleanup search timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

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

  // Status counts for tabs - Fixed to work with real product data
  const statusCounts = useMemo(() => {
    const counts = {
      all: state.totalItems || state.products.length,
      active: 0,
      inactive: 0,
      outOfStock: 0,
    };

    state.products.forEach((product) => {
      // Check if product is active based on status field
      if (product.status === "active" || product.status === true) {
        counts.active++;
      } else if (product.status === "inactive" || product.status === false) {
        counts.inactive++;
      }

      // Check if product is out of stock
      if ((product.stockQuantity || product.stock_quantity || 0) <= 0) {
        counts.outOfStock++;
      }
    });

    return counts;
  }, [state.products, state.totalItems]);

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

  // Tab change handler
  const handleTabChange = useCallback(
    (tab) => {
      let newFilters = { ...state.filters };

      // Clear previous tab filters
      delete newFilters.status;
      delete newFilters.stockStatus;

      // Apply new tab filter
      if (tab === "active") {
        newFilters.status = "active";
      } else if (tab === "inactive") {
        newFilters.status = "inactive";
      } else if (tab === "outOfStock") {
        newFilters.maxStock = "0"; // Filter for products with 0 stock
      }
      // "all" tab doesn't add any filters

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

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Compact Header */}
        <div className="mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4">
            <div className="flex items-center space-x-4 mb-3 lg:mb-0">
              <h1 className="text-2xl font-bold text-gray-900">
                Ürün Yönetimi
              </h1>
              <span className="text-sm text-gray-500">
                {state.totalItems} ürün
              </span>
            </div>

            {/* Compact Action Bar */}
            <div className="flex items-center space-x-2">
              {/* Search - Inline */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={state.searchValue}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="block w-64 pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-md bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ürün ara..."
                />
                {state.searchValue && (
                  <button
                    onClick={() => handleSearchChange("")}
                    className="absolute inset-y-0 right-0 pr-2 flex items-center"
                  >
                    <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                  </button>
                )}
              </div>

              {/* Quick Actions */}
              <Button
                onClick={handleSync}
                variant="outline"
                size="sm"
                icon={RefreshCw}
                disabled={state.syncing}
              >
                {state.syncing && <Loader className="w-4 h-4 animate-spin" />}
              </Button>

              <Button
                onClick={handleExportAll}
                variant="outline"
                size="sm"
                disabled={state.exporting}
              >
                {state.exporting ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  "Dışa Aktar"
                )}
              </Button>

              <div className="relative">
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileImport}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={state.importing}
                />
                <Button variant="outline" size="sm" disabled={state.importing}>
                  {state.importing ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    "İçe Aktar"
                  )}
                </Button>
              </div>

              <Button
                onClick={handleAddProduct}
                variant="primary"
                icon={Plus}
                size="sm"
              >
                Yeni Ürün
              </Button>
            </div>
          </div>
        </div>

        {/* Compact Results Summary */}
        {(state.searchValue ||
          Object.values(state.filters).some((f) => f && f !== "all")) && (
          <div className="mb-4 px-4 py-2 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-900">
                {state.products.length} sonuç
                {state.searchValue && ` - "${state.searchValue}"`}
              </span>
              <Button
                onClick={() => {
                  handleSearchChange("");
                  handleClearFilters();
                }}
                variant="ghost"
                size="sm"
                className="text-blue-700 hover:text-blue-900 text-xs"
              >
                Temizle
              </Button>
            </div>
          </div>
        )}

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
          // Import/Export
          onImport={handleImport}
          onExportAll={handleExportAll}
          // Search
          searchValue={state.searchValue}
          onSearchChange={handleSearchChange}
          // Loading states
          importing={state.importing}
          exporting={state.exporting}
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
      </div>
    </div>
  );
};

export default ProductManagement;
