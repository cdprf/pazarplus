import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Search,
  Plus,
  Filter,
  Download,
  Upload,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Image,
  Tag,
  Package,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  X,
  ArrowUpDown,
  RefreshCw,
  FileText,
  Loader,
  Globe,
  ShoppingBag,
} from "lucide-react";
import api from "../../services/api";
import { Button } from "../ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Modal } from "../ui/Modal";
import { useAlert } from "../../contexts/AlertContext";
import { Tooltip } from "../ui/Tooltip";

// Platform icons mapping
const PlatformIcons = {
  trendyol: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="#ff6000"
    >
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
    </svg>
  ),
  hepsiburada: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="#FF6000"
    >
      <path d="M20 6H4V18H20V6Z" />
    </svg>
  ),
  n11: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="#CC0000"
    >
      <path d="M12 2L2 12l10 10 10-10L12 2z" />
    </svg>
  ),
  csv: <FileText className="h-4 w-4" />,
  local: <ShoppingBag className="h-4 w-4" />,
};

const ProductManagement = () => {
  const { showAlert } = useAlert();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [productModal, setProductModal] = useState({
    open: false,
    product: null,
  });
  const [filterOptions, setFilterOptions] = useState({
    search: "",
    category: "",
    status: "",
    stockStatus: "",
  });
  const [sortOptions, setSortOptions] = useState({
    field: "updatedAt",
    order: "desc",
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [showMoreMenu, setShowMoreMenu] = useState(null);

  // Platform sync states
  const [syncingProducts, setSyncingProducts] = useState(false);
  const [syncStats, setSyncStats] = useState(null);
  const [csvImporting, setCsvImporting] = useState(false);
  const [importStats, setImportStats] = useState(null);

  // Image preview modal
  const [imagePreview, setImagePreview] = useState({
    open: false,
    url: "",
    productName: "",
  });

  // Reference to file input for CSV import
  const csvFileInputRef = useRef(null);

  // Product details view modal
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [productDetails, setProductDetails] = useState(null);

  // Analytics menu state
  const [showAnalyticsMenu, setShowAnalyticsMenu] = useState(false);

  // Product tags management
  const [tagInput, setTagInput] = useState("");

  // Product warning notifications
  const [productWarnings, setProductWarnings] = useState({});

  // Success notifications tracker
  const [successfulOperations, setSuccessfulOperations] = useState([]);

  // Platform filter state
  const [platformFilter, setPlatformFilter] = useState("all");

  // productForm state
  const [productForm, setProductForm] = useState({
    name: "",
    sku: "",
    description: "",
    category: "",
    price: "",
    costPrice: "",
    stockQuantity: "",
    minStockLevel: "",
    weight: "",
    dimensions: { length: "", width: "", height: "" },
    images: [],
    status: "active",
    platforms: {
      trendyol: { enabled: false, platformSku: "", price: "" },
      hepsiburada: { enabled: false, platformSku: "", price: "" },
      n11: { enabled: false, platformSku: "", price: "" },
      amazon: { enabled: false, platformSku: "", price: "" },
    },
    attributes: {},
    tags: [],
  });

  // Stock statuses
  const stockStatuses = [
    { value: "in_stock", label: "Stokta", variant: "success" },
    { value: "low_stock", label: "Az Stok", variant: "warning" },
    { value: "out_of_stock", label: "Stok Yok", variant: "danger" },
  ];

  // Platforms
  const platforms = [
    { value: "trendyol", label: "Trendyol", variant: "primary" },
    { value: "n11", label: "N11", variant: "secondary" },
    { value: "hepsiburada", label: "Hepsiburada", variant: "info" },
    { value: "amazon", label: "Amazon", variant: "warning" },
  ];

  const categories = [
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

  // Fetch products
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const { page, limit } = pagination;
      const { field: sortBy, order: sortOrder } = sortOptions;
      const { search, category, status, stockStatus } = filterOptions;

      // Build query params
      const params = new URLSearchParams({
        page,
        limit,
        sortBy,
        sortOrder,
      });

      if (search) params.append("search", search);
      if (category) params.append("category", category);
      if (status) params.append("status", status);
      if (stockStatus) params.append("stockStatus", stockStatus);

      const response = await api.get(`/api/products?${params.toString()}`);

      // Filter by platform if needed
      let filteredProducts = response.data.products;
      if (platformFilter !== "all") {
        filteredProducts = filteredProducts.filter((product) => {
          // Check if product has sources info from our sync process
          if (product.sources) {
            return product.sources.some(
              (source) => source.platform === platformFilter
            );
          }
          // Check platform connections in the platforms field
          if (product.platforms) {
            return Object.entries(product.platforms).some(
              ([platform, data]) => platform === platformFilter && data.enabled
            );
          }
          return false;
        });
      }

      setProducts(filteredProducts);
      setPagination({
        ...pagination,
        total: response.data.total,
        totalPages: response.data.totalPages,
      });
    } catch (error) {
      console.error("Error fetching products:", error);
      showAlert("Ürünler yüklenirken hata oluştu", "error");
    } finally {
      setLoading(false);
    }
  }, [
    pagination.page,
    pagination.limit,
    sortOptions,
    filterOptions,
    platformFilter,
    showAlert,
  ]);

  // Initial fetch
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Check stock warnings
  useEffect(() => {
    const warnings = {};
    products.forEach((product) => {
      if (product.stockQuantity <= 0) {
        warnings[product.id] = { type: "out-of-stock", message: "Stok yok!" };
      } else if (product.stockQuantity <= product.minStockLevel) {
        warnings[product.id] = { type: "low-stock", message: "Az stok!" };
      }
    });
    setProductWarnings(warnings);
  }, [products]);

  // Close more menu on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showMoreMenu && !event.target.closest('.more-menu-container')) {
        setShowMoreMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMoreMenu]);


  // Open product modal
  const openProductModal = (product = null) => {
    if (product) {
      setProductForm({
        ...product,
        platforms: product.platforms || {
          trendyol: { enabled: false, platformSku: "", price: "" },
          hepsiburada: { enabled: false, platformSku: "", price: "" },
          n11: { enabled: false, platformSku: "", price: "" },
          amazon: { enabled: false, platformSku: "", price: "" },
        },
        dimensions: product.dimensions || { length: "", width: "", height: "" },
      });
    } else {
      setProductForm({
        name: "",
        sku: "",
        description: "",
        category: "",
        price: "",
        costPrice: "",
        stockQuantity: "",
        minStockLevel: "",
        weight: "",
        dimensions: { length: "", width: "", height: "" },
        images: [],
        status: "active",
        platforms: {
          trendyol: { enabled: false, platformSku: "", price: "" },
          hepsiburada: { enabled: false, platformSku: "", price: "" },
          n11: { enabled: false, platformSku: "", price: "" },
          amazon: { enabled: false, platformSku: "", price: "" },
        },
        attributes: {},
        tags: [],
      });
    }
    setProductModal({
      open: true,
      product,
    });
  };

  // Close product modal
  const closeProductModal = () => {
    setProductModal({
      open: false,
      product: null,
    });
  };

  // Handle product form submission
  const handleSaveProduct = async () => {
    try {
      if (productModal.product) {
        await api.products.updateProduct(productModal.product.id, productForm);
        showAlert("Ürün başarıyla güncellendi", "success");
      } else {
        await api.products.createProduct(productForm);
        showAlert("Ürün başarıyla oluşturuldu", "success");
      }
      closeProductModal();
      fetchProducts();
    } catch (error) {
      console.error("Error saving product:", error);
      showAlert("Ürün kaydedilirken hata oluştu", "error");
    }
  };

  // Handle product selection
  const handleProductSelect = (id) => {
    setSelectedProducts((prev) => {
      if (prev.includes(id)) {
        return prev.filter((productId) => productId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // Handle select all products
  const handleSelectAll = () => {
    if (selectedProducts.length === products.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(products.map((p) => p.id));
    }
  };

  // Handle sort change
  const handleSort = (field) => {
    setSortOptions((prev) => ({
      field,
      order: prev.field === field && prev.order === "asc" ? "desc" : "asc",
    }));
  };

  // Handle pagination
  const handlePageChange = (newPage) => {
    setPagination({
      ...pagination,
      page: newPage,
    });
  };

  // Bulk delete products
  const handleBulkDelete = async () => {
    if (selectedProducts.length === 0) return;

    if (
      window.confirm(
        `${selectedProducts.length} ürünü silmek istediğinizden emin misiniz?`
      )
    ) {
      try {
        await api.products.bulkDelete(selectedProducts);
        fetchProducts();
        setSelectedProducts([]);
        showAlert(
          `${selectedProducts.length} ürün başarıyla silindi`,
          "success"
        );
      } catch (error) {
        console.error("Error deleting products:", error);
        showAlert("Ürünler silinirken hata oluştu", "error");
      }
    }
  };

  // Delete product
  const handleDeleteProduct = async (id) => {
    if (window.confirm("Bu ürünü silmek istediğinizden emin misiniz?")) {
      try {
        await api.products.deleteProduct(id);
        fetchProducts();
        setShowMoreMenu(null); // FIXED: Close the more menu
        showAlert("Ürün başarıyla silindi", "success");
      } catch (error) {
        console.error("Error deleting product:", error);
        showAlert("Ürün silinirken hata oluştu", "error");
      }
    }
  };

  // View product details
  const openProductDetails = (product) => {
    setProductDetails(product);
    setShowDetailsModal(true);
  };

  const closeProductDetails = () => {
    setShowDetailsModal(false);
    setProductDetails(null);
  };

  // Handle analytics menu
  const toggleAnalyticsMenu = () => {
    setShowAnalyticsMenu(!showAnalyticsMenu);
  };

  // Add product tag
  const addProductTag = (productId, tagName) => {
    if (!tagName.trim()) return;

    const updatedProducts = products.map((product) => {
      if (product.id === productId) {
        const updatedTags = [...(product.tags || []), tagName.trim()];
        return { ...product, tags: updatedTags };
      }
      return product;
    });

    setProducts(updatedProducts);
    setTagInput("");

    // Update on server
    api.products
      .updateProduct(productId, {
        tags: updatedProducts.find((p) => p.id === productId).tags,
      })
      .then(() => {
        showAlert("Etiket başarıyla eklendi", "success");
        setSuccessfulOperations([
          ...successfulOperations,
          { type: "tag-add", id: Date.now() },
        ]);
      })
      .catch((error) => {
        console.error("Error adding tag:", error);
        showAlert("Etiket eklenirken hata oluştu", "error");
      });
  };

  // Clear a success notification
  const clearSuccessNotification = (id) => {
    setSuccessfulOperations((ops) => ops.filter((op) => op.id !== id));
  };

  // Package information toggle
  const [showPackageInfo, setShowPackageInfo] = useState({});

  const togglePackageInfo = (productId) => {
    setShowPackageInfo((prev) => ({
      ...prev,
      [productId]: !prev[productId],
    }));
  };

  // Function to get stock status
  const getStockStatus = (product) => {
    if (product.stockQuantity <= 0) {
      return {
        ...stockStatuses.find((s) => s.value === "out_of_stock"),
        icon: <AlertTriangle className="h-4 w-4 mr-1 text-red-500" />,
      };
    }
    if (product.stockQuantity <= product.minStockLevel) {
      return {
        ...stockStatuses.find((s) => s.value === "low_stock"),
        icon: <AlertTriangle className="h-4 w-4 mr-1 text-amber-500" />,
      };
    }
    return {
      ...stockStatuses.find((s) => s.value === "in_stock"),
      icon: <CheckCircle className="h-4 w-4 mr-1 text-green-500" />,
    };
  };

  // Function to get platform badges
  const getPlatformBadges = (product) => {
    const activePlatforms = [];

    // Check source platforms first
    if (product.sources && Array.isArray(product.sources)) {
      const uniquePlatforms = new Set();

      product.sources.forEach((source) => {
        if (!uniquePlatforms.has(source.platform)) {
          uniquePlatforms.add(source.platform);

          const platform = platforms.find((p) => p.value === source.platform);
          if (platform) {
            activePlatforms.push({
              ...platform,
              connectionName: source.connectionName,
            });
          }
        }
      });
    }

    // Check for regular platform connections
    if (product.platforms) {
      Object.entries(product.platforms).forEach(([key, value]) => {
        if (value && value.enabled) {
          // Only add if not already added from sources
          if (!activePlatforms.some((p) => p.value === key)) {
            const platform = platforms.find((p) => p.value === key);
            if (platform) {
              activePlatforms.push(platform);
            }
          }
        }
      });
    }

    return activePlatforms;
  };

  // Function to get status variant
  const getStatusVariant = (status) => {
    switch (status) {
      case "active":
        return "success";
      case "inactive":
        return "secondary";
      default:
        return "warning";
    }
  };

  // Handle platform filter change
  const handlePlatformFilterChange = (platform) => {
    setPlatformFilter(platform);
  };

  // Handle image click - show enlarged view
  const handleImageClick = (imageUrl, productName) => {
    setImagePreview({
      open: true,
      url: imageUrl,
      productName,
    });
  };

  // Close image preview
  const closeImagePreview = () => {
    setImagePreview({
      open: false,
      url: "",
      productName: "",
    });
  };

  // Sync products from platforms
  const syncProductsFromPlatforms = async () => {
    setSyncingProducts(true);
    try {
      const response = await api.post("/api/products/sync");

      if (response.data.success) {
        setSyncStats(response.data.data);
        showAlert(
          `Başarıyla ${response.data.data.totalSaved} ürün senkronize edildi`,
          "success"
        );
        fetchProducts(); // Refresh product list
      } else {
        showAlert("Ürün senkronizasyonunda hata oluştu", "error");
      }
    } catch (error) {
      console.error("Error syncing products:", error);
      showAlert(`Ürün senkronizasyonu hatası: ${error.message}`, "error");
    } finally {
      setSyncingProducts(false);
    }
  };

  // Handle CSV import button click
  const handleCsvImportClick = () => {
    if (csvFileInputRef.current) {
      csvFileInputRef.current.click();
    }
  };

  // Handle CSV file selection
  const handleCsvFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setCsvImporting(true);
    try {
      const response = await api.post("/api/products/import/csv", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data.success) {
        setImportStats(response.data.data);
        showAlert(
          `Başarıyla ${response.data.data.imported} ürün içe aktarıldı`,
          "success"
        );
        fetchProducts(); // Refresh product list
      } else {
        showAlert("CSV içe aktarımında hata oluştu", "error");
      }
    } catch (error) {
      console.error("Error importing CSV:", error);
      showAlert(`CSV içe aktarım hatası: ${error.message}`, "error");
    } finally {
      setCsvImporting(false);
      // Reset file input
      if (csvFileInputRef.current) {
        csvFileInputRef.current.value = "";
      }
    }
  };

  // Handle CSV template download
  const downloadCsvTemplate = async () => {
    try {
      window.open("/api/products/import/template", "_blank");
    } catch (error) {
      console.error("Error downloading template:", error);
      showAlert("Şablon indirilemedi", "error");
    }
  };

  const showProductModal = productModal.open;
  const selectedProduct = productModal.product;

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Ürün Yönetimi</h1>
          <p className="page-subtitle">
            Ürünlerinizi yönetin ve e-ticaret platformlarında senkronize edin
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            onClick={toggleAnalyticsMenu}
            variant="outline"
            icon={TrendingUp}
          >
            Analytics
          </Button>
          <Button
            onClick={() => openProductModal()}
            variant="primary"
            icon={Plus}
          >
            Yeni Ürün
          </Button>
        </div>
      </div>

      {/* Analytics Menu */}
      {showAnalyticsMenu && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Ürün Performansı</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p>Satış ve stok istatistiklerini görüntüleyin</p>
              <Button
                variant="ghost"
                size="sm"
                icon={X}
                onClick={toggleAnalyticsMenu}
              />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4">
              <Button
                variant="outline"
                className="flex items-center justify-center py-8"
                onClick={() =>
                  showAlert("Satış analizi özelliği yakında!", "info")
                }
              >
                <div className="text-center">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                  <span>Satış Analizi</span>
                </div>
              </Button>
              <Button
                variant="outline"
                className="flex items-center justify-center py-8"
                onClick={() => showAlert("Stok durumu raporu yakında!", "info")}
              >
                <div className="text-center">
                  <Package className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <span>Stok Durumu</span>
                </div>
              </Button>
              <Button
                variant="outline"
                className="flex items-center justify-center py-8"
                onClick={() => showAlert("Kategori analizi yakında!", "info")}
              >
                <div className="text-center">
                  <Tag className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                  <span>Kategori Analizi</span>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success Notifications */}
      {successfulOperations.length > 0 && (
        <div className="mb-4">
          {successfulOperations.map((op) => (
            <div
              key={op.id}
              className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-4 flex items-center justify-between mb-2"
            >
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                <span className="text-green-800 dark:text-green-300 font-medium">
                  {op.type === "tag-add"
                    ? "Etiket başarıyla eklendi"
                    : "İşlem başarılı"}
                </span>
              </div>
              <Button
                onClick={() => clearSuccessNotification(op.id)}
                variant="ghost"
                size="sm"
                icon={X}
              />
            </div>
          ))}
        </div>
      )}

      {/* Actions & Filters */}
      <div className="mb-4 flex flex-col md:flex-row gap-4">
        <div className="flex-grow flex flex-wrap gap-2">
          {/* Search */}
          <div className="flex-grow md:max-w-xs">
            <div className="relative">
              <input
                type="text"
                placeholder="Ürün ara..."
                value={filterOptions.search}
                onChange={(e) =>
                  setFilterOptions({
                    ...filterOptions,
                    search: e.target.value,
                  })
                }
                className="form-input pl-10 pr-4 py-2 w-full"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            </div>
          </div>

          {/* Filters */}
          <div>
            <Button
              variant="outline"
              icon={Filter}
              className="relative"
              onClick={() => {
                showAlert("Gelişmiş filtreler yakında!", "info");
              }}
            >
              Filtrele
            </Button>
          </div>

          {/* Platform filter */}
          <div className="flex items-center">
            <select
              value={platformFilter}
              onChange={(e) => handlePlatformFilterChange(e.target.value)}
              className="form-select"
            >
              <option value="all">Tüm Platformlar</option>
              <option value="trendyol">Trendyol</option>
              <option value="hepsiburada">Hepsiburada</option>
              <option value="n11">N11</option>
              <option value="csv">CSV</option>
              <option value="local">Yerel</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Sync Products Button */}
          <Tooltip content="Tüm platformlardan ürünleri senkronize et ve birleştir">
            <Button
              variant="outline"
              icon={syncingProducts ? Loader : RefreshCw}
              onClick={syncProductsFromPlatforms}
              disabled={syncingProducts}
              className={syncingProducts ? "animate-spin" : ""}
            >
              {syncingProducts
                ? "Senkronize Ediliyor..."
                : "Platformlardan Senkronize Et"}
            </Button>
          </Tooltip>

          {/* CSV Import Button */}
          <Tooltip content="CSV dosyasından ürün ekle">
            <Button
              variant="outline"
              icon={csvImporting ? Loader : Upload}
              onClick={handleCsvImportClick}
              disabled={csvImporting}
            >
              CSV İçe Aktar
            </Button>
            <input
              type="file"
              ref={csvFileInputRef}
              accept=".csv"
              onChange={handleCsvFileChange}
              className="hidden"
            />
          </Tooltip>

          {/* CSV Template Button */}
          <Tooltip content="CSV şablonunu indir">
            <Button
              variant="outline"
              icon={Download}
              onClick={downloadCsvTemplate}
            >
              Şablon
            </Button>
          </Tooltip>
        </div>
      </div>

      {/* Sync & Import Stats */}
      {(syncStats || importStats) && (
        <div className="mb-4">
          {syncStats && (
            <Card className="mb-2">
              <CardContent className="py-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium">Senkronizasyon Sonuçları</h3>
                    <p className="text-sm text-gray-500">
                      Toplam {syncStats.totalFetched} ürün getirildi,{" "}
                      {syncStats.totalMerged} ürün birleştirildi,{" "}
                      {syncStats.totalSaved} ürün kaydedildi
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={X}
                    onClick={() => setSyncStats(null)}
                  />
                </div>

                {syncStats.platformResults && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {syncStats.platformResults.map((result, index) => (
                      <Badge
                        key={index}
                        variant={result.success ? "success" : "danger"}
                      >
                        {result.platform}:{" "}
                        {result.success
                          ? `${result.count || 0} ürün`
                          : result.error}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {importStats && (
            <Card className="mb-2">
              <CardContent className="py-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium">CSV İçe Aktarım Sonuçları</h3>
                    <p className="text-sm text-gray-500">
                      {importStats.imported} ürün içe aktarıldı{" "}
                      {importStats.errors
                        ? `, ${importStats.errors.length} hata`
                        : ""}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={X}
                    onClick={() => setImportStats(null)}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Selected Items Actions */}
      {selectedProducts.length > 0 && (
        <div className="mb-4 flex justify-between items-center p-3 bg-blue-50 border border-blue-200 dark:bg-blue-900/20 dark:border-blue-800 rounded-md">
          <span className="text-sm font-medium">
            {selectedProducts.length} ürün seçildi
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                /* Bulk Edit */
              }}
            >
              Toplu Düzenle
            </Button>
            <Button variant="danger" size="sm" onClick={handleBulkDelete}>
              Sil
            </Button>
          </div>
        </div>
      )}

      {/* Products Table */}
      <Card>
        {loading ? (
          <div className="p-8 text-center">
            <div className="spinner spinner-lg mx-auto mb-4"></div>
            <p className="text-gray-500 dark:text-gray-400">
              Ürünler yükleniyor...
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={
                          selectedProducts.length === products.length &&
                          products.length > 0
                        }
                        onChange={handleSelectAll}
                        className="form-checkbox"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Ürün
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                      onClick={() => handleSort("sku")}
                    >
                      <div className="flex items-center">
                        SKU
                        <ArrowUpDown className="ml-1 h-4 w-4" />
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                      onClick={() => handleSort("category")}
                    >
                      <div className="flex items-center">
                        Kategori
                        <ArrowUpDown className="ml-1 h-4 w-4" />
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                      onClick={() => handleSort("price")}
                    >
                      <div className="flex items-center">
                        Fiyat
                        <ArrowUpDown className="ml-1 h-4 w-4" />
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                      onClick={() => handleSort("stockQuantity")}
                    >
                      <div className="flex items-center">
                        Stok
                        <ArrowUpDown className="ml-1 h-4 w-4" />
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      <div className="flex items-center">
                        Platformlar
                        <Globe className="ml-1 h-4 w-4" />
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Durum
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      İşlemler
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {products.length === 0 ? (
                    <tr>
                      <td
                        colSpan="9"
                        className="px-6 py-8 text-center text-gray-500 dark:text-gray-400"
                      >
                        Ürün bulunamadı. Yeni ürün ekleyin veya farklı bir arama
                        kriteri deneyin.
                      </td>
                    </tr>
                  ) : (
                    products.map((product) => {
                      const stockStatus = getStockStatus(product);
                      const activePlatforms = getPlatformBadges(product);

                      return (
                        <tr
                          key={product.id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={selectedProducts.includes(product.id)}
                              onChange={() => handleProductSelect(product.id)}
                              className="form-checkbox"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div
                                className="flex-shrink-0 h-12 w-12 relative cursor-pointer"
                                onClick={() =>
                                  product.images &&
                                  product.images.length > 0 &&
                                  handleImageClick(
                                    product.images[0],
                                    product.name
                                  )
                                }
                              >
                                {product.images && product.images.length > 0 ? (
                                  <img
                                    className="h-12 w-12 rounded-lg object-cover hover:opacity-80 transition-opacity"
                                    src={product.images[0]}
                                    alt={product.name}
                                  />
                                ) : (
                                  <div className="h-12 w-12 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                    <Image className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                                  </div>
                                )}
                                {product.images &&
                                  product.images.length > 1 && (
                                    <div className="absolute bottom-0 right-0 bg-gray-800 bg-opacity-75 rounded-full w-5 h-5 flex items-center justify-center">
                                      <span className="text-xs text-white">
                                        +{product.images.length - 1}
                                      </span>
                                    </div>
                                  )}
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                  {product.name}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {product.description?.substring(0, 50)}...
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                            {product.sku}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge variant="secondary">
                              {product.category}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                            ₺{product.price?.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {stockStatus.icon}
                              <Badge variant={stockStatus.variant}>
                                {product.stockQuantity}
                              </Badge>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-wrap gap-1">
                              {activePlatforms.length > 0 ? (
                                activePlatforms.map((platform, index) => (
                                  <Tooltip
                                    key={index}
                                    content={
                                      platform.connectionName || platform.label
                                    }
                                  >
                                    <Badge
                                      variant={platform.variant}
                                      className="flex items-center space-x-1"
                                    >
                                      <span className="flex items-center">
                                        {PlatformIcons[platform.value] || (
                                          <Globe className="h-3 w-3 mr-1" />
                                        )}
                                        {platform.label}
                                      </span>
                                    </Badge>
                                  </Tooltip>
                                ))
                              ) : (
                                <Badge variant="secondary">Yerel</Badge>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge variant={getStatusVariant(product.status)}>
                              {product.status === "active"
                                ? "Aktif"
                                : product.status === "inactive"
                                ? "Pasif"
                                : "Taslak"}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end space-x-2">
                              <Button
                                onClick={() => togglePackageInfo(product.id)}
                                variant="ghost"
                                size="sm"
                                icon={Package}
                                title="Paket Bilgileri"
                              />
                              <Button
                                onClick={() => openProductDetails(product)}
                                variant="ghost"
                                size="sm"
                                icon={Eye}
                                title="Ürün Detayları"
                              />
                              <Button
                                onClick={() => openProductModal(product)}
                                variant="ghost"
                                size="sm"
                                icon={Edit}
                                title="Düzenle"
                              />
                              <div className="relative more-menu-container">
                                <Button
                                  onClick={() =>
                                    setShowMoreMenu((prev) =>
                                      prev === product.id ? null : product.id
                                    )
                                  }
                                  variant="ghost"
                                  size="sm"
                                  icon={MoreVertical}
                                  title="Daha Fazla"
                                />
                                {showMoreMenu === product.id && (
                                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg z-10 border border-gray-200 dark:border-gray-700">
                                    <div className="py-1">
                                      <button
                                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                                        onClick={() =>
                                          handleDeleteProduct(product.id)
                                        }
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Sil
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {products.length > 0 && (
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {pagination.total} ürün içinden{" "}
                  {(pagination.page - 1) * pagination.limit + 1} -{" "}
                  {Math.min(
                    pagination.page * pagination.limit,
                    pagination.total
                  )}{" "}
                  gösteriliyor
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page === 1}
                    onClick={() => handlePageChange(pagination.page - 1)}
                  >
                    Önceki
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page === pagination.totalPages}
                    onClick={() => handlePageChange(pagination.page + 1)}
                  >
                    Sonraki
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Product Modal */}
      <Modal
        isOpen={showProductModal}
        onClose={closeProductModal}
        title={selectedProduct ? "Ürün Düzenle" : "Yeni Ürün Ekle"}
        size="xl"
      >
        <div className="space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
              Temel Bilgiler
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Ürün Adı *
                </label>
                <input
                  type="text"
                  value={productForm.name}
                  onChange={(e) =>
                    setProductForm((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  className="form-input"
                  placeholder="Ürün adını girin"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  SKU *
                </label>
                <input
                  type="text"
                  value={productForm.sku}
                  onChange={(e) =>
                    setProductForm((prev) => ({ ...prev, sku: e.target.value }))
                  }
                  className="form-input"
                  placeholder="Ürün kodunu girin"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Açıklama
                </label>
                <textarea
                  value={productForm.description}
                  onChange={(e) =>
                    setProductForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  rows={3}
                  className="form-input"
                  placeholder="Ürün açıklamasını girin"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Kategori *
                </label>
                <select
                  value={productForm.category}
                  onChange={(e) =>
                    setProductForm((prev) => ({
                      ...prev,
                      category: e.target.value,
                    }))
                  }
                  className="form-input"
                >
                  <option value="">Kategori seçin</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Durum
                </label>
                <select
                  value={productForm.status}
                  onChange={(e) =>
                    setProductForm((prev) => ({
                      ...prev,
                      status: e.target.value,
                    }))
                  }
                  className="form-input"
                >
                  <option value="active">Aktif</option>
                  <option value="inactive">Pasif</option>
                  <option value="draft">Taslak</option>
                </select>
              </div>
            </div>
          </div>

          {/* Pricing & Stock */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
              Fiyat ve Stok
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Satış Fiyatı (₺) *
                </label>
                <input
                  type="number"
                  value={productForm.price}
                  onChange={(e) =>
                    setProductForm((prev) => ({
                      ...prev,
                      price: e.target.value,
                    }))
                  }
                  className="form-input"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Maliyet Fiyatı (₺)
                </label>
                <input
                  type="number"
                  value={productForm.costPrice}
                  onChange={(e) =>
                    setProductForm((prev) => ({
                      ...prev,
                      costPrice: e.target.value,
                    }))
                  }
                  className="form-input"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Stok Miktarı *
                </label>
                <input
                  type="number"
                  value={productForm.stockQuantity}
                  onChange={(e) =>
                    setProductForm((prev) => ({
                      ...prev,
                      stockQuantity: e.target.value,
                    }))
                  }
                  className="form-input"
                  placeholder="0"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Minimum Stok
                </label>
                <input
                  type="number"
                  value={productForm.minStockLevel}
                  onChange={(e) =>
                    setProductForm((prev) => ({
                      ...prev,
                      minStockLevel: e.target.value,
                    }))
                  }
                  className="form-input"
                  placeholder="0"
                  min="0"
                />
              </div>
            </div>
          </div>

          {/* Product Dimensions */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
              Boyut ve Ağırlık
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Uzunluk (cm)
                </label>
                <input
                  type="number"
                  value={productForm.dimensions.length}
                  onChange={(e) =>
                    setProductForm((prev) => ({
                      ...prev,
                      dimensions: {
                        ...prev.dimensions,
                        length: e.target.value,
                      },
                    }))
                  }
                  className="form-input"
                  placeholder="0"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Genişlik (cm)
                </label>
                <input
                  type="number"
                  value={productForm.dimensions.width}
                  onChange={(e) =>
                    setProductForm((prev) => ({
                      ...prev,
                      dimensions: { ...prev.dimensions, width: e.target.value },
                    }))
                  }
                  className="form-input"
                  placeholder="0"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Yükseklik (cm)
                </label>
                <input
                  type="number"
                  value={productForm.dimensions.height}
                  onChange={(e) =>
                    setProductForm((prev) => ({
                      ...prev,
                      dimensions: {
                        ...prev.dimensions,
                        height: e.target.value,
                      },
                    }))
                  }
                  className="form-input"
                  placeholder="0"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Ağırlık (kg)
                </label>
                <input
                  type="number"
                  value={productForm.weight}
                  onChange={(e) =>
                    setProductForm((prev) => ({
                      ...prev,
                      weight: e.target.value,
                    }))
                  }
                  className="form-input"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                />
              </div>
            </div>
          </div>

          {/* Platform Settings */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
              Platform Ayarları
            </h3>
            <div className="space-y-4">
              {platforms.map((platform) => (
                <Card key={platform.value}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={
                            productForm.platforms[platform.value]?.enabled ||
                            false
                          }
                          onChange={(e) =>
                            setProductForm((prev) => ({
                              ...prev,
                              platforms: {
                                ...prev.platforms,
                                [platform.value]: {
                                  ...prev.platforms[platform.value],
                                  enabled: e.target.checked,
                                },
                              },
                            }))
                          }
                          className="form-checkbox mr-3"
                        />
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {platform.label}
                        </span>
                      </div>
                    </div>
                    {productForm.platforms[platform.value]?.enabled && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Platform SKU
                          </label>
                          <input
                            type="text"
                            value={
                              productForm.platforms[platform.value]
                                ?.platformSku || ""
                            }
                            onChange={(e) =>
                              setProductForm((prev) => ({
                                ...prev,
                                platforms: {
                                  ...prev.platforms,
                                  [platform.value]: {
                                    ...prev.platforms[platform.value],
                                    platformSku: e.target.value,
                                  },
                                },
                              }))
                            }
                            className="form-input"
                            placeholder="Platform SKU"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Platform Fiyatı (₺)
                          </label>
                          <input
                            type="number"
                            value={
                              productForm.platforms[platform.value]?.price || ""
                            }
                            onChange={(e) =>
                              setProductForm((prev) => ({
                                ...prev,
                                platforms: {
                                  ...prev.platforms,
                                  [platform.value]: {
                                    ...prev.platforms[platform.value],
                                    price: e.target.value,
                                  },
                                },
                              }))
                            }
                            className="form-input"
                            placeholder="0.00"
                            step="0.01"
                            min="0"
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
          <Button onClick={closeProductModal} variant="outline">
            İptal
          </Button>
          <Button onClick={handleSaveProduct} variant="primary">
            {selectedProduct ? "Güncelle" : "Kaydet"}
          </Button>
        </div>
      </Modal>

      {/* Product Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={closeProductDetails}
        title="Ürün Detayları"
        size="lg"
      >
        {productDetails && (
          <div className="space-y-6">
            {/* Product Images */}
            <div className="flex justify-center">
              {productDetails.images && productDetails.images.length > 0 ? (
                <div className="relative">
                  <img
                    src={productDetails.images[0]}
                    alt={productDetails.name}
                    className="h-48 w-auto object-contain cursor-pointer hover:opacity-90"
                    onClick={() =>
                      handleImageClick(
                        productDetails.images[0],
                        productDetails.name
                      )
                    }
                  />
                  {productDetails.images.length > 1 && (
                    <div className="mt-2 flex flex-wrap justify-center gap-2">
                      {productDetails.images.slice(1).map((img, index) => (
                        <div
                          key={index}
                          className="h-12 w-12 cursor-pointer hover:opacity-80"
                        >
                          <img
                            src={img}
                            alt={`${productDetails.name} ${index + 2}`}
                            className="h-12 w-12 object-cover rounded"
                            onClick={() =>
                              handleImageClick(img, productDetails.name)
                            }
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-48 w-48 bg-gray-200 dark:bg-gray-700 flex items-center justify-center rounded-md">
                  <Image className="h-16 w-16 text-gray-400 dark:text-gray-500" />
                </div>
              )}
            </div>

            {/* Product Info */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {productDetails.name}
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mt-2">
                {productDetails.description}
              </p>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    SKU
                  </p>
                  <p className="font-medium">{productDetails.sku}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Kategori
                  </p>
                  <p className="font-medium">{productDetails.category}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Fiyat
                  </p>
                  <p className="font-medium">
                    ₺{productDetails.price?.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Stok
                  </p>
                  <p className="font-medium">{productDetails.stockQuantity}</p>
                </div>
                {productDetails.barcode && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Barkod
                    </p>
                    <p className="font-medium">{productDetails.barcode}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Tags */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                Etiketler
              </h3>
              <div className="flex flex-wrap gap-2">
                {productDetails.tags && productDetails.tags.length > 0 ? (
                  productDetails.tags.map((tag, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="flex items-center gap-1"
                    >
                      <Tag className="h-3 w-3" />
                      {tag}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Henüz etiket eklenmemiş
                  </p>
                )}
              </div>
              <div className="mt-4 flex">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Yeni etiket ekle"
                  className="form-input flex-1"
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      addProductTag(productDetails.id, tagInput);
                    }
                  }}
                />
                <Button
                  onClick={() => addProductTag(productDetails.id, tagInput)}
                  variant="outline"
                  className="ml-2"
                >
                  Ekle
                </Button>
              </div>
            </div>

            {/* Platform Status */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                Platform Durumu
              </h3>

              {/* Show sources from synced platforms */}
              {productDetails.sources && productDetails.sources.length > 0 ? (
                <div className="space-y-2">
                  {productDetails.sources.map((source, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 border border-gray-200 dark:border-gray-700 rounded-md"
                    >
                      <div className="flex items-center">
                        {PlatformIcons[source.platform] || (
                          <Globe className="h-4 w-4 mr-2" />
                        )}
                        <span className="ml-1">
                          {source.connectionName || source.platform}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs">
                          SKU: {source.sku || "N/A"}
                        </span>
                        <span className="text-xs">
                          Stok: {source.stockQuantity || 0}
                        </span>
                        <Badge variant="success">Aktif</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : productDetails.platforms ? (
                <div className="space-y-2">
                  {Object.entries(productDetails.platforms).map(
                    ([key, value]) => (
                      <div
                        key={key}
                        className="flex items-center justify-between p-2 border border-gray-200 dark:border-gray-700 rounded-md"
                      >
                        <span>
                          {platforms.find((p) => p.value === key)?.label || key}
                        </span>
                        <Badge
                          variant={value?.enabled ? "success" : "secondary"}
                        >
                          {value?.enabled ? "Aktif" : "Pasif"}
                        </Badge>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Platform bağlantısı yok
                </p>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
          <Button onClick={closeProductDetails} variant="outline">
            Kapat
          </Button>
          <Button
            onClick={() => {
              closeProductDetails();
              openProductModal(productDetails);
            }}
            variant="primary"
          >
            Düzenle
          </Button>
        </div>
      </Modal>

      {/* Image Preview Modal */}
      <Modal
        isOpen={imagePreview.open}
        onClose={closeImagePreview}
        title={`${imagePreview.productName || "Ürün"} - Resim Önizleme`}
        size="xl"
      >
        <div className="flex justify-center items-center h-full">
          <img
            src={imagePreview.url}
            alt={imagePreview.productName}
            className="max-h-[80vh] max-w-full object-contain"
          />
        </div>
        <div className="flex justify-end mt-4">
          <Button onClick={closeImagePreview} variant="outline">
            Kapat
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default ProductManagement;
