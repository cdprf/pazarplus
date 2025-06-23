import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAlert } from "../../../contexts/AlertContext";
import { API_BASE_URL } from "../utils/constants";
import InlineVariantDashboard from "./InlineVariantDashboard.jsx";
import PlatformVariantForm from "./PlatformVariantForm.jsx";
import ProductDisplay from "./ProductDisplay.js";

// Enhanced Product Management API
const enhancedProductAPI = {
  async getMainProducts(filters = {}) {
    const response = await fetch(
      `${API_BASE_URL}/enhanced-products/main-products`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );
    if (!response.ok)
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    return response.json();
  },

  async createMainProduct(productData) {
    const response = await fetch(
      `${API_BASE_URL}/enhanced-products/main-products`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(productData),
      }
    );
    if (!response.ok)
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    return response.json();
  },

  async getMainProduct(id) {
    const response = await fetch(
      `${API_BASE_URL}/enhanced-products/main-products/${id}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );
    if (!response.ok)
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    return response.json();
  },

  async createPlatformVariant(mainProductId, variantData) {
    const response = await fetch(
      `${API_BASE_URL}/enhanced-products/main-products/${mainProductId}/variants`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(variantData),
      }
    );
    if (!response.ok)
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    return response.json();
  },

  async updatePlatformVariant(variantId, variantData) {
    const response = await fetch(
      `${API_BASE_URL}/enhanced-products/variants/${variantId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(variantData),
      }
    );
    if (!response.ok)
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    return response.json();
  },

  async deletePlatformVariant(variantId) {
    const response = await fetch(
      `${API_BASE_URL}/enhanced-products/variants/${variantId}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );
    if (!response.ok)
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    return response.json();
  },

  async publishVariants(variantIds, platforms) {
    const response = await fetch(
      `${API_BASE_URL}/enhanced-products/variants/publish`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ variantIds, platforms }),
      }
    );
    if (!response.ok)
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    return response.json();
  },

  async autoMatchProducts() {
    const response = await fetch(
      `${API_BASE_URL}/enhanced-products/auto-match`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );
    if (!response.ok)
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    return response.json();
  },

  async getPlatformTemplates(platform, category) {
    const params = new URLSearchParams();
    if (platform) params.append("platform", platform);
    if (category) params.append("category", category);

    const response = await fetch(
      `${API_BASE_URL}/enhanced-products/templates?${params}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );
    if (!response.ok)
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    return response.json();
  },
};

