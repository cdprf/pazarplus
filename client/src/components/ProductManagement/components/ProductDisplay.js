import React, { useState, useCallback, useMemo } from "react";
import {
  Eye,
  Edit,
  Trash2,
  MoreVertical,
  Copy,
  Package,
  Image,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  SortAsc,
  SortDesc,
  Star,
  ExternalLink,
  FileText,
  ShoppingBag,
  Globe,
  List,
  Grid3X3,
  RefreshCw,
} from "lucide-react";

// Import shared components
import {
  Button,
  Card,
  CardHeader,
  CardContent,
  Badge,
  Tooltip,
} from "../shared/UIComponents";
import { PLATFORMS } from "../shared/constants";

// Platform Icons
const PlatformIcons = {
  trendyol: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="#ff6000"
      className="flex-shrink-0"
    >
      <circle cx="12" cy="12" r="10" />
    </svg>
  ),
  hepsiburada: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="#FF6000"
      className="flex-shrink-0"
    >
      <rect x="4" y="6" width="16" height="12" />
    </svg>
  ),
  n11: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="#CC0000"
      className="flex-shrink-0"
    >
      <polygon points="12,2 2,12 12,22 22,12" />
    </svg>
  ),
  amazon: <Globe className="h-4 w-4 flex-shrink-0 text-orange-500" />,
  csv: <FileText className="h-4 w-4 flex-shrink-0 text-gray-500" />,
  local: <ShoppingBag className="h-4 w-4 flex-shrink-0 text-gray-500" />,
};

// Utility functions
const getStockStatus = (product) => {
  if (product.stockQuantity <= 0) {
    return {
      value: "out_of_stock",
      label: "Stok Yok",
      variant: "danger",
      icon: <AlertCircle className="h-4 w-4 mr-1 text-red-500" />,
    };
  }
  if (product.stockQuantity <= product.minStockLevel) {
    return {
      value: "low_stock",
      label: "Az Stok",
      variant: "warning",
      icon: <AlertTriangle className="h-4 w-4 mr-1 text-amber-500" />,
    };
  }
  return {
    value: "in_stock",
    label: "Stokta",
    variant: "success",
    icon: <CheckCircle className="h-4 w-4 mr-1 text-green-500" />,
  };
};

const getPlatformBadges = (product) => {
  const activePlatforms = [];

  // Check sources first
  if (product.sources && Array.isArray(product.sources)) {
    const uniquePlatforms = new Set();

    product.sources.forEach((source) => {
      if (!uniquePlatforms.has(source.platform)) {
        uniquePlatforms.add(source.platform);
        activePlatforms.push({
          value: source.platform,
          label:
            source.platform.charAt(0).toUpperCase() + source.platform.slice(1),
          variant: "default",
          connectionName: source.connectionName,
          icon: PlatformIcons[source.platform] || <Globe className="h-4 w-4" />,
        });
      }
    });
  }

  // Check platform connections
  if (product.platforms) {
    Object.entries(product.platforms).forEach(([key, value]) => {
      if (
        value &&
        value.enabled &&
        !activePlatforms.some((p) => p.value === key)
      ) {
        activePlatforms.push({
          value: key,
          label: key.charAt(0).toUpperCase() + key.slice(1),
          variant: "default",
          icon: PlatformIcons[key] || <Globe className="h-4 w-4" />,
        });
      }
    });
  }

  return activePlatforms;
};

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

const formatPrice = (price) => {
  return `₺${
    price?.toLocaleString("tr-TR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) || "0.00"
  }`;
};

