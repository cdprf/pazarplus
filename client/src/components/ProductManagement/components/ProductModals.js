import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  Plus,
  Tag,
  Edit,
  ExternalLink,
  Copy,
  Image,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button, Badge, Modal } from "../../ui";
import { Card, CardContent } from "../../ui/Card";
import {
  CATEGORIES,
  PLATFORMS,
  PlatformIcons,
  DEFAULT_PRODUCT_FORM,
} from "../utils/constants";
import {
  getStockStatus,
  getPlatformBadges,
  formatPrice,
  validateProduct,
} from "../utils/helpers";

// Product Form Modal Component
const ProductFormModal = ({
  isOpen,
  onClose,
  product = null,
  onSave,
  loading = false,
}) => {
  const [formData, setFormData] = useState(DEFAULT_PRODUCT_FORM);
  const [errors, setErrors] = useState({});
  const [newTag, setNewTag] = useState("");

  useEffect(() => {
    if (product) {
      setFormData({
        ...DEFAULT_PRODUCT_FORM,
        ...product,
        platforms: product.platforms || DEFAULT_PRODUCT_FORM.platforms,
        dimensions: product.dimensions || DEFAULT_PRODUCT_FORM.dimensions,
        tags: product.tags || [],
      });
    } else {
      setFormData(DEFAULT_PRODUCT_FORM);
    }
    setErrors({});
  }, [product, isOpen]);

  const handleSubmit = () => {
    const validationErrors = validateProduct(formData);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length === 0) {
      onSave(formData);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleDimensionChange = (dimension, value) => {
    setFormData((prev) => ({
      ...prev,
      dimensions: { ...prev.dimensions, [dimension]: value },
    }));
  };

  const handlePlatformChange = (platform, field, value) => {
    setFormData((prev) => ({
      ...prev,
      platforms: {
        ...prev.platforms,
        [platform]: { ...prev.platforms[platform], [field]: value },
      },
    }));
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()],
      }));
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
  };

  const addImage = () => {
    const url = prompt("Resim URL'si girin:");
    if (url) {
      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, url],
      }));
    }
  };

  const removeImage = (index) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={product ? "Ürün Düzenle" : "Yeni Ürün Ekle"}
      size="xl"
    >
      <div className="space-y-6 max-h-96 overflow-y-auto">
        {/* Basic Information */}
        <div>
          <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-4">
            Temel Bilgiler
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Ürün Adı *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.name ? "border-red-500" : "border-gray-300 dark:border-gray-600"
                }`}
                placeholder="Ürün adını girin"
              />
              {errors.name && (
                <p className="text-red-500 text-xs mt-1">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                SKU *
              </label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => handleInputChange("sku", e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.sku ? "border-red-500" : "border-gray-300 dark:border-gray-600"
                }`}
                placeholder="Ürün kodunu girin"
              />
              {errors.sku && (
                <p className="text-red-500 text-xs mt-1">{errors.sku}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Açıklama
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  handleInputChange("description", e.target.value)
                }
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ürün açıklamasını girin"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Kategori *
              </label>
              <select
                value={formData.category}
                onChange={(e) => handleInputChange("category", e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.category ? "border-red-500" : "border-gray-300 dark:border-gray-600"
                }`}
              >
                <option value="">Kategori seçin</option>
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              {errors.category && (
                <p className="text-red-500 text-xs mt-1">{errors.category}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Durum
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleInputChange("status", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-4">
            Fiyat ve Stok
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Satış Fiyatı (₺) *
              </label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => handleInputChange("price", e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.price ? "border-red-500" : "border-gray-300 dark:border-gray-600"
                }`}
                placeholder="0.00"
                step="0.01"
                min="0"
              />
              {errors.price && (
                <p className="text-red-500 text-xs mt-1">{errors.price}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Maliyet Fiyatı (₺)
              </label>
              <input
                type="number"
                value={formData.costPrice}
                onChange={(e) => handleInputChange("costPrice", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Stok Miktarı *
              </label>
              <input
                type="number"
                value={formData.stockQuantity}
                onChange={(e) =>
                  handleInputChange("stockQuantity", e.target.value)
                }
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.stockQuantity ? "border-red-500" : "border-gray-300 dark:border-gray-600"
                }`}
                placeholder="0"
                min="0"
              />
              {errors.stockQuantity && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.stockQuantity}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Minimum Stok
              </label>
              <input
                type="number"
                value={formData.minStockLevel}
                onChange={(e) =>
                  handleInputChange("minStockLevel", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
                min="0"
              />
            </div>
          </div>
        </div>

        {/* Dimensions & Weight */}
        <div>
          <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-4">
            Boyut ve Ağırlık
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Uzunluk (cm)
              </label>
              <input
                type="number"
                value={formData.dimensions.length}
                onChange={(e) =>
                  handleDimensionChange("length", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Genişlik (cm)
              </label>
              <input
                type="number"
                value={formData.dimensions.width}
                onChange={(e) => handleDimensionChange("width", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Yükseklik (cm)
              </label>
              <input
                type="number"
                value={formData.dimensions.height}
                onChange={(e) =>
                  handleDimensionChange("height", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Ağırlık (kg)
              </label>
              <input
                type="number"
                value={formData.weight}
                onChange={(e) => handleInputChange("weight", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>
          </div>
        </div>

        {/* Images */}
        <div>
          <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-4">
            Ürün Görselleri
          </h4>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-4">
              {formData.images.map((image, index) => (
                <div key={index} className="relative">
                  <img
                    src={image}
                    alt={`Product ${index + 1}`}
                    className="w-20 h-20 object-cover rounded-lg border border-gray-300 dark:border-gray-600"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addImage}
                className="w-20 h-20 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center hover:border-gray-400 transition-colors"
              >
                <Plus className="w-6 h-6 text-gray-400 dark:text-gray-500" />
              </button>
            </div>
          </div>
        </div>

        {/* Tags */}
        <div>
          <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-4">Etiketler</h4>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="flex items-center gap-1"
                >
                  <Tag className="w-3 h-3" />
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-1 text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:text-gray-300"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && addTag()}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Yeni etiket ekle"
              />
              <Button onClick={addTag} variant="outline" size="sm">
                Ekle
              </Button>
            </div>
          </div>
        </div>

        {/* Platform Settings */}
        <div>
          <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-4">
            Platform Ayarları
          </h4>
          <div className="space-y-4">
            {PLATFORMS.filter((p) => p.value !== "all").map((platform) => (
              <Card key={platform.value}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={
                          formData.platforms[platform.value]?.enabled || false
                        }
                        onChange={(e) =>
                          handlePlatformChange(
                            platform.value,
                            "enabled",
                            e.target.checked
                          )
                        }
                        className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 mr-3"
                      />
                      <div className="flex items-center">
                        {PlatformIcons[platform.value]}
                        <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                          {platform.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  {formData.platforms[platform.value]?.enabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Platform SKU
                        </label>
                        <input
                          type="text"
                          value={
                            formData.platforms[platform.value]?.platformSku ||
                            ""
                          }
                          onChange={(e) =>
                            handlePlatformChange(
                              platform.value,
                              "platformSku",
                              e.target.value
                            )
                          }
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                            formData.platforms[platform.value]?.price || ""
                          }
                          onChange={(e) =>
                            handlePlatformChange(
                              platform.value,
                              "price",
                              e.target.value
                            )
                          }
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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

      {/* Footer */}
      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700 mt-6">
        <Button onClick={onClose} variant="outline">
          İptal
        </Button>
        <Button onClick={handleSubmit} variant="primary" disabled={loading}>
          {loading ? "Kaydediliyor..." : product ? "Güncelle" : "Kaydet"}
        </Button>
      </div>
    </Modal>
  );
};

// Product Details Modal Component
const ProductDetailsModal = ({
  isOpen,
  onClose,
  product,
  onEdit,
  onImageClick,
}) => {
  if (!product) return null;

  const stockStatus = getStockStatus(product);
  const platformBadges = getPlatformBadges(product);
  const StatusIcon = stockStatus.icon;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ürün Detayları" size="lg">
      <div className="space-y-6">
        {/* Product Images */}
        <div className="flex justify-center">
          {product.images && product.images.length > 0 ? (
            <div className="space-y-4">
              <img
                src={product.images[0]}
                alt={product.name}
                className="h-64 w-auto object-contain cursor-pointer hover:opacity-90 rounded-lg border border-gray-200 dark:border-gray-700"
                onClick={() =>
                  onImageClick?.(product.images[0], product.name, product)
                }
              />
              {product.images.length > 1 && (
                <div className="flex justify-center gap-2">
                  {product.images.slice(1, 5).map((img, index) => (
                    <img
                      key={index}
                      src={img}
                      alt={`${product.name} ${index + 2}`}
                      className="h-16 w-16 object-cover rounded cursor-pointer hover:opacity-80 border border-gray-200 dark:border-gray-700"
                      onClick={() => onImageClick?.(img, product.name, product)}
                    />
                  ))}
                  {product.images.length > 5 && (
                    <div className="h-16 w-16 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center border border-gray-200 dark:border-gray-700">
                      <span className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">
                        +{product.images.length - 5}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="h-64 w-64 bg-gray-100 dark:bg-gray-700 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700">
              <Image className="h-16 w-16 text-gray-400 dark:text-gray-500" />
            </div>
          )}
        </div>

        {/* Product Info */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {product.name}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 dark:text-gray-500 mb-4">{product.description}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Info */}
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500">SKU</label>
                <p className="font-mono text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                  {product.sku}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500">
                  Kategori
                </label>
                <p className="font-medium">{product.category}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500">
                  Durum
                </label>
                <div>
                  <Badge
                    variant={
                      product.status === "active" ? "success" : "secondary"
                    }
                  >
                    {product.status === "active"
                      ? "Aktif"
                      : product.status === "inactive"
                      ? "Pasif"
                      : "Taslak"}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Pricing & Stock */}
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500">
                  Satış Fiyatı
                </label>
                <p className="text-lg font-semibold text-green-600">
                  {formatPrice(product.price)}
                </p>
              </div>
              {product.costPrice && (
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500">
                    Maliyet Fiyatı
                  </label>
                  <p className="font-medium">
                    {formatPrice(product.costPrice)}
                  </p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500">
                  Stok Durumu
                </label>
                <div className="flex items-center">
                  {StatusIcon}
                  <Badge variant={stockStatus.variant}>
                    {product.stockQuantity} - {stockStatus.label}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dimensions & Weight */}
        {(product.dimensions || product.weight) && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
              Boyut ve Ağırlık
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {product.dimensions?.length && (
                <div>
                  <label className="text-gray-500 dark:text-gray-400 dark:text-gray-500">Uzunluk</label>
                  <p className="font-medium">{product.dimensions.length} cm</p>
                </div>
              )}
              {product.dimensions?.width && (
                <div>
                  <label className="text-gray-500 dark:text-gray-400 dark:text-gray-500">Genişlik</label>
                  <p className="font-medium">{product.dimensions.width} cm</p>
                </div>
              )}
              {product.dimensions?.height && (
                <div>
                  <label className="text-gray-500 dark:text-gray-400 dark:text-gray-500">Yükseklik</label>
                  <p className="font-medium">{product.dimensions.height} cm</p>
                </div>
              )}
              {product.weight && (
                <div>
                  <label className="text-gray-500 dark:text-gray-400 dark:text-gray-500">Ağırlık</label>
                  <p className="font-medium">{product.weight} kg</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tags */}
        {product.tags && product.tags.length > 0 && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
              Etiketler
            </h3>
            <div className="flex flex-wrap gap-2">
              {product.tags.map((tag, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="flex items-center gap-1"
                >
                  <Tag className="h-3 w-3" />
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Platform Status */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
            Platform Durumu
          </h3>
          {platformBadges.length > 0 ? (
            <div className="space-y-3">
              {platformBadges.map((platform, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
                >
                  <div className="flex items-center">
                    {platform.icon}
                    <span className="ml-2 font-medium">{platform.label}</span>
                  </div>
                  <div className="flex items-center space-x-4 text-sm">
                    {platform.sku && (
                      <span className="text-gray-600 dark:text-gray-400 dark:text-gray-500">SKU: {platform.sku}</span>
                    )}
                    {platform.stockQuantity !== undefined && (
                      <span className="text-gray-600 dark:text-gray-400 dark:text-gray-500">
                        Stok: {platform.stockQuantity}
                      </span>
                    )}
                    {platform.price && (
                      <span className="text-gray-600 dark:text-gray-400 dark:text-gray-500">
                        Fiyat: {formatPrice(platform.price)}
                      </span>
                    )}
                    <Badge variant="success">Aktif</Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500 text-sm">Platform bağlantısı yok</p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700 mt-6">
        <Button onClick={onClose} variant="outline">
          Kapat
        </Button>
        <Button
          onClick={() => {
            onClose();
            onEdit?.(product);
          }}
          variant="primary"
          icon={Edit}
        >
          Düzenle
        </Button>
      </div>
    </Modal>
  );
};

// Enhanced Image Preview Modal Component with Multi-Image Support
const ImagePreviewModal = ({
  isOpen,
  onClose,
  imageUrl,
  productName,
  images = [],
  currentIndex = 0,
}) => {
  const [activeIndex, setActiveIndex] = useState(currentIndex);

  useEffect(() => {
    setActiveIndex(currentIndex);
  }, [currentIndex, isOpen]);

  const goToPrevious = useCallback(() => {
    setActiveIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  }, [images.length]);

  const goToNext = useCallback(() => {
    setActiveIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  }, [images.length]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "ArrowLeft") goToPrevious();
      if (e.key === "ArrowRight") goToNext();
      if (e.key === "Escape") onClose();
    },
    [goToPrevious, goToNext, onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen || (!imageUrl && (!images || images.length === 0))) return null;

  const imageList = images.length > 0 ? images : [imageUrl];
  const currentImage = imageList[activeIndex] || imageUrl;
  const hasMultipleImages = imageList.length > 1;

  return (
    <div className="fixed inset-0 z-modal bg-black bg-opacity-30 flex items-center justify-center">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-20 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-full transition-all duration-200"
        aria-label="Close"
      >
        <X className="w-6 h-6" />
      </button>

      <div className="flex flex-col items-center justify-center w-full h-full relative">
        {/* Main Image Display */}
        <div className="relative flex items-center justify-center flex-1 w-fit">
          {/* Previous Button */}
          {hasMultipleImages && (
            <button
              onClick={goToPrevious}
              className="absolute left-4 z-10 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-3 rounded-full transition-all duration-200"
              aria-label="Previous"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* Image */}
          <img
            src={currentImage}
            alt={`${productName} ${activeIndex + 1}`}
            className="max-h-[80vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
            style={{ userSelect: "none" }}
          />

          {/* Next Button */}
          {hasMultipleImages && (
            <button
              onClick={goToNext}
              className="absolute right-4 z-10 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-3 rounded-full transition-all duration-200"
              aria-label="Next"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* Thumbnails */}
        {hasMultipleImages && (
          <div className="flex space-x-2 mt-4 max-w-full overflow-x-auto pb-2">
            {imageList.map((img, index) => (
              <button
                key={index}
                onClick={() => setActiveIndex(index)}
                className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                  index === activeIndex
                    ? "border-blue-500 ring-2 ring-blue-300"
                    : "border-gray-300 dark:border-gray-600 hover:border-gray-400"
                }`}
              >
                <img
                  src={img}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}

        {/* Action Buttons - minimal and hidden by default, can be shown on hover */}
        <div className="opacity-0 hover:opacity-100 transition-opacity absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
          <button
            onClick={() => window.open(currentImage, "_blank")}
            className="bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-full transition-all duration-200"
            aria-label="Open in new tab"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigator.clipboard.writeText(currentImage)}
            className="bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-full transition-all duration-200"
            aria-label="Copy URL"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Confirmation Modal Component
const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Onaylama Gerekli",
  message = "Bu işlemi gerçekleştirmek istediğinizden emin misiniz?",
  confirmText = "Onayla",
  cancelText = "İptal",
  variant = "danger",
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="space-y-4">
        <p className="text-gray-600 dark:text-gray-400 dark:text-gray-500">{message}</p>
        <div className="flex justify-end space-x-3">
          <Button onClick={onClose} variant="outline">
            {cancelText}
          </Button>
          <Button onClick={onConfirm} variant={variant}>
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export {
  ProductFormModal,
  ProductDetailsModal,
  ImagePreviewModal,
  ConfirmationModal,
};
