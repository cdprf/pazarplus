import React, { useState, useEffect } from "react";
import {
  Eye,
  Edit,
  Trash2,
  ArrowUpDown,
  Package,
  Tag,
  DollarSign,
  MoreHorizontal,
  Copy,
  ExternalLink,
  BarChart3,
  Crown,
  Layers,
  AlertCircle,
} from "lucide-react";
import { Badge } from "../../ui/Badge";
import { Button } from "../../ui/Button";
import { PlatformIcons } from "../utils/constants";

const SimpleProductTable = ({
  products = [],
  selectedProducts = [],
  onSelectProduct,
  onSelectAll,
  onView,
  onEdit,
  onDelete,
  onImageClick,
  onProductNameClick,
  sortField,
  sortOrder,
  onSort,
  // Additional action handlers
  onDuplicate,
  onExportProduct,
  onViewAnalytics,
  onCopyLink,
  onCreateVariant,
  // Variant Detection props
  onRemoveVariantStatus,
  onClassifyVariantStatus,
  onBatchVariantDetection,
}) => {
  const [openMenuId, setOpenMenuId] = useState(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);
  const handleSort = (field) => {
    onSort?.(field);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { variant: "success", text: "Aktif" },
      inactive: { variant: "destructive", text: "Pasif" },
      draft: { variant: "secondary", text: "Taslak" },
      pending: { variant: "default", text: "Beklemede" },
    };
    return statusConfig[status] || { variant: "secondary", text: status };
  };

  const getProductTypeBadge = (product) => {
    // Determine product type based on product properties
    if (product.isMainProduct) {
      return {
        variant: "primary",
        text: "Ana Ürün",
        icon: <Crown className="h-3 w-3" />,
      };
    } else if (product.parentId || product.variantOf) {
      return {
        variant: "secondary",
        text: "Varyant",
        icon: <Layers className="h-3 w-3" />,
      };
    } else {
      return {
        variant: "outline",
        text: "Belirtilmemiş",
        icon: <AlertCircle className="h-3 w-3" />,
      };
    }
  };
  const getPlatformBadges = (product) => {
    const platforms = [];

    // Check if product has platform variants (new system)
    if (product.platformVariants && product.platformVariants.length > 0) {
      product.platformVariants.forEach((variant) => {
        // Only show published or synced variants
        if (variant.isPublished || variant.syncStatus === "success") {
          platforms.push({
            name: variant.platform,
            icon: PlatformIcons[variant.platform] || PlatformIcons.local,
            label:
              variant.platform.charAt(0).toUpperCase() +
              variant.platform.slice(1),
            status: variant.syncStatus,
            isPublished: variant.isPublished,
            externalUrl: variant.externalUrl,
          });
        }
      });
    }

    // Check if product has platform data (old system)
    if (platforms.length === 0 && product.platforms) {
      Object.entries(product.platforms).forEach(([platform, data]) => {
        if (data.enabled || data.isActive) {
          platforms.push({
            name: platform,
            icon: PlatformIcons[platform] || PlatformIcons.local,
            label: platform.charAt(0).toUpperCase() + platform.slice(1),
          });
        }
      });
    }

    // If no platforms specified, check for source platform
    if (platforms.length === 0 && product.source) {
      platforms.push({
        name: product.source,
        icon: PlatformIcons[product.source] || PlatformIcons.local,
        label: product.source.charAt(0).toUpperCase() + product.source.slice(1),
      });
    }

    // Default to local if no platforms found
    if (platforms.length === 0) {
      platforms.push({
        name: "local",
        icon: PlatformIcons.local,
        label: "Yerel",
      });
    }

    return platforms;
  };

  const formatPrice = (price) => {
    if (!price) return "₺0,00";
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
      minimumFractionDigits: 2,
    }).format(price);
  };

  const getStockStatus = (stock) => {
    if (stock === 0) return { color: "text-red-600", text: "Stokta Yok" };
    if (stock <= 5) return { color: "text-yellow-600", text: "Düşük Stok" };
    return { color: "text-green-600", text: "Stokta Var" };
  };

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          Henüz ürün yok
        </h3>
        <p className="text-gray-500 mb-4">
          Henüz hiç ürün yok veya arama kriterlerinize uygun ürün bulunamadı.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th className="px-6 py-3 text-left">
              <input
                type="checkbox"
                checked={
                  selectedProducts.length === products.length &&
                  products.length > 0
                }
                onChange={() => onSelectAll?.()}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
              />
            </th>
            <th
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
              onClick={() => handleSort("name")}
            >
              <div className="flex items-center space-x-1">
                <span>Ürün</span>
                <ArrowUpDown
                  className={`h-4 w-4 ${
                    sortField === "name" ? "text-blue-600" : ""
                  }`}
                />
                {sortField === "name" && (
                  <span className="text-xs text-blue-600">
                    {sortOrder === "asc" ? "↑" : "↓"}
                  </span>
                )}
              </div>
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Tür
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Platform
            </th>
            <th
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
              onClick={() => handleSort("sku")}
            >
              <div className="flex items-center space-x-1">
                <span>SKU</span>
                <ArrowUpDown
                  className={`h-4 w-4 ${
                    sortField === "sku" ? "text-blue-600" : ""
                  }`}
                />
                {sortField === "sku" && (
                  <span className="text-xs text-blue-600">
                    {sortOrder === "asc" ? "↑" : "↓"}
                  </span>
                )}
              </div>
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Kategori
            </th>
            <th
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
              onClick={() => handleSort("price")}
            >
              <div className="flex items-center space-x-1">
                <span>Fiyat</span>
                <ArrowUpDown
                  className={`h-4 w-4 ${
                    sortField === "price" ? "text-blue-600" : ""
                  }`}
                />
                {sortField === "price" && (
                  <span className="text-xs text-blue-600">
                    {sortOrder === "asc" ? "↑" : "↓"}
                  </span>
                )}
              </div>
            </th>
            <th
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
              onClick={() => handleSort("stockQuantity")}
            >
              <div className="flex items-center space-x-1">
                <span>Stok</span>
                <ArrowUpDown
                  className={`h-4 w-4 ${
                    sortField === "stockQuantity" ? "text-blue-600" : ""
                  }`}
                />
                {sortField === "stockQuantity" && (
                  <span className="text-xs text-blue-600">
                    {sortOrder === "asc" ? "↑" : "↓"}
                  </span>
                )}
              </div>
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Durum
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              İşlemler
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {products.map((product) => {
            const statusConfig = getStatusBadge(product.status);
            const stockStatus = getStockStatus(product.stockQuantity);

            return (
              <tr
                key={product.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {/* Checkbox */}
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={selectedProducts.includes(product.id)}
                    onChange={() => onSelectProduct?.(product.id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                  />
                </td>

                {/* Product Name and Image */}
                <td className="px-6 py-4 whitespace-normal">
                  <div className="flex items-center">
                    {product.images?.[0] ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="h-12 w-12 rounded-lg object-cover mr-3 cursor-pointer hover:opacity-75 transition-opacity"
                        onClick={() =>
                          onImageClick?.(
                            product.images[0],
                            product.name,
                            product
                          )
                        }
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-gray-200 dark:bg-gray-600 mr-3 flex items-center justify-center">
                        <Package className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div
                        className="text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                        onClick={() => onProductNameClick?.(product)}
                      >
                        {product.name}
                      </div>
                      {/* Variant Status Badges */}
                      {(product.isVariant || product.isMainProduct) && (
                        <div className="flex items-center space-x-2 mt-1">
                          {product.isVariant && (
                            <div className="flex items-center space-x-1">
                              <Badge variant="info" size="xs">
                                Variant:{" "}
                                {product.variantValue ||
                                  product.variantType ||
                                  "Unknown"}
                              </Badge>
                              {product.variantDetectionConfidence && (
                                <span className="text-xs text-gray-400">
                                  (
                                  {Math.round(
                                    product.variantDetectionConfidence * 100
                                  )}
                                  %)
                                </span>
                              )}
                              {onRemoveVariantStatus && (
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onRemoveVariantStatus(product.id);
                                  }}
                                  variant="ghost"
                                  size="sm"
                                  className="h-4 w-4 p-0 text-gray-400 hover:text-red-500"
                                  title="Remove variant status"
                                >
                                  ×
                                </Button>
                              )}
                            </div>
                          )}
                          {product.isMainProduct && (
                            <div className="flex items-center space-x-1">
                              <Badge variant="primary" size="xs">
                                Main Product
                              </Badge>
                              {product.variantDetectionConfidence && (
                                <span className="text-xs text-gray-400">
                                  (
                                  {Math.round(
                                    product.variantDetectionConfidence * 100
                                  )}
                                  %)
                                </span>
                              )}
                              {onRemoveVariantStatus && (
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onRemoveVariantStatus(product.id);
                                  }}
                                  variant="ghost"
                                  size="sm"
                                  className="h-4 w-4 p-0 text-gray-400 hover:text-red-500"
                                  title="Remove variant status"
                                >
                                  ×
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </td>

                {/* Product Type */}
                <td className="px-6 py-4 whitespace-normal">
                  {(() => {
                    const typeBadge = getProductTypeBadge(product);
                    return (
                      <Badge
                        variant={typeBadge.variant}
                        className="flex items-center space-x-1"
                      >
                        {typeBadge.icon}
                        <span>{typeBadge.text}</span>
                      </Badge>
                    );
                  })()}
                </td>

                {/* Platform */}
                <td className="px-6 py-4 whitespace-normal">
                  <div className="flex flex-wrap gap-1">
                    {getPlatformBadges(product).map((platform, index) => {
                      // Determine badge variant based on platform status
                      let badgeVariant = "outline";
                      let statusIndicator = null;

                      if (
                        platform.status === "success" &&
                        platform.isPublished
                      ) {
                        badgeVariant = "success";
                        statusIndicator = (
                          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        );
                      } else if (platform.status === "syncing") {
                        badgeVariant = "info";
                        statusIndicator = (
                          <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                        );
                      } else if (platform.status === "error") {
                        badgeVariant = "danger";
                        statusIndicator = (
                          <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                        );
                      }

                      const badgeContent = (
                        <Badge
                          key={`${platform.name}-${index}`}
                          variant={badgeVariant}
                          className="flex items-center space-x-1 cursor-pointer hover:opacity-80 transition-opacity"
                          title={`${platform.label}${
                            platform.isPublished ? " (Yayında)" : ""
                          }${platform.status ? ` - ${platform.status}` : ""}`}
                        >
                          {platform.icon}
                          <span className="text-xs">{platform.label}</span>
                          {statusIndicator}
                        </Badge>
                      );

                      // If there's an external URL, make it clickable
                      if (platform.externalUrl) {
                        return (
                          <a
                            key={`${platform.name}-${index}`}
                            href={platform.externalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block"
                          >
                            {badgeContent}
                          </a>
                        );
                      }

                      return badgeContent;
                    })}
                  </div>
                </td>

                {/* SKU */}
                <td className="px-6 py-4 whitespace-normal">
                  <div className="flex items-center">
                    <Tag className="h-4 w-4 mr-1 text-gray-400" />
                    <span className="font-mono text-sm text-gray-900 dark:text-gray-100">
                      {product.sku || "N/A"}
                    </span>
                  </div>
                </td>

                {/* Category */}
                <td className="px-6 py-4 whitespace-normal">
                  <Badge variant="secondary" className="capitalize">
                    {product.category || "Belirtilmemiş"}
                  </Badge>
                </td>

                {/* Price */}
                <td className="px-6 py-4 whitespace-normal">
                  <div className="flex items-center">
                    <DollarSign className="h-4 w-4 mr-1 text-gray-400" />
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                      {formatPrice(product.price)}
                    </span>
                  </div>
                </td>

                {/* Stock */}
                <td className="px-6 py-4 whitespace-normal">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {product.stockQuantity || 0}
                    </span>
                    <span className={`text-xs ${stockStatus.color}`}>
                      {stockStatus.text}
                    </span>
                  </div>
                </td>

                {/* Status */}
                <td className="px-6 py-4 whitespace-normal">
                  <Badge variant={statusConfig.variant}>
                    {statusConfig.text}
                  </Badge>
                </td>

                {/* Actions */}
                <td className="px-6 py-4 whitespace-normal text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex items-center space-x-1">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        onView?.(product);
                      }}
                      size="sm"
                      variant="ghost"
                      className="p-1"
                      title="Görüntüle"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit?.(product);
                      }}
                      size="sm"
                      variant="ghost"
                      className="p-1"
                      title="Düzenle"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete?.(product.id);
                      }}
                      size="sm"
                      variant="ghost"
                      className="p-1"
                      title="Sil"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>

                    {/* More Actions Dropdown */}
                    <div className="relative">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(
                            openMenuId === product.id ? null : product.id
                          );
                        }}
                        size="sm"
                        variant="ghost"
                        className="p-1"
                        title="Daha Fazla İşlem"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>

                      {openMenuId === product.id && (
                        <div className="absolute right-0 top-8 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-10">
                          <div className="py-1">
                            {onCreateVariant && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onCreateVariant(product);
                                  setOpenMenuId(null);
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                              >
                                <Layers className="h-4 w-4 mr-2" />
                                Platform Varyantı Oluştur
                              </button>
                            )}
                            {onDuplicate && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDuplicate(product);
                                  setOpenMenuId(null);
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                              >
                                <Copy className="h-4 w-4 mr-2" />
                                Kopyala
                              </button>
                            )}
                            {onViewAnalytics && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onViewAnalytics(product);
                                  setOpenMenuId(null);
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                              >
                                <BarChart3 className="h-4 w-4 mr-2" />
                                Analitik
                              </button>
                            )}
                            {onExportProduct && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onExportProduct(product);
                                  setOpenMenuId(null);
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                              >
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Dışa Aktar
                              </button>
                            )}
                            {onCopyLink && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onCopyLink(product);
                                  setOpenMenuId(null);
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                              >
                                <Copy className="h-4 w-4 mr-2" />
                                Linki Kopyala
                              </button>
                            )}
                          </div>
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

export default SimpleProductTable;