// Product Card Component for Grid View
const ProductCard = ({
  product,
  onView,
  onEdit,
  onDelete,
  onImageClick,
  isSelected,
  onSelect,
  showMoreMenu,
  onToggleMoreMenu,
}) => {
  const stockStatus = getStockStatus(product);
  const activePlatforms = getPlatformBadges(product);

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 overflow-hidden">
      {/* Product Image */}
      <div className="relative">
        {product.images && product.images.length > 0 ? (
          <div className="relative overflow-hidden">
            <img
              src={product.images[0]}
              alt={product.name}
              className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105 cursor-pointer"
              onClick={() => onImageClick?.(product.images[0], product.name)}
            />
            {product.images.length > 1 && (
              <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full">
                +{product.images.length - 1}
              </div>
            )}
          </div>
        ) : (
          <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
            <Image className="h-12 w-12 text-gray-400" />
          </div>
        )}

        {/* Status Badge */}
        <div className="absolute top-2 left-2">
          <Badge variant={getStatusVariant(product.status)} className="text-xs">
            {product.status === "active"
              ? "Aktif"
              : product.status === "inactive"
              ? "Pasif"
              : "Taslak"}
          </Badge>
        </div>

        {/* Selection Checkbox */}
        <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelect?.(product.id)}
            className="w-4 h-4 text-blue-600 bg-white border-2 border-gray-300 rounded focus:ring-blue-500"
          />
        </div>
      </div>

      <CardContent className="p-4">
        {/* Product Info */}
        <div className="mb-3">
          <h3 className="font-medium text-gray-900 line-clamp-2 mb-1">
            {product.name}
          </h3>
          <p className="text-sm text-gray-500">{product.sku}</p>
        </div>

        {/* Metadata */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Kategori:</span>
            <Badge variant="secondary" className="text-xs">
              {product.category}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Fiyat:</span>
            <span className="font-semibold text-lg">
              {formatPrice(product.price)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Stok:</span>
            <div className="flex items-center">
              {stockStatus.icon}
              <Badge variant={stockStatus.variant} className="text-xs">
                {product.stockQuantity}
              </Badge>
            </div>
          </div>
        </div>

        {/* Platform Badges */}
        <div className="mb-4">
          <div className="flex flex-wrap gap-1">
            {activePlatforms.length > 0 ? (
              activePlatforms.map((platform, index) => (
                <Tooltip
                  key={index}
                  content={platform.connectionName || platform.label}
                >
                  <Badge
                    variant={platform.variant}
                    className="text-xs flex items-center gap-1"
                  >
                    {platform.icon}
                    <span className="hidden sm:inline">{platform.label}</span>
                  </Badge>
                </Tooltip>
              ))
            ) : (
              <Badge variant="secondary" className="text-xs">
                Yerel
              </Badge>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1">
            <Tooltip content="Detayları Görüntüle">
              <Button
                onClick={() => onView?.(product)}
                variant="ghost"
                size="sm"
                icon={Eye}
              />
            </Tooltip>
            <Tooltip content="Düzenle">
              <Button
                onClick={() => onEdit?.(product)}
                variant="ghost"
                size="sm"
                icon={Edit}
              />
            </Tooltip>
          </div>

          <div className="relative">
            <Button
              onClick={() => onToggleMoreMenu?.(product.id)}
              variant="ghost"
              size="sm"
              icon={MoreVertical}
            />
            {showMoreMenu === product.id && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                <button
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center"
                  onClick={() => {
                    navigator.clipboard.writeText(product.sku);
                    onToggleMoreMenu?.(null);
                  }}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  SKU'yu Kopyala
                </button>
                <button
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center"
                  onClick={() => {
                    // Toggle favorite logic here
                    onToggleMoreMenu?.(null);
                  }}
                >
                  <Star className="h-4 w-4 mr-2" />
                  Favorilere Ekle
                </button>
                <div className="border-t border-gray-100" />
                <button
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center"
                  onClick={() => {
                    onDelete?.(product.id);
                    onToggleMoreMenu?.(null);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Sil
                </button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Product Table Component
const ProductTable = ({
  products,
  onView,
  onEdit,
  onDelete,
  onImageClick,
  selectedProducts,
  onSelectProduct,
  onSelectAll,
  sortField,
  sortOrder,
  onSort,
  showMoreMenu,
  onToggleMoreMenu,
}) => {
  const handleSort = (field) => {
    onSort?.(field);
  };

  const SortHeader = ({ field, children }) => (
    <th
      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center space-x-1">
        <span>{children}</span>
        {sortField === field &&
          (sortOrder === "asc" ? (
            <SortAsc className="h-4 w-4" />
          ) : (
            <SortDesc className="h-4 w-4" />
          ))}
      </div>
    </th>
  );

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left">
              <input
                type="checkbox"
                checked={
                  selectedProducts.length === products.length &&
                  products.length > 0
                }
                onChange={onSelectAll}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Ürün
            </th>
            <SortHeader field="sku">SKU</SortHeader>
            <SortHeader field="category">Kategori</SortHeader>
            <SortHeader field="price">Fiyat</SortHeader>
            <SortHeader field="stockQuantity">Stok</SortHeader>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Platformlar
            </th>
            <SortHeader field="status">Durum</SortHeader>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              İşlemler
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {products.map((product) => {
            const stockStatus = getStockStatus(product);
            const activePlatforms = getPlatformBadges(product);

            return (
              <tr key={product.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedProducts.includes(product.id)}
                    onChange={() => onSelectProduct?.(product.id)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </td>

                {/* Product Info */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-12 w-12">
                      {product.images && product.images.length > 0 ? (
                        <img
                          className="h-12 w-12 rounded-lg object-cover cursor-pointer hover:opacity-80"
                          src={product.images[0]}
                          alt={product.name}
                          onClick={() =>
                            onImageClick?.(product.images[0], product.name)
                          }
                        />
                      ) : (
                        <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center">
                          <Image className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900 max-w-xs truncate">
                        {product.name}
                      </div>
                      <div className="text-sm text-gray-500 max-w-xs truncate">
                        {product.description}
                      </div>
                    </div>
                  </div>
                </td>

                {/* SKU */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <code className="bg-gray-100 px-2 py-1 rounded">
                    {product.sku}
                  </code>
                </td>

                {/* Category */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge variant="secondary" className="text-xs">
                    {product.category}
                  </Badge>
                </td>

                {/* Price */}
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {formatPrice(product.price)}
                </td>

                {/* Stock */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {stockStatus.icon}
                    <Badge
                      variant={stockStatus.variant}
                      className="text-xs ml-1"
                    >
                      {product.stockQuantity}
                    </Badge>
                  </div>
                </td>

                {/* Platforms */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-wrap gap-1">
                    {activePlatforms.length > 0 ? (
                      activePlatforms.map((platform, index) => (
                        <Tooltip
                          key={index}
                          content={platform.connectionName || platform.label}
                        >
                          <Badge
                            variant={platform.variant}
                            className="text-xs flex items-center gap-1"
                          >
                            {platform.icon}
                            <span className="hidden lg:inline">
                              {platform.label}
                            </span>
                          </Badge>
                        </Tooltip>
                      ))
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        Yerel
                      </Badge>
                    )}
                  </div>
                </td>

                {/* Status */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge
                    variant={getStatusVariant(product.status)}
                    className="text-xs"
                  >
                    {product.status === "active"
                      ? "Aktif"
                      : product.status === "inactive"
                      ? "Pasif"
                      : "Taslak"}
                  </Badge>
                </td>

                {/* Actions */}
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center space-x-2">
                    <Tooltip content="Detayları Görüntüle">
                      <Button
                        onClick={() => onView?.(product)}
                        variant="ghost"
                        size="sm"
                        icon={Eye}
                      />
                    </Tooltip>
                    <Tooltip content="Düzenle">
                      <Button
                        onClick={() => onEdit?.(product)}
                        variant="ghost"
                        size="sm"
                        icon={Edit}
                      />
                    </Tooltip>
                    <div className="relative">
                      <Button
                        onClick={() => onToggleMoreMenu?.(product.id)}
                        variant="ghost"
                        size="sm"
                        icon={MoreVertical}
                      />
                      {showMoreMenu === product.id && (
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                          <button
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center"
                            onClick={() => {
                              navigator.clipboard.writeText(product.sku);
                              onToggleMoreMenu?.(null);
                            }}
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            SKU'yu Kopyala
                          </button>
                          <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Platformda Görüntüle
                          </button>
                          <div className="border-t border-gray-100" />
                          <button
                            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center"
                            onClick={() => {
                              onDelete?.(product.id);
                              onToggleMoreMenu?.(null);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Sil
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// Product Grid Component
const ProductGrid = ({
  products,
  onView,
  onEdit,
  onDelete,
  onImageClick,
  selectedProducts,
  onSelectProduct,
  showMoreMenu,
  onToggleMoreMenu,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
          onImageClick={onImageClick}
          isSelected={selectedProducts.includes(product.id)}
          onSelect={onSelectProduct}
          showMoreMenu={showMoreMenu}
          onToggleMoreMenu={onToggleMoreMenu}
        />
      ))}
    </div>
  );
};

// Empty State Component
const EmptyState = ({ onAddProduct, onSync }) => (
  <div className="text-center py-12">
    <Package className="mx-auto h-16 w-16 text-gray-400 mb-4" />
    <h3 className="text-lg font-medium text-gray-900 mb-2">
      Henüz ürün bulunmuyor
    </h3>
    <p className="text-gray-600 mb-6 max-w-md mx-auto">
      İlk ürününüzü ekleyerek başlayın veya mevcut platformlarınızdan ürünleri
      senkronize edin
    </p>
    <div className="flex flex-col sm:flex-row gap-3 justify-center">
      <Button onClick={onAddProduct} variant="primary" icon={Package}>
        İlk Ürünü Ekle
      </Button>
      <Button onClick={onSync} variant="outline" icon={RefreshCw}>
        Platformlardan Senkronize Et
      </Button>
    </div>
  </div>
);

// Loading State Component
const LoadingState = () => (
  <div className="text-center py-12">
    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
    <h3 className="text-lg font-medium text-gray-900 mb-2">
      Ürünler yükleniyor
    </h3>
    <p className="text-gray-600">
      Ürünleriniz hazırlanıyor, lütfen bekleyin...
    </p>
  </div>
);

// Pagination Component
const Pagination = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  className = "",
}) => {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className={`flex items-center justify-between ${className}`}>
      <div className="text-sm text-gray-700">
        <span className="font-medium">
          {startItem}-{endItem}
        </span>{" "}
        / <span className="font-medium">{totalItems}</span> ürün
      </div>
      <div className="flex items-center space-x-2">
        <Button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          variant="outline"
          size="sm"
        >
          Önceki
        </Button>
        <span className="text-sm text-gray-700">
          Sayfa {currentPage} / {totalPages}
        </span>
        <Button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          variant="outline"
          size="sm"
        >
          Sonraki
        </Button>
      </div>
    </div>
  );
};

// Main Product Display Component
const ProductDisplay = ({
  products = [],
  loading = false,
  viewMode = "table",
  selectedProducts = [],
  onSelectProduct,
  onSelectAll,
  onView,
  onEdit,
  onDelete,
  onImageClick,
  onAddProduct,
  onSync,
  // Sorting
  sortField,
  sortOrder,
  onSort,
  // Pagination
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  itemsPerPage = 20,
  onPageChange,
  className = "",
}) => {
  const [showMoreMenu, setShowMoreMenu] = useState(null);

  const handleToggleMoreMenu = useCallback((productId) => {
    setShowMoreMenu((prev) => (prev === productId ? null : productId));
  }, []);

  // Close menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = () => setShowMoreMenu(null);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  if (loading) {
    return <LoadingState />;
  }

  if (products.length === 0) {
    return <EmptyState onAddProduct={onAddProduct} onSync={onSync} />;
  }

  return (
    <div className={className}>
      {/* Products Display */}
      <Card>
        <CardContent className="p-0">
          {viewMode === "grid" ? (
            <div className="p-6">
              <ProductGrid
                products={products}
                onView={onView}
                onEdit={onEdit}
                onDelete={onDelete}
                onImageClick={onImageClick}
                selectedProducts={selectedProducts}
                onSelectProduct={onSelectProduct}
                showMoreMenu={showMoreMenu}
                onToggleMoreMenu={handleToggleMoreMenu}
              />
            </div>
          ) : (
            <ProductTable
              products={products}
              onView={onView}
              onEdit={onEdit}
              onDelete={onDelete}
              onImageClick={onImageClick}
              selectedProducts={selectedProducts}
              onSelectProduct={onSelectProduct}
              onSelectAll={onSelectAll}
              sortField={sortField}
              sortOrder={sortOrder}
              onSort={onSort}
              showMoreMenu={showMoreMenu}
              onToggleMoreMenu={handleToggleMoreMenu}
            />
          )}
        </CardContent>

        {/* Pagination */}
        {products.length > 0 && (
          <div className="border-t border-gray-200 px-6 py-4">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              onPageChange={onPageChange}
            />
          </div>
        )}
      </Card>
    </div>
  );
};

export default ProductDisplay;
