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
} from "lucide-react";
import { Badge } from "../../ui/Badge";
import { Button } from "../../ui/Button.jsx";

const SimpleProductTable = ({
  products = [],
  selectedProducts = [],
  onSelectProduct,
  onSelectAll,
  onView,
  onEdit,
  onDelete,
  onImageClick,
  sortField,
  sortOrder,
  onSort,
  // Additional action handlers
  onDuplicate,
  onExportProduct,
  onViewAnalytics,
  onCopyLink,
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
                <ArrowUpDown className="h-4 w-4" />
              </div>
            </th>
            <th
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
              onClick={() => handleSort("sku")}
            >
              <div className="flex items-center space-x-1">
                <span>SKU</span>
                <ArrowUpDown className="h-4 w-4" />
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
                <ArrowUpDown className="h-4 w-4" />
              </div>
            </th>
            <th
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
              onClick={() => handleSort("stockQuantity")}
            >
              <div className="flex items-center space-x-1">
                <span>Stok</span>
                <ArrowUpDown className="h-4 w-4" />
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
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer">
                        {product.name}
                      </div>
                      {product.description && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {product.description}
                        </div>
                      )}
                    </div>
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
                      onClick={() => onView?.(product)}
                      size="sm"
                      variant="ghost"
                      className="p-1"
                      title="Görüntüle"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => onEdit?.(product)}
                      size="sm"
                      variant="ghost"
                      className="p-1"
                      title="Düzenle"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <button
                      onClick={() => {
                        console.log(
                          "🗑️ Delete button clicked for product:",
                          product.id,
                          product.name
                        );
                        onDelete?.(product.id);
                      }}
                      className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                      title="Sil"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>

                    {/* More Actions Dropdown */}
                    <div className="relative">
                      <Button
                        onClick={() =>
                          setOpenMenuId(
                            openMenuId === product.id ? null : product.id
                          )
                        }
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
                            {onDuplicate && (
                              <button
                                onClick={() => {
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
                                onClick={() => {
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
                                onClick={() => {
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
                                onClick={() => {
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
