import React, { useState } from "react";
import {
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
  Image,
  Copy,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Badge, Button, Card } from "../../../components/ui";
import InlineEditableField from "./InlineEditableField";
import "../styles/modern-table-enhancements.css";

/**
 * ModernProductTable Component
 * A clean, modern table for displaying products
 */
const ModernProductTable = ({
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
  onInlineEdit,
}) => {
  const [expandedProducts, setExpandedProducts] = useState(new Set());
  const [showMoreMenu, setShowMoreMenu] = useState(null);

  const toggleProductExpansion = (productId) => {
    const newExpanded = new Set(expandedProducts);
    if (newExpanded.has(productId)) {
      newExpanded.delete(productId);
    } else {
      newExpanded.add(productId);
    }
    setExpandedProducts(newExpanded);
  };

  const handleSort = (field) => {
    onSort?.(field);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "active":
        return (
          <Badge variant="success" className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            <span>Aktif</span>
          </Badge>
        );
      case "inactive":
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            <span>Pasif</span>
          </Badge>
        );
      case "draft":
        return (
          <Badge variant="warning" className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            <span>Taslak</span>
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            {status}
          </Badge>
        );
    }
  };

  const getStockStatusColor = (stock) => {
    if (stock <= 0) return "text-red-500";
    if (stock <= 10) return "text-yellow-500";
    return "text-green-500";
  };

  return (
    <div className="bg-white dark:bg-gray-900 shadow rounded-lg overflow-hidden">
      {/* Single Table with Sticky Header */}
      <div className="overflow-x-auto table-scrollable">
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
              <tr>
                {/* Sticky first column - Checkbox */}
                <th className="table-sticky-left w-12 px-3 py-2 text-left bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 z-20">
                  <input
                    type="checkbox"
                    checked={
                      selectedProducts.length === products.length &&
                      products.length > 0
                    }
                    onChange={onSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th
                  className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort("name")}
                >
                  <div className="flex items-center">
                    <span>Ürün</span>
                    {sortField === "name" && (
                      <ChevronDown
                        className={`ml-1 h-3 w-3 ${
                          sortOrder === "desc" ? "transform rotate-180" : ""
                        }`}
                      />
                    )}
                  </div>
                </th>
                <th
                  className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort("status")}
                >
                  <div className="flex items-center">
                    <span>Durum</span>
                    {sortField === "status" && (
                      <ChevronDown
                        className={`ml-1 h-3 w-3 ${
                          sortOrder === "desc" ? "transform rotate-180" : ""
                        }`}
                      />
                    )}
                  </div>
                </th>
                <th
                  className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort("sku")}
                >
                  <div className="flex items-center">
                    <span>SKU</span>
                    {sortField === "sku" && (
                      <ChevronDown
                        className={`ml-1 h-3 w-3 ${
                          sortOrder === "desc" ? "transform rotate-180" : ""
                        }`}
                      />
                    )}
                  </div>
                </th>
                <th
                  className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort("price")}
                >
                  <div className="flex items-center">
                    <span>Fiyat</span>
                    {sortField === "price" && (
                      <ChevronDown
                        className={`ml-1 h-3 w-3 ${
                          sortOrder === "desc" ? "transform rotate-180" : ""
                        }`}
                      />
                    )}
                  </div>
                </th>
                <th
                  className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort("stockQuantity")}
                >
                  <div className="flex items-center">
                    <span>Stok</span>
                    {sortField === "stockQuantity" && (
                      <ChevronDown
                        className={`ml-1 h-3 w-3 ${
                          sortOrder === "desc" ? "transform rotate-180" : ""
                        }`}
                      />
                    )}
                  </div>
                </th>
                <th
                  className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort("category")}
                >
                  <div className="flex items-center">
                    <span>Kategori</span>
                    {sortField === "category" && (
                      <ChevronDown
                        className={`ml-1 h-3 w-3 ${
                          sortOrder === "desc" ? "transform rotate-180" : ""
                        }`}
                      />
                    )}
                  </div>
                </th>
                {/* Sticky last column - Actions */}
                <th className="table-sticky-right px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 z-20">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {products.map((product) => {
                const isExpanded = expandedProducts.has(product.id);
                const hasVariants =
                  product.hasVariants &&
                  product.variants &&
                  product.variants.length > 0;

                return (
                  <React.Fragment key={product.id}>
                    <tr className="table-row-hover">
                      {/* Sticky first column - Checkbox */}
                      <td className="table-sticky-left w-12 px-3 py-3 whitespace-nowrap bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 z-10">
                        <input
                          type="checkbox"
                          checked={selectedProducts.includes(product.id)}
                          onChange={() => onSelectProduct?.(product.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8 relative">
                            {product.images && product.images.length > 0 ? (
                              <div
                                className="h-8 w-8 rounded bg-cover bg-center cursor-pointer"
                                style={{
                                  backgroundImage: `url(${product.images[0]})`,
                                }}
                                onClick={() =>
                                  onImageClick?.(
                                    product.images[0],
                                    product.name,
                                    product
                                  )
                                }
                              >
                                {product.images.length > 1 && (
                                  <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs px-1 rounded-full">
                                    +{product.images.length - 1}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="h-8 w-8 rounded bg-gray-100 flex items-center justify-center">
                                <Image className="h-4 w-4 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div className="ml-3">
                            <div className="flex items-center">
                              <div
                                className="text-xs font-medium text-gray-900 dark:text-gray-100 cursor-pointer hover:text-blue-600 hover:underline"
                                onClick={() => onProductNameClick?.(product)}
                              >
                                {product.name}
                              </div>
                              {hasVariants && (
                                <button
                                  onClick={() =>
                                    toggleProductExpansion(product.id)
                                  }
                                  className="ml-2 text-gray-400 hover:text-gray-600"
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="h-3 w-3" />
                                  ) : (
                                    <ChevronRight className="h-3 w-3" />
                                  )}
                                </button>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {product.barcode && `Barkod: ${product.barcode}`}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {getStatusBadge(product.status)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                          {product.sku}
                        </code>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <InlineEditableField
                          value={product.price}
                          onSave={(newValue) =>
                            onInlineEdit?.(product.id, "price", newValue)
                          }
                          formatter={(value) => `${value?.toLocaleString()} ₺`}
                          className="text-xs font-medium text-gray-900 dark:text-gray-100 cursor-pointer hover:text-blue-600"
                        />
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <InlineEditableField
                          value={product.stockQuantity}
                          onSave={(newValue) =>
                            onInlineEdit?.(
                              product.id,
                              "stockQuantity",
                              newValue
                            )
                          }
                          className={`text-xs font-medium ${getStockStatusColor(
                            product.stockQuantity
                          )} cursor-pointer hover:underline`}
                        />
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <Badge variant="outline" className="table-badge">
                          {product.category}
                        </Badge>
                      </td>
                      {/* Sticky last column - Actions */}
                      <td className="table-sticky-right px-3 py-3 whitespace-nowrap text-right text-xs font-medium bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700">
                        <div className="table-action-buttons justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={Eye}
                            onClick={() => onView?.(product)}
                            className="table-action-button h-6 w-6 p-0"
                            aria-label="Görüntüle"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={Edit}
                            onClick={() => onEdit?.(product)}
                            className="table-action-button h-6 w-6 p-0"
                            aria-label="Düzenle"
                          />
                          <div className="relative">
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={MoreHorizontal}
                              onClick={() =>
                                setShowMoreMenu(
                                  showMoreMenu === product.id
                                    ? null
                                    : product.id
                                )
                              }
                              className="table-action-button h-6 w-6 p-0"
                              aria-label="Daha Fazla"
                            />
                            {showMoreMenu === product.id && (
                              <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg z-30 border border-gray-200 dark:border-gray-700">
                                <div className="py-1">
                                  <button
                                    className="w-full px-4 py-2 text-left text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                                    onClick={() => {
                                      navigator.clipboard.writeText(
                                        product.sku
                                      );
                                      setShowMoreMenu(null);
                                    }}
                                  >
                                    <Copy className="h-3 w-3 mr-2" />
                                    SKU'yu Kopyala
                                  </button>
                                  <button
                                    className="w-full px-4 py-2 text-left text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center"
                                    onClick={() => {
                                      onDelete?.(product.id);
                                      setShowMoreMenu(null);
                                    }}
                                  >
                                    <Trash2 className="h-3 w-3 mr-2" />
                                    Sil
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Variant Row */}
                    {isExpanded && hasVariants && (
                      <tr className="bg-gray-50 dark:bg-gray-800">
                        <td colSpan={8} className="px-3 py-3">
                          <div className="ml-11">
                            <h4 className="text-xs font-medium text-gray-900 dark:text-gray-100 mb-2">
                              Varyantlar
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                              {product.variants?.map((variant, index) => (
                                <Card
                                  key={index}
                                  className="p-2 border border-gray-200 dark:border-gray-700"
                                >
                                  <div className="flex items-center space-x-2">
                                    {variant.image && (
                                      <img
                                        src={variant.image}
                                        alt={variant.name}
                                        className="h-8 w-8 rounded object-cover"
                                      />
                                    )}
                                    <div className="flex-1">
                                      <p className="text-xs font-medium text-gray-900 dark:text-gray-100">
                                        {variant.name}
                                      </p>
                                      <p className="text-xs text-gray-500 dark:text-gray-400">
                                        SKU: {variant.sku}
                                      </p>
                                      <div className="flex items-center justify-between mt-1">
                                        <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                                          {variant.price?.toLocaleString()} ₺
                                        </span>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                          Stok: {variant.stock || 0}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </Card>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ModernProductTable;
