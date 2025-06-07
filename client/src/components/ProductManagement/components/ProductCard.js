import React, { useMemo } from "react";
import {
  Eye,
  Edit,
  MoreVertical,
  Copy,
  Image,
  Star,
  Trash2,
} from "lucide-react";
import { Button, Card, CardContent, Badge, Tooltip } from "../../ui";
import CompletionScore from "./CompletionScore";
import InlineEditor from "./InlineEditor";

// Helper functions
const getStockStatus = (product) => {
  const stock = product.stockQuantity || 0;
  if (stock === 0) {
    return {
      color: "text-red-600",
      icon: <div className="w-2 h-2 bg-red-500 rounded-full" />,
      label: "Stok Yok",
    };
  } else if (stock <= 10) {
    return {
      color: "text-yellow-600",
      icon: <div className="w-2 h-2 bg-yellow-500 rounded-full" />,
      label: "Az Stok",
    };
  } else {
    return {
      color: "text-green-600",
      icon: <div className="w-2 h-2 bg-green-500 rounded-full" />,
      label: "Stokta",
    };
  }
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

const getPlatformBadges = (product) => {
  // This would typically come from product.platformConnections or similar
  // For now, returning empty array
  return [];
};

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
  onInlineEdit,
}) => {
  const stockStatus = getStockStatus(product);
  const activePlatforms = getPlatformBadges(product);

  // Calculate completion score based on filled fields
  const completionScore = useMemo(() => {
    const fields = [
      product.name,
      product.description,
      product.price,
      product.images?.length > 0,
      product.category,
      product.sku,
      product.stockQuantity > 0,
    ];
    const filledFields = fields.filter(Boolean).length;
    return Math.round((filledFields / fields.length) * 100);
  }, [product]);

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

        {/* Completion Score */}
        <div className="absolute top-2 right-2">
          <CompletionScore score={completionScore} />
        </div>

        {/* Selection Checkbox */}
        <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
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

          {/* Product Details */}
          <div className="space-y-1 text-xs text-gray-500">
            {product.modelCode && (
              <div className="flex items-center justify-between">
                <span>Model Kodu:</span>
                <code className="bg-gray-100 px-1 rounded">
                  {product.modelCode}
                </code>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span>Stok Kodu:</span>
              <code className="bg-gray-100 px-1 rounded">{product.sku}</code>
            </div>
            {product.barcode && (
              <div className="flex items-center justify-between">
                <span>Barkod:</span>
                <code className="bg-gray-100 px-1 rounded">
                  {product.barcode}
                </code>
              </div>
            )}
          </div>
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
            <InlineEditor
              value={product.price}
              onSave={(newPrice) =>
                onInlineEdit?.("price", product.id, newPrice)
              }
              type="number"
              suffix="₺"
              className="text-right"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Stok:</span>
            <div className="flex items-center space-x-1">
              {stockStatus.icon}
              <InlineEditor
                value={product.stockQuantity}
                onSave={(newStock) =>
                  onInlineEdit?.("stockQuantity", product.id, newStock)
                }
                type="number"
                min="0"
              />
            </div>
          </div>

          {/* Completion Score Row */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Doluluk:</span>
            <CompletionScore score={completionScore} />
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

export default ProductCard;