const EnhancedProductManagement = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { showAlert } = useAlert();

  // State management
  const [mainProducts, setMainProducts] = useState([]);
  const [selectedMainProduct, setSelectedMainProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState("table");
  const [showVariantForm, setShowVariantForm] = useState(false);
  const [editingVariant, setEditingVariant] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState([]);

  // Enhanced features state
  const [showInlineVariantDashboard, setShowInlineVariantDashboard] =
    useState(false);
  const [autoMatchProgress, setAutoMatchProgress] = useState(null);

  // Load main products
  const loadMainProducts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await enhancedProductAPI.getMainProducts();
      if (response.success) {
        setMainProducts(response.data.mainProducts || []);
      } else {
        throw new Error(response.message || "Failed to load products");
      }
    } catch (error) {
      console.error("Error loading main products:", error);
      showAlert("Ürünler yüklenirken hata oluştu", "error");
    } finally {
      setLoading(false);
    }
  }, [showAlert]);

  // Load specific main product if ID is provided
  const loadMainProduct = useCallback(
    async (productId) => {
      try {
        setLoading(true);
        const response = await enhancedProductAPI.getMainProduct(productId);
        if (response.success) {
          setSelectedMainProduct(response.data);
          setShowInlineVariantDashboard(true);
        } else {
          throw new Error(response.message || "Failed to load product");
        }
      } catch (error) {
        console.error("Error loading main product:", error);
        showAlert("Ürün yüklenirken hata oluştu", "error");
      } finally {
        setLoading(false);
      }
    },
    [showAlert]
  );

  // Initialize component
  useEffect(() => {
    if (id) {
      loadMainProduct(id);
    } else {
      loadMainProducts();
    }
  }, [id, loadMainProduct, loadMainProducts]);

  // Handle main product creation
  const handleCreateMainProduct = async (productData) => {
    try {
      setLoading(true);
      const response = await enhancedProductAPI.createMainProduct(productData);
      if (response.success) {
        showAlert("Ana ürün başarıyla oluşturuldu", "success");
        await loadMainProducts();
      } else {
        throw new Error(response.message || "Failed to create product");
      }
    } catch (error) {
      console.error("Error creating main product:", error);
      showAlert("Ana ürün oluşturulurken hata oluştu", "error");
    } finally {
      setLoading(false);
    }
  };

  // Handle variant creation
  const handleCreateVariant = async (variantData) => {
    try {
      if (!selectedMainProduct) {
        showAlert("Ana ürün seçili değil", "error");
        return;
      }

      setLoading(true);
      const response = await enhancedProductAPI.createPlatformVariant(
        selectedMainProduct.id,
        variantData
      );

      if (response.success) {
        showAlert("Platform varyantı başarıyla oluşturuldu", "success");
        setShowVariantForm(false);
        setEditingVariant(null);

        // Refresh the main product data
        await loadMainProduct(selectedMainProduct.id);
      } else {
        throw new Error(response.message || "Failed to create variant");
      }
    } catch (error) {
      console.error("Error creating variant:", error);
      showAlert("Varyant oluşturulurken hata oluştu", "error");
    } finally {
      setLoading(false);
    }
  };

  // Handle variant editing
  const handleEditVariant = async (variantId, variantData) => {
    try {
      setLoading(true);
      const response = await enhancedProductAPI.updatePlatformVariant(
        variantId,
        variantData
      );

      if (response.success) {
        showAlert("Platform varyantı başarıyla güncellendi", "success");
        setShowVariantForm(false);
        setEditingVariant(null);

        // Refresh the main product data
        if (selectedMainProduct) {
          await loadMainProduct(selectedMainProduct.id);
        }
      } else {
        throw new Error(response.message || "Failed to update variant");
      }
    } catch (error) {
      console.error("Error updating variant:", error);
      showAlert("Varyant güncellenirken hata oluştu", "error");
    } finally {
      setLoading(false);
    }
  };

  // Handle variant deletion
  const handleDeleteVariant = async (variantId) => {
    try {
      setLoading(true);
      const response = await enhancedProductAPI.deletePlatformVariant(
        variantId
      );

      if (response.success) {
        showAlert("Platform varyantı başarıyla silindi", "success");

        // Refresh the main product data
        if (selectedMainProduct) {
          await loadMainProduct(selectedMainProduct.id);
        }
      } else {
        throw new Error(response.message || "Failed to delete variant");
      }
    } catch (error) {
      console.error("Error deleting variant:", error);
      showAlert("Varyant silinirken hata oluştu", "error");
    } finally {
      setLoading(false);
    }
  };

  // Handle bulk variant publishing
  const handlePublishVariants = async (variantIds, platforms) => {
    try {
      setLoading(true);
      const response = await enhancedProductAPI.publishVariants(
        variantIds,
        platforms
      );

      if (response.success) {
        showAlert("Varyantlar başarıyla yayınlandı", "success");

        // Refresh the main product data
        if (selectedMainProduct) {
          await loadMainProduct(selectedMainProduct.id);
        }
      } else {
        throw new Error(response.message || "Failed to publish variants");
      }
    } catch (error) {
      console.error("Error publishing variants:", error);
      showAlert("Varyantlar yayınlanırken hata oluştu", "error");
    } finally {
      setLoading(false);
    }
  };

  // Handle auto-matching
  const handleAutoMatch = async () => {
    try {
      setLoading(true);
      setAutoMatchProgress({
        status: "running",
        message: "Otomatik eşleştirme başlatıldı...",
      });

      const response = await enhancedProductAPI.autoMatchProducts();

      if (response.success) {
        setAutoMatchProgress({
          status: "completed",
          message: `${response.data.matchedCount} ürün otomatik olarak eşleştirildi`,
          matchedCount: response.data.matchedCount,
        });
        showAlert("Otomatik eşleştirme tamamlandı", "success");
        await loadMainProducts();
      } else {
        throw new Error(response.message || "Failed to auto-match products");
      }
    } catch (error) {
      console.error("Error auto-matching products:", error);
      setAutoMatchProgress({
        status: "error",
        message: "Otomatik eşleştirmede hata oluştu",
      });
      showAlert("Otomatik eşleştirmede hata oluştu", "error");
    } finally {
      setLoading(false);

      // Clear progress after 5 seconds
      setTimeout(() => {
        setAutoMatchProgress(null);
      }, 5000);
    }
  };

  // Handle product selection for main product management
  const handleSelectProduct = (productId) => {
    setSelectedProducts((prev) => {
      if (prev.includes(productId)) {
        return prev.filter((id) => id !== productId);
      } else {
        return [...prev, productId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedProducts.length === mainProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(mainProducts.map((p) => p.id));
    }
  };

  // Handle product viewing (open inline variant dashboard)
  const handleViewProduct = (product) => {
    setSelectedMainProduct(product);
    setShowInlineVariantDashboard(true);
    navigate(`/products/enhanced/${product.id}`);
  };

  // Navigation handlers
  const handleBackToList = () => {
    setSelectedMainProduct(null);
    setShowInlineVariantDashboard(false);
    navigate("/products/enhanced");
  };

  // Convert main products to display format for compatibility
  const displayProducts = mainProducts.map((product) => ({
    ...product,
    // Map enhanced fields to display fields
    name: product.title,
    stockCode: product.stockCode,
    stockQuantity: product.sharedStock?.totalStock || 0,
    variantCount: product.variants?.length || 0,
    publishedPlatforms:
      product.variants?.reduce((platforms, variant) => {
        if (variant.publishedAt && !platforms.includes(variant.platform)) {
          platforms.push(variant.platform);
        }
        return platforms;
      }, []) || [],
  }));

  // Render inline variant dashboard if product is selected
  if (showInlineVariantDashboard && selectedMainProduct) {
    return (
      <div className="space-y-6">
        <InlineVariantDashboard
          mainProduct={selectedMainProduct}
          onCreateVariant={() => setShowVariantForm(true)}
          onEditVariant={(variant) => {
            setEditingVariant(variant);
            setShowVariantForm(true);
          }}
          onDeleteVariant={handleDeleteVariant}
          onPublishVariants={handlePublishVariants}
          onBackToList={handleBackToList}
          loading={loading}
        />

        {showVariantForm && (
          <PlatformVariantForm
            mainProduct={selectedMainProduct}
            variant={editingVariant}
            onSubmit={
              editingVariant
                ? (data) => handleEditVariant(editingVariant.id, data)
                : handleCreateVariant
            }
            onCancel={() => {
              setShowVariantForm(false);
              setEditingVariant(null);
            }}
            loading={loading}
          />
        )}
      </div>
    );
  }

  // Render main product list view
  return (
    <div className="space-y-6">
      {/* Enhanced Product Management Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Gelişmiş Ürün Yönetimi
            </h1>
            <p className="text-gray-600 mt-1">
              Ana ürünler ve platform varyantlarını yönetin
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleAutoMatch}
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <span>🤖</span>
              )}
              Otomatik Eşleştirme
            </button>

            <button
              onClick={() => handleCreateMainProduct({})}
              disabled={loading}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 flex items-center gap-2"
            >
              <span>+</span>
              Ana Ürün Oluştur
            </button>
          </div>
        </div>

        {/* Auto-match progress */}
        {autoMatchProgress && (
          <div
            className={`mt-4 p-3 rounded-lg ${
              autoMatchProgress.status === "running"
                ? "bg-blue-50 text-blue-700"
                : autoMatchProgress.status === "completed"
                ? "bg-green-50 text-green-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            <div className="flex items-center gap-2">
              {autoMatchProgress.status === "running" && (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              )}
              <span>{autoMatchProgress.message}</span>
            </div>
          </div>
        )}
      </div>

      {/* Product Display */}
      <ProductDisplay
        products={displayProducts}
        loading={loading}
        viewMode={viewMode}
        selectedProducts={selectedProducts}
        onSelectProduct={handleSelectProduct}
        onSelectAll={handleSelectAll}
        onView={handleViewProduct}
        onEdit={handleViewProduct}
        onDelete={() => {}} // TODO: Implement main product deletion
        onAddProduct={() => handleCreateMainProduct({})}
        onSync={loadMainProducts}
        onViewModeChange={setViewMode}
        enableVariantManagement={true}
        // Enhanced product display features
        enhancedMode={true}
        showVariantCount={true}
        showPublishedPlatforms={true}
      />
    </div>
  );
};

export default EnhancedProductManagement;
