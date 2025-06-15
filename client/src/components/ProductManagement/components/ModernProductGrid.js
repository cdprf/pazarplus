import React, { useState } from "react";
import {
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Copy,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Image,
} from "lucide-react";
import { Badge, Button, Card } from "../../../components/ui";

/**
 * ModernProductGrid Component
 * A clean, modern grid layout for displaying products
 */
const ModernProductGrid = ({
  products = [],
  selectedProducts = [],
  onSelectProduct,
  onView,
  onEdit,
  onDelete,
  onImageClick,
  onProductNameClick,
  onInlineEdit,
}) => {
  const [showMoreMenu, setShowMoreMenu] = useState(null);

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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {products.map((product) => (
        <Card
          key={product.id}
          className="overflow-hidden hover:shadow-md transition-shadow duration-200"
        >
          {/* Product Image */}
          <div className="relative h-48 bg-gray-100 dark:bg-gray-800">
            <div className="absolute top-2 left-2">
              <input
                type="checkbox"
                checked={selectedProducts.includes(product.id)}
                onChange={() => onSelectProduct?.(product.id)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </div>
            
            <div className="absolute top-2 right-2">
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  icon={MoreHorizontal}
                  onClick={() => setShowMoreMenu(
                    showMoreMenu === product.id ? null : product.id
                  )}
                  className="h-8 w-8 p-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full shadow-sm"
                  aria-label="Daha Fazla"
                />
                {showMoreMenu === product.id && (
                  <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg z-10 border border-gray-200 dark:border-gray-700">
                    <div className="py-1">
                      <button
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                        onClick={() => {
                          onView?.(product);
                          setShowMoreMenu(null);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Görüntüle
                      </button>
                      <button
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                        onClick={() => {
                          onEdit?.(product);
                          setShowMoreMenu(null);
                        }}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Düzenle
                      </button>
                      <button
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                        onClick={() => {
                          navigator.clipboard.writeText(product.sku);
                          setShowMoreMenu(null);
                        }}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        SKU'yu Kopyala
                      </button>
                      <button
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center"
                        onClick={() => {
                          onDelete?.(product.id);
                          setShowMoreMenu(null);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Sil
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {product.images && product.images.length > 0 ? (
              <div 
                className="h-full w-full bg-cover bg-center cursor-pointer"
                style={{ backgroundImage: `url(${product.images[0]})` }}
                onClick={() => onImageClick?.(product.images[0], product.name, product)}
              >
                {product.images.length > 1 && (
                  <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                    +{product.images.length - 1}
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full w-full flex items-center justify-center">
                <Image className="h-12 w-12 text-gray-400" />
              </div>
            )}
          </div>
          
          {/* Product Info */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              {getStatusBadge(product.status)}
              <Badge variant="outline" className="text-xs">
                {product.category}
              </Badge>
            </div>
            
            <h3 
              className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1 cursor-pointer hover:text-blue-600 hover:underline"
              onClick={() => onProductNameClick?.(product)}
            >
              {product.name}
            </h3>
            
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              <div className="flex items-center justify-between">
                <span>SKU: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">{product.sku}</code></span>
                {product.barcode && <span>Barkod: {product.barcode}</span>}
              </div>
            </div>
            
            <div className="flex items-center justify-between mt-4">
              <div 
                className="text-sm font-medium text-gray-900 dark:text-gray-100 cursor-pointer hover:text-blue-600"
                onClick={() => onInlineEdit?.(product.id, "price", prompt("Yeni fiyat:", product.price))}
              >
                {product.price?.toLocaleString()} ₺
              </div>
              <div 
                className={`text-sm font-medium ${getStockStatusColor(product.stockQuantity)} cursor-pointer hover:underline`}
                onClick={() => onInlineEdit?.(product.id, "stockQuantity", prompt("Yeni stok:", product.stockQuantity))}
              >
                Stok: {product.stockQuantity || 0}
              </div>
            </div>
            
            {/* Variants Indicator */}
            {product.hasVariants && product.variants && product.variants.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>Varyantlar</span>
                  <Badge variant="secondary" className="text-xs">
                    {product.variants.length}
                  </Badge>
                </div>
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
};

export default ModernProductGrid;