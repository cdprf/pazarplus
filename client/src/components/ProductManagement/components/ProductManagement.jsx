import logger from "../../../utils/logger.js";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAlert } from "../../../contexts/AlertContext";
import { API_BASE_URL } from "../utils/constants";
import InlineVariantDashboard from "./InlineVariantDashboard.jsx";
import PlatformVariantForm from "./PlatformVariantForm.jsx";
import ProductDisplay from "./ProductDisplay.js";
import ProductCreationModal from "./ProductCreationModalFull.jsx";
import VariantCreationModal from "./VariantCreationModal.jsx";
import PlatformFieldMapping from "./PlatformFieldMapping.jsx";
import MainVariantManager from "./MainVariantManager.jsx";
import ProductImportModal from "./ProductImportModal.jsx";

// Advanced Product Management API
const productAPI = {
  // Helper function to ensure authentication
  async ensureAuth() {
    let token = localStorage.getItem("token");
    if (!token) {
      logger.info("🔄 No token found, generating dev token...");
      try {
        const response = await fetch(`${API_BASE_URL}/auth/dev-token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        if (response.ok) {
          const { token: devToken } = await response.json();
          localStorage.setItem("token", devToken);
          token = devToken;
          logger.info("✅ Dev token generated and stored");
        }
      } catch (error) {
        logger.error("❌ Failed to generate dev token:", error);
      }
    }
    return token;
  },

  async getMainProducts(filters = {}) {
    const token = await this.ensureAuth();
    const response = await fetch(`${API_BASE_URL}/products/main-products`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    return response.json();
  },

  async createMainProduct(productData) {
    const token = await this.ensureAuth();
    const response = await fetch(`${API_BASE_URL}/products/main-products`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(productData),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    return response.json();
  },

  async getMainProduct(id) {
    const token = await this.ensureAuth();
    const response = await fetch(
      `${API_BASE_URL}/products/main-products/${id}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    return response.json();
  },

  async createPlatformVariant(mainProductId, variantData) {
    const response = await fetch(
      `${API_BASE_URL}/products/main-products/${mainProductId}/variants`,
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
      `${API_BASE_URL}/products/variants/${variantId}`,
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
      `${API_BASE_URL}/products/variants/${variantId}`,
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
    const response = await fetch(`${API_BASE_URL}/products/variants/publish`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ variantIds, platforms }),
    });
    if (!response.ok)
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    return response.json();
  },

  async autoMatchProducts() {
    const response = await fetch(`${API_BASE_URL}/products/auto-match`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
    if (!response.ok)
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    return response.json();
  },

  async getPlatformTemplates(platform, category) {
    const params = new URLSearchParams();
    if (platform) params.append("platform", platform);
    if (category) params.append("category", category);

    const response = await fetch(
      `${API_BASE_URL}/products/templates?${params}`,
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

const ProductManagement = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { showAlert } = useAlert();

  // Use ref to store the latest showAlert function to prevent infinite loops
  const showAlertRef = useRef(showAlert);
  showAlertRef.current = showAlert;

  // State management
  const [mainProducts, setMainProducts] = useState([]);
  const [selectedMainProduct, setSelectedMainProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState("table");
  const [showVariantForm, setShowVariantForm] = useState(false);
  const [editingVariant, setEditingVariant] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState([]);

  // Advanced features state
  const [showInlineVariantDashboard, setShowInlineVariantDashboard] =
    useState(false);
  const [autoMatchProgress, setAutoMatchProgress] = useState(null);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkSelectedProducts, setBulkSelectedProducts] = useState([]);

  // New modal states
  const [showProductCreationModal, setShowProductCreationModal] =
    useState(false);
  const [showVariantCreationModal, setShowVariantCreationModal] =
    useState(false);
  const [showFieldMappingModal, setShowFieldMappingModal] = useState(false);
  const [fieldMappingData, setFieldMappingData] = useState(null);
  const [showMainVariantManager, setShowMainVariantManager] = useState(false);
  const [showProductImportModal, setShowProductImportModal] = useState(false);

  // Load main products - fixed to prevent infinite loop
  const loadMainProducts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await productAPI.getMainProducts();
      if (response.success) {
        setMainProducts(response.data.mainProducts || []);
      } else {
        throw new Error(response.message || "Failed to load products");
      }
    } catch (error) {
      logger.error("Error loading main products:", error);
      if (showAlertRef.current) {
        showAlertRef.current("Ürünler yüklenirken hata oluştu", "error");
      }
    } finally {
      setLoading(false);
    }
  }, []); // Empty dependency array to prevent recreation

  // Load specific main product if ID is provided - fixed to prevent infinite loop
  const loadMainProduct = useCallback(async (productId) => {
    try {
      setLoading(true);
      const response = await productAPI.getMainProduct(productId);
      if (response.success) {
        setSelectedMainProduct(response.data);
        setShowInlineVariantDashboard(true);
      } else {
        throw new Error(response.message || "Failed to load product");
      }
    } catch (error) {
      logger.error("Error loading main product:", error);
      if (showAlertRef.current) {
        showAlertRef.current("Ürün yüklenirken hata oluştu", "error");
      }
    } finally {
      setLoading(false);
    }
  }, []); // Empty dependency array to prevent recreation

  // Initialize component
  // Effect to load products - fixed to prevent infinite loop
  useEffect(() => {
    if (id) {
      loadMainProduct(id);
    } else {
      loadMainProducts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]); // Only depend on id, not the callback functions to prevent infinite loop

  // Handle main product creation
  const handleCreateMainProduct = async (productData) => {
    logger.info("handleCreateMainProduct called with:", productData);

    if (!productData || Object.keys(productData).length === 0) {
      // Open creation modal
      logger.info("Opening product creation modal");
      alert("Opening product creation modal"); // Debug alert
      setShowProductCreationModal(true);
      return;
    }

    try {
      setLoading(true);
      const response = await productAPI.createMainProduct(productData);
      if (response.success) {
        showAlert("Ana ürün başarıyla oluşturuldu", "success");
        await loadMainProducts();
      } else {
        throw new Error(response.message || "Failed to create product");
      }
    } catch (error) {
      logger.error("Error creating main product:", error);
      showAlert("Ana ürün oluşturulurken hata oluştu", "error");
    } finally {
      setLoading(false);
    }
  };

  // Handle product creation success
  const handleProductCreationSuccess = (newProduct) => {
    if (newProduct) {
      setMainProducts((prev) => [newProduct, ...prev]);
    } else {
      loadMainProducts(); // Fallback to reload all
    }
  };

  // Handle product import success
  const handleProductImportSuccess = (importResults) => {
    logger.info("Product import completed:", importResults);
    if (importResults) {
      const { created, updated, mainProducts: newMainProducts } = importResults;
      showAlert(
        `Products imported successfully! Created: ${created}, Updated: ${updated}`,
        "success"
      );
      loadMainProducts(); // Reload all products to see new imports
    } else {
      showAlert("Products imported successfully", "success");
      loadMainProducts();
    }
    setShowProductImportModal(false);
  };

  // Handle variant creation
  const handleCreateVariantsForProduct = (product) => {
    setSelectedMainProduct(product);
    setShowVariantCreationModal(true);
  };

  // Handle variant creation success
  const handleVariantCreationSuccess = (newVariants) => {
    if (newVariants && newVariants.length > 0) {
      showAlert(
        `${newVariants.length} variants created successfully`,
        "success"
      );
      // Refresh the main product data to show new variants
      if (selectedMainProduct) {
        loadMainProduct(selectedMainProduct.id);
      }
    }
    setShowVariantCreationModal(false);
  };

  // Handle field mapping
  const handleOpenFieldMapping = (
    sourcePlatform,
    targetPlatform,
    sampleData
  ) => {
    setFieldMappingData({
      sourcePlatform,
      targetPlatform,
      sampleData,
    });
    setShowFieldMappingModal(true);
  };

  // Handle field mapping completion
  const handleFieldMappingComplete = (mappingConfig) => {
    logger.info("Field mapping completed:", mappingConfig);
    // You can save this configuration or use it for data transformation
    showAlert("Field mapping configuration saved", "success");
  };

  // Handle bulk variant creation
  const handleBulkVariantCreation = async () => {
    if (selectedProducts.length === 0) {
      showAlert("Please select products to create variants for", "warning");
      return;
    }

    try {
      setLoading(true);
      setBulkSelectedProducts(selectedProducts);

      // For now, we'll use the variant creation modal for bulk operations
      // In a real implementation, you might want a specialized bulk variant creation modal
      const firstProduct = mainProducts.find(
        (p) => p.id === selectedProducts[0]
      );
      if (firstProduct) {
        setSelectedMainProduct(firstProduct);
        setShowVariantCreationModal(true);
        showAlert(
          `Starting bulk variant creation for ${selectedProducts.length} products`,
          "info"
        );
      } else {
        showAlert("Could not find selected product", "error");
      }
    } catch (error) {
      logger.error("Error starting bulk variant creation:", error);
      showAlert("Error starting bulk variant creation", "error");
    } finally {
      setLoading(false);
    }
  };

  // Handle bulk product selection
  const handleBulkMarkAsMainProducts = async () => {
    if (selectedProducts.length === 0) {
      showAlert("Please select products to mark as main products", "warning");
      return;
    }

    try {
      setLoading(true);
      const results = [];

      for (const productId of selectedProducts) {
        try {
          // Get authentication token
          const token = await productAPI.ensureAuth();

          // Assuming there's an API endpoint to mark products as main products
          const response = await fetch(
            `${API_BASE_URL}/products/mark-as-main/${productId}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (response.ok) {
            results.push({ success: true, productId });
          } else {
            results.push({
              success: false,
              productId,
              error: "Failed to mark as main product",
            });
          }
        } catch (error) {
          results.push({ success: false, productId, error: error.message });
        }
      }

      const successCount = results.filter((r) => r.success).length;
      if (successCount > 0) {
        showAlert(
          `${successCount} products marked as main products`,
          "success"
        );
        await loadMainProducts();
        setSelectedProducts([]);
      } else {
        showAlert("Failed to mark any products as main products", "error");
      }
    } catch (error) {
      logger.error("Error marking products as main:", error);
      showAlert("Error marking products as main products", "error");
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
      const response = await productAPI.createPlatformVariant(
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
      logger.error("Error creating variant:", error);
      showAlert("Varyant oluşturulurken hata oluştu", "error");
    } finally {
      setLoading(false);
    }
  };

  // Handle variant editing
  const handleEditVariant = async (variantId, variantData) => {
    try {
      setLoading(true);
      const response = await productAPI.updatePlatformVariant(
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
      logger.error("Error updating variant:", error);
      showAlert("Varyant güncellenirken hata oluştu", "error");
    } finally {
      setLoading(false);
    }
  };

  // Handle variant deletion
  const handleDeleteVariant = async (variantId) => {
    try {
      setLoading(true);
      const response = await productAPI.deletePlatformVariant(variantId);

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
      logger.error("Error deleting variant:", error);
      showAlert("Varyant silinirken hata oluştu", "error");
    } finally {
      setLoading(false);
    }
  };

  // Handle bulk variant publishing
  const handlePublishVariants = async (variantIds, platforms) => {
    try {
      setLoading(true);
      const response = await productAPI.publishVariants(variantIds, platforms);

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
      logger.error("Error publishing variants:", error);
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

      const response = await productAPI.autoMatchProducts();

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
      logger.error("Error auto-matching products:", error);
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

  // Handle product viewing (navigate to product detail page)
  const handleViewProduct = (product) => {
    setSelectedMainProduct(product);
    setShowInlineVariantDashboard(true);
    navigate(`/products/${product.id}`);
  };

  // Navigation handlers
  const handleBackToList = () => {
    setSelectedMainProduct(null);
    setShowInlineVariantDashboard(false);
    navigate("/products");
  };

  // Convert main products to display format for compatibility
  const displayProducts = mainProducts.map((product) => ({
    ...product,
    // Map advanced fields to display fields
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
      {/* Advanced Product Management Header */}
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

            {selectedProducts.length > 0 && (
              <>
                <button
                  onClick={() => setShowBulkActions(!showBulkActions)}
                  disabled={loading}
                  className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 flex items-center gap-2"
                >
                  <span>⚙️</span>
                  Toplu İşlemler ({selectedProducts.length})
                </button>

                <button
                  onClick={() => setShowMainVariantManager(true)}
                  disabled={loading}
                  className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50 flex items-center gap-2"
                >
                  <span>🔧</span>
                  Gelişmiş Yönetim ({selectedProducts.length})
                </button>
              </>
            )}
          </div>
        </div>

        {/* Bulk Actions Panel */}
        {showBulkActions && selectedProducts.length > 0 && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
            <h3 className="font-medium text-gray-900 mb-3">
              Toplu İşlemler ({selectedProducts.length} ürün seçildi)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                onClick={handleBulkMarkAsMainProducts}
                disabled={loading}
                className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 text-sm"
              >
                Ana Ürün Olarak İşaretle
              </button>
              <button
                onClick={handleBulkVariantCreation}
                disabled={loading}
                className="px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 text-sm"
              >
                Toplu Varyant Oluştur
              </button>
              <button
                onClick={() => {
                  setBulkSelectedProducts(selectedProducts);
                  setShowFieldMappingModal(true);
                }}
                disabled={loading}
                className="px-3 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50 text-sm"
              >
                Alan Eşleştirme
              </button>
            </div>
          </div>
        )}

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
        onImportProducts={() => {
          logger.info("🎯 Import Products button clicked!");
          setShowProductImportModal(true);
        }}
        onSync={loadMainProducts}
        onViewModeChange={setViewMode}
        enableVariantManagement={true}
        // Advanced product display features
        advancedMode={true}
        showVariantCount={true}
        showPublishedPlatforms={true}
        // New advanced features
        onCreateVariants={handleCreateVariantsForProduct}
        onBulkMarkAsMain={handleBulkMarkAsMainProducts}
        onFieldMapping={handleOpenFieldMapping}
      />

      {/* Advanced Product Creation Modal */}
      <ProductCreationModal
        show={showProductCreationModal}
        onHide={() => setShowProductCreationModal(false)}
        onSuccess={handleProductCreationSuccess}
        apiClient={productAPI}
      />

      {/* Advanced Variant Creation Modal */}
      <VariantCreationModal
        show={showVariantCreationModal}
        onHide={() => {
          setShowVariantCreationModal(false);
          setBulkSelectedProducts([]);
        }}
        mainProduct={selectedMainProduct}
        bulkProducts={
          bulkSelectedProducts.length > 0
            ? bulkSelectedProducts
                .map((id) => mainProducts.find((p) => p.id === id))
                .filter(Boolean)
            : undefined
        }
        onSuccess={handleVariantCreationSuccess}
        apiClient={productAPI}
      />

      {/* Platform Field Mapping Modal */}
      <PlatformFieldMapping
        show={showFieldMappingModal}
        onHide={() => setShowFieldMappingModal(false)}
        sourcePlatform={fieldMappingData?.sourcePlatform}
        targetPlatform={fieldMappingData?.targetPlatform}
        sampleData={fieldMappingData?.sampleData}
        onMappingComplete={handleFieldMappingComplete}
      />

      {/* Bulk Product Management Modal */}
      {showMainVariantManager && selectedProducts.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">
                Toplu Ürün Yönetimi ({selectedProducts.length} ürün seçildi)
              </h2>
              <button
                onClick={() => setShowMainVariantManager(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            {/* Use MainVariantManager component with correct props */}
            <MainVariantManager
              products={mainProducts}
              selectedProducts={selectedProducts}
              onSelectionChange={setSelectedProducts}
              onRefresh={() => {
                // Use setTimeout to break the synchronous execution chain
                setTimeout(() => loadMainProducts(), 10);
              }}
            />
          </div>
        </div>
      )}

      {/* Product Import Modal */}
      <ProductImportModal
        show={showProductImportModal}
        onHide={() => setShowProductImportModal(false)}
        onSuccess={handleProductImportSuccess}
        showAlert={showAlert}
      />
    </div>
  );
};

export default ProductManagement;
