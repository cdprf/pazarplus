import React, { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import api from "../../services/api";
import { Button } from "../ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Modal } from "../ui/Modal";
import { useAlert } from "../../contexts/AlertContext";

const ProductManagement = () => {
  const { showAlert } = useAlert();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [sortConfig, setSortConfig] = useState({
    key: "name",
    direction: "asc",
  });

  const [filters, setFilters] = useState({
    status: "",
    category: "",
    platform: "",
    stockStatus: "",
    priceRange: { min: "", max: "" },
  });

  // Product form state
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
    },
    attributes: {},
    tags: [],
  });

  // Sample categories for Turkish e-commerce
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

  const stockStatuses = [
    { value: "in_stock", label: "Stokta Var", variant: "success" },
    { value: "low_stock", label: "Az Stok", variant: "warning" },
    { value: "out_of_stock", label: "Stok Yok", variant: "danger" },
    { value: "discontinued", label: "Üretim Durduruldu", variant: "secondary" },
  ];

  const platforms = [
    { value: "trendyol", label: "Trendyol", variant: "warning" },
    { value: "hepsiburada", label: "Hepsiburada", variant: "info" },
    { value: "n11", label: "N11", variant: "purple" },
  ];

  // Fetch products
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        limit: 20,
        search: searchTerm,
        sortBy: sortConfig.key,
        sortOrder: sortConfig.direction,
        ...filters,
      };

      const response = await api.products.getProducts(params);
      setProducts(response.products || []);
      setTotalPages(response.totalPages || 1);
      setTotalProducts(response.total || 0);
    } catch (error) {
      console.error("Error fetching products:", error);
      showAlert("Ürünler yüklenirken hata oluştu", "error");
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, sortConfig, filters, showAlert]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Handle search
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  // Handle sort
  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  // Handle product selection
  const handleProductSelect = (productId) => {
    setSelectedProducts((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

  const handleSelectAll = () => {
    setSelectedProducts((prev) =>
      prev.length === products.length ? [] : products.map((p) => p.id)
    );
  };

  // Modal handlers
  const openProductModal = (product = null) => {
    if (product) {
      setSelectedProduct(product);
      setProductForm({
        ...product,
        platforms: product.platforms || {
          trendyol: { enabled: false, platformSku: "", price: "" },
          hepsiburada: { enabled: false, platformSku: "", price: "" },
          n11: { enabled: false, platformSku: "", price: "" },
        },
      });
    } else {
      setSelectedProduct(null);
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
        },
        attributes: {},
        tags: [],
      });
    }
    setShowProductModal(true);
  };

  const closeProductModal = () => {
    setShowProductModal(false);
    setSelectedProduct(null);
  };

  // Save product
  const handleSaveProduct = async () => {
    try {
      if (selectedProduct) {
        await api.products.updateProduct(selectedProduct.id, productForm);
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

  // Delete product
  const handleDeleteProduct = async (productId) => {
    if (window.confirm("Bu ürünü silmek istediğinizden emin misiniz?")) {
      try {
        await api.products.deleteProduct(productId);
        showAlert("Ürün başarıyla silindi", "success");
        fetchProducts();
      } catch (error) {
        console.error("Error deleting product:", error);
        showAlert("Ürün silinirken hata oluştu", "error");
      }
    }
  };

  // Bulk actions
  const handleBulkAction = async (action) => {
    if (selectedProducts.length === 0) {
      showAlert("Lütfen işlem yapmak için ürün seçin", "warning");
      return;
    }

    try {
      switch (action) {
        case "delete":
          if (
            window.confirm(
              `${selectedProducts.length} ürünü silmek istediğinizden emin misiniz?`
            )
          ) {
            await api.products.bulkDelete(selectedProducts);
            showAlert("Seçili ürünler başarıyla silindi", "success");
            setSelectedProducts([]);
            fetchProducts();
          }
          break;
        case "activate":
          await api.products.bulkUpdateStatus(selectedProducts, "active");
          showAlert("Seçili ürünler aktif edildi", "success");
          setSelectedProducts([]);
          fetchProducts();
          break;
        case "deactivate":
          await api.products.bulkUpdateStatus(selectedProducts, "inactive");
          showAlert("Seçili ürünler pasif edildi", "success");
          setSelectedProducts([]);
          fetchProducts();
          break;
        default:
          break;
      }
    } catch (error) {
      console.error("Error in bulk action:", error);
      showAlert("Toplu işlem sırasında hata oluştu", "error");
    }
  };

  // Get stock status
  const getStockStatus = (product) => {
    if (product.stockQuantity <= 0)
      return stockStatuses.find((s) => s.value === "out_of_stock");
    if (product.stockQuantity <= product.minStockLevel)
      return stockStatuses.find((s) => s.value === "low_stock");
    return stockStatuses.find((s) => s.value === "in_stock");
  };

  // Get platform badges
  const getPlatformBadges = (product) => {
    return platforms.filter(
      (platform) =>
        product.platforms && product.platforms[platform.value]?.enabled
    );
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case "active":
        return "success";
      case "inactive":
        return "danger";
      case "draft":
        return "warning";
      default:
        return "secondary";
    }
  };

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
        <Button
          onClick={() => openProductModal()}
          variant="primary"
          icon={Plus}
        >
          Yeni Ürün
        </Button>
      </div>

      {/* Search and Actions */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Ürün adı, SKU veya kategori ara..."
            value={searchTerm}
            onChange={handleSearch}
            className="form-input pl-10"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={() => setShowFilters(!showFilters)}
            variant="outline"
            icon={Filter}
          >
            Filtrele
          </Button>
          <Button variant="outline" icon={Upload}>
            İçe Aktar
          </Button>
          <Button variant="outline" icon={Download}>
            Dışa Aktar
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Durum
                </label>
                <select
                  value={filters.status}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, status: e.target.value }))
                  }
                  className="form-input"
                >
                  <option value="">Tümü</option>
                  <option value="active">Aktif</option>
                  <option value="inactive">Pasif</option>
                  <option value="draft">Taslak</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Kategori
                </label>
                <select
                  value={filters.category}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      category: e.target.value,
                    }))
                  }
                  className="form-input"
                >
                  <option value="">Tümü</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Platform
                </label>
                <select
                  value={filters.platform}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      platform: e.target.value,
                    }))
                  }
                  className="form-input"
                >
                  <option value="">Tümü</option>
                  {platforms.map((platform) => (
                    <option key={platform.value} value={platform.value}>
                      {platform.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Stok Durumu
                </label>
                <select
                  value={filters.stockStatus}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      stockStatus: e.target.value,
                    }))
                  }
                  className="form-input"
                >
                  <option value="">Tümü</option>
                  {stockStatuses.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bulk Actions */}
      {selectedProducts.length > 0 && (
        <Card className="mb-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-blue-800 dark:text-blue-300 font-medium">
                {selectedProducts.length} ürün seçildi
              </span>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleBulkAction("activate")}
                  variant="success"
                  size="sm"
                >
                  Aktif Et
                </Button>
                <Button
                  onClick={() => handleBulkAction("deactivate")}
                  variant="warning"
                  size="sm"
                >
                  Pasif Et
                </Button>
                <Button
                  onClick={() => handleBulkAction("delete")}
                  variant="danger"
                  size="sm"
                >
                  Sil
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
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
                      Platformlar
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
                  {products.map((product) => {
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
                            <div className="flex-shrink-0 h-12 w-12">
                              {product.images && product.images.length > 0 ? (
                                <img
                                  className="h-12 w-12 rounded-lg object-cover"
                                  src={product.images[0]}
                                  alt={product.name}
                                />
                              ) : (
                                <div className="h-12 w-12 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                  <Image className="h-6 w-6 text-gray-400 dark:text-gray-500" />
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
                          <Badge variant="secondary">{product.category}</Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          ₺{product.price?.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={stockStatus.variant}>
                            {product.stockQuantity}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex space-x-1">
                            {activePlatforms.map((platform) => (
                              <Badge
                                key={platform.value}
                                variant={platform.variant}
                              >
                                {platform.label}
                              </Badge>
                            ))}
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
                              onClick={() => openProductModal(product)}
                              variant="ghost"
                              size="sm"
                              icon={Edit}
                            />
                            <Button
                              onClick={() => handleDeleteProduct(product.id)}
                              variant="ghost"
                              size="sm"
                              icon={Trash2}
                              className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-white dark:bg-gray-900 px-4 py-3 border-t border-gray-200 dark:border-gray-700 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex justify-between flex-1 sm:hidden">
                    <Button
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(prev - 1, 1))
                      }
                      disabled={currentPage === 1}
                      variant="outline"
                      size="sm"
                    >
                      Önceki
                    </Button>
                    <Button
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                      }
                      disabled={currentPage === totalPages}
                      variant="outline"
                      size="sm"
                    >
                      Sonraki
                    </Button>
                  </div>
                  <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        <span className="font-medium">
                          {(currentPage - 1) * 20 + 1}
                        </span>{" "}
                        -{" "}
                        <span className="font-medium">
                          {Math.min(currentPage * 20, totalProducts)}
                        </span>{" "}
                        arası, toplam{" "}
                        <span className="font-medium">{totalProducts}</span>{" "}
                        ürün
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                        <Button
                          onClick={() =>
                            setCurrentPage((prev) => Math.max(prev - 1, 1))
                          }
                          disabled={currentPage === 1}
                          variant="outline"
                          size="sm"
                          className="rounded-r-none"
                        >
                          Önceki
                        </Button>
                        {[...Array(totalPages)].map((_, i) => (
                          <Button
                            key={i + 1}
                            onClick={() => setCurrentPage(i + 1)}
                            variant={
                              currentPage === i + 1 ? "primary" : "outline"
                            }
                            size="sm"
                            className="rounded-none"
                          >
                            {i + 1}
                          </Button>
                        ))}
                        <Button
                          onClick={() =>
                            setCurrentPage((prev) =>
                              Math.min(prev + 1, totalPages)
                            )
                          }
                          disabled={currentPage === totalPages}
                          variant="outline"
                          size="sm"
                          className="rounded-l-none"
                        >
                          Sonraki
                        </Button>
                      </nav>
                    </div>
                  </div>
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
    </div>
  );
};

export default ProductManagement;
