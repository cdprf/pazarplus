/**
 * OrderProductLinks - Enhanced product linking component
 * Shows order items with images, links to product details and platform sources
 * Uses improved server-side matching for accurate product identification
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  Package,
  Image as ImageIcon,
  AlertCircle,
  CheckCircle,
  Box,
  Tag,
  Palette,
  Ruler,
  ShoppingCart,
  Eye,
  Link,
  Search,
  X,
  Plus,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
} from "lucide-react";
import { formatCurrency } from "../../utils/platformHelpers";
import api from "../../services/api";

const OrderProductLinks = ({ order, onProductClick }) => {
  const [orderItems, setOrderItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchingProducts, setSearchingProducts] = useState(false);
  const [linkingItem, setLinkingItem] = useState(null);

  // Image gallery state
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Fetch order items with linked products
  const fetchOrderItemsWithProducts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(
        `/order-management/orders/${order.id}/items-with-products`
      );

      if (response.data.success) {
        setOrderItems(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching order items with products:", error);
    } finally {
      setLoading(false);
    }
  }, [order.id]);

  useEffect(() => {
    if (order?.id) {
      fetchOrderItemsWithProducts();
    }
  }, [order?.id, fetchOrderItemsWithProducts]);

  // Search products for manual linking
  const searchProducts = async (query) => {
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setSearchingProducts(true);
      const response = await api.get("/order-management/products/search", {
        params: { q: query.trim(), limit: 10 },
      });

      if (response.data.success) {
        setSearchResults(response.data.data);
      }
    } catch (error) {
      console.error("Error searching products:", error);
      setSearchResults([]);
    } finally {
      setSearchingProducts(false);
    }
  };

  // Handle search input change with debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      searchProducts(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Link order item with product
  const linkItemWithProduct = async (itemId, productId) => {
    try {
      await api.post(`/order-management/order-items/${itemId}/link-product`, {
        productId,
      });

      // Refresh the order items
      await fetchOrderItemsWithProducts();
      setLinkingItem(null);
      setSearchTerm("");
      setSearchResults([]);
    } catch (error) {
      console.error("Error linking item with product:", error);
    }
  };

  // Unlink order item from product
  const unlinkItemFromProduct = async (itemId) => {
    try {
      await api.delete(
        `/order-management/order-items/${itemId}/unlink-product`
      );

      // Refresh the order items
      await fetchOrderItemsWithProducts();
    } catch (error) {
      console.error("Error unlinking item from product:", error);
    }
  };

  // Helper function to extract and normalize all images from a product
  const getProductImages = useCallback((product) => {
    if (!product?.images) return [];

    const images = Array.isArray(product.images) ? product.images : [];
    const uniqueImages = [];

    images.forEach((img) => {
      let imageUrl = "";
      if (typeof img === "string") {
        imageUrl = img;
      } else if (img?.url) {
        imageUrl = img.url;
      }

      if (imageUrl && !uniqueImages.includes(imageUrl)) {
        uniqueImages.push(imageUrl);
      }
    });

    return uniqueImages;
  }, []);

  // Image gallery functions
  const openImageGallery = useCallback(
    (product) => {
      const images = getProductImages(product);
      if (images.length > 0) {
        setSelectedProduct(product);
        setSelectedImages(images);
        setCurrentImageIndex(0);
        setImageModalOpen(true);
      }
    },
    [getProductImages]
  );

  const closeImageGallery = useCallback(() => {
    setImageModalOpen(false);
    setSelectedImages([]);
    setCurrentImageIndex(0);
    setSelectedProduct(null);
  }, []);

  const navigateImage = useCallback(
    (direction) => {
      if (direction === "next") {
        setCurrentImageIndex((prev) =>
          prev >= selectedImages.length - 1 ? 0 : prev + 1
        );
      } else {
        setCurrentImageIndex((prev) =>
          prev <= 0 ? selectedImages.length - 1 : prev - 1
        );
      }
    },
    [selectedImages.length]
  );

  // Keyboard navigation for image modal
  useEffect(() => {
    const handleKeyPress = (event) => {
      if (!imageModalOpen) return;

      switch (event.key) {
        case "Escape":
          closeImageGallery();
          break;
        case "ArrowLeft":
          event.preventDefault();
          navigateImage("prev");
          break;
        case "ArrowRight":
          event.preventDefault();
          navigateImage("next");
          break;
        default:
          // No action needed for other keys
          break;
      }
    };

    document.addEventListener("keydown", handleKeyPress);
    return () => document.removeEventListener("keydown", handleKeyPress);
  }, [imageModalOpen, selectedImages.length, navigateImage, closeImageGallery]);

  // Platform icons mapping
  const getPlatformIcon = (platform) => {
    const platformLower = platform?.toLowerCase();
    const icons = {
      trendyol: (
        <img
          src="https://cdn.brandfetch.io/idEdTxkWAp/w/400/h/400/theme/dark/icon.jpeg?c=1dxbfHSJFAPEGdCLU4o5B"
          alt="Trendyol"
          className="w-4 h-4 rounded"
        />
      ),
      hepsiburada: (
        <img
          src="https://cdn.brandfetch.io/id9XTiaix8/theme/dark/logo.svg?c=1dxbfHSJFAPEGdCLU4o5B"
          alt="Hepsiburada"
          className="w-4 h-4 rounded"
        />
      ),
      n11: (
        <img
          src="https://cdn.brandfetch.io/idIWnXEme7/theme/dark/logo.svg?c=1dxbfHSJFAPEGdCLU4o5B"
          alt="N11"
          className="w-4 h-4 rounded"
        />
      ),
      amazon: (
        <img
          src="https://cdn.brandfetch.io/idgAGdh3be/theme/dark/logo.svg?c=1dxbfHSJFAPEGdCLU4o5B"
          alt="Amazon"
          className="w-4 h-4 rounded"
        />
      ),
    };
    return (
      icons[platformLower] || <ShoppingCart className="w-4 h-4 text-gray-500" />
    );
  };

  // Get platform-specific product URL
  const getPlatformProductUrl = (item, platform) => {
    const platformLower = platform?.toLowerCase();
    const productId = item.platformProductId || item.productId || item.sku;

    if (!productId) return null;

    const urls = {
      trendyol: `https://www.trendyol.com/product/${productId}`,
      hepsiburada: `https://www.hepsiburada.com/product/${productId}`,
      n11: `https://www.n11.com/product/${productId}`,
      amazon: `https://www.amazon.com.tr/dp/${productId}`,
    };

    return urls[platformLower] || null;
  };

  // Get match confidence badge
  const getMatchBadge = (item) => {
    if (item.productId) {
      const matchType = item.bestMatch?.matchType || "linked";
      const confidence = item.bestMatch?.confidence || 100;

      if (confidence >= 95) {
        return (
          <span className="badge badge-success">
            <CheckCircle className="w-3 h-3 mr-1" />
            {matchType === "sku"
              ? "SKU Match"
              : matchType === "barcode"
              ? "Barcode Match"
              : "Linked"}
          </span>
        );
      } else if (confidence >= 80) {
        return (
          <span className="badge badge-warning">
            <AlertCircle className="w-3 h-3 mr-1" />
            Partial Match
          </span>
        );
      }
    }

    return (
      <span className="badge badge-danger">
        <X className="w-3 h-3 mr-1" />
        No Match
      </span>
    );
  };

  if (loading) {
    return (
      <div className="card">
        <div className="loading-overlay loading-overlay-inline">
          <div className="loading-spinner loading-spinner-sm"></div>
          <span className="loading-text">Loading products...</span>
        </div>
      </div>
    );
  }

  if (!orderItems || orderItems.length === 0) {
    return (
      <div className="card">
        <div className="empty-state">
          <div className="empty-state-icon">
            <Package className="h-12 w-12 text-gray-400" />
          </div>
          <h3 className="empty-state-title">Bu siparişte ürün bulunmuyor</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <h4 className="card-title flex items-center">
          <Link className="h-5 w-5 mr-2 icon-contrast-primary" />
          Ürün Bağlantıları ({orderItems.length})
        </h4>
        <p className="card-subtitle">
          Sipariş ürünleri ve stok sistemindeki karşılıkları
        </p>
      </div>

      <div className="card-body">
        <div className="space-y-4">
          {orderItems.map((item) => (
            <div
              key={item.id}
              className="card card-interactive">
              <div className="flex items-start space-x-4">{/* Product Image Gallery */}
                {/* Product Image Gallery */}
                <div className="flex-shrink-0">
                  {item.bestMatch?.images &&
                  getProductImages(item.bestMatch).length > 0 ? (
                    <div className="relative group">
                      <img
                        src={getProductImages(item.bestMatch)[0]}
                        alt={item.title}
                        className="w-16 h-16 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => openImageGallery(item.bestMatch)}
                        onError={(e) => {
                          e.target.style.display = "none";
                          e.target.nextSibling.style.display = "flex";
                        }}
                      />
                      {/* Image overlay with count and zoom icon */}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-lg transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <ZoomIn className="h-4 w-4 text-white" />
                      </div>
                      {getProductImages(item.bestMatch).length > 1 && (
                        <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                          {getProductImages(item.bestMatch).length}
                        </div>
                      )}
                    </div>
                  ) : null}
                  <div
                    className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    style={{
                      display:
                        item.bestMatch?.images &&
                        getProductImages(item.bestMatch).length > 0
                          ? "none"
                          : "flex",
                    }}
                  >
                    <ImageIcon className="h-6 w-6 text-gray-400" />
                  </div>
                </div>

                {/* Product Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                        {item.title}
                      </h5>

                      {/* Product metadata */}
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
                        {item.sku && (
                          <span className="flex items-center">
                            <Tag className="w-3 h-3 mr-1" />
                            SKU: {item.sku}
                          </span>
                        )}
                        {item.barcode && (
                          <span className="flex items-center">
                            <Box className="w-3 h-3 mr-1" />
                            Barkod: {item.barcode}
                          </span>
                        )}
                        {item.productSize && (
                          <span className="flex items-center">
                            <Ruler className="w-3 h-3 mr-1" />
                            {item.productSize}
                          </span>
                        )}
                        {item.productColor && (
                          <span className="flex items-center">
                            <Palette className="w-3 h-3 mr-1" />
                            {item.productColor}
                          </span>
                        )}
                      </div>

                      {/* Quantity and Price */}
                      <div className="mt-2 flex items-center space-x-4">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Adet: {item.quantity}
                        </span>
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {formatCurrency(item.price, item.currency)}
                        </span>
                      </div>
                    </div>

                    {/* Match Status and Actions */}
                    <div className="flex flex-col items-end space-y-2">
                      {getMatchBadge(item)}

                      <div className="flex items-center space-x-2">
                        {/* Platform Link */}
                        {getPlatformProductUrl(item, order.platform) && (
                          <a
                            href={getPlatformProductUrl(item, order.platform)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Platformda görüntüle"
                          >
                            {getPlatformIcon(order.platform)}
                          </a>
                        )}

                        {/* Product Link */}
                        {item.bestMatch && (
                          <button
                            onClick={() =>
                              onProductClick && onProductClick(item.bestMatch)
                            }
                            className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Ürün detayını görüntüle"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}

                        {/* Link/Unlink Product */}
                        {item.productId ? (
                          <button
                            onClick={() => unlinkItemFromProduct(item.id)}
                            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                            title="Ürün bağlantısını kaldır"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => setLinkingItem(item.id)}
                            className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Manuel ürün bağla"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Linked Product Info */}
                  {item.bestMatch && (
                    <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-green-800 dark:text-green-200">
                            Bağlı Ürün: {item.bestMatch.name}
                          </p>
                          <p className="text-xs text-green-600 dark:text-green-300">
                            Stok: {item.bestMatch.stockQuantity} • Fiyat:{" "}
                            {formatCurrency(item.bestMatch.price)}
                          </p>
                        </div>
                        {item.bestMatch.confidence && (
                          <span className="text-xs text-green-600 dark:text-green-300">
                            %{item.bestMatch.confidence} eşleşme
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Manual linking interface */}
                  {linkingItem === item.id && (
                    <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium text-blue-800 dark:text-blue-200">
                            Ürün Ara ve Bağla
                          </label>
                          <button
                            onClick={() => setLinkingItem(null)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="relative">
                          <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Ürün adı, SKU veya barkod ile ara..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-100"
                          />
                          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        </div>

                        {searchingProducts && (
                          <div className="text-center py-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mx-auto"></div>
                          </div>
                        )}

                        {searchResults.length > 0 && (
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {searchResults.map((product) => (
                              <button
                                key={product.id}
                                onClick={() =>
                                  linkItemWithProduct(item.id, product.id)
                                }
                                className="w-full text-left p-2 hover:bg-blue-100 dark:hover:bg-blue-800 rounded border border-gray-200 dark:border-gray-600"
                              >
                                <div className="flex items-center space-x-3">
                                  <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded flex-shrink-0 flex items-center justify-center">
                                    <Package className="w-4 h-4 text-gray-500" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                      {product.name}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      SKU: {product.sku} • Stok:{" "}
                                      {product.stockQuantity}
                                    </p>
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Image Gallery Modal */}
      {imageModalOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg max-w-4xl max-h-[90vh] w-full overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {selectedProduct?.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {currentImageIndex + 1} / {selectedImages.length} resim
                </p>
              </div>
              <button
                onClick={closeImageGallery}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Main Image Display */}
            <div className="relative">
              <div className="flex items-center justify-center min-h-[400px] max-h-[60vh] bg-gray-50 dark:bg-gray-800">
                <img
                  src={selectedImages[currentImageIndex]}
                  alt={`${selectedProduct?.name} - ${currentImageIndex + 1}`}
                  className="max-w-full max-h-full object-contain"
                  onError={(e) => {
                    e.target.src =
                      "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5SZXNpbSBZw7xrbGVuZW1lZGk8L3RleHQ+PC9zdmc+";
                  }}
                />
              </div>

              {/* Navigation Arrows */}
              {selectedImages.length > 1 && (
                <>
                  <button
                    onClick={() => navigateImage("prev")}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-75 text-white p-2 rounded-full transition-all"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    onClick={() => navigateImage("next")}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-75 text-white p-2 rounded-full transition-all"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnail Strip */}
            {selectedImages.length > 1 && (
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex space-x-2 overflow-x-auto">
                  {selectedImages.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`flex-shrink-0 w-16 h-16 rounded-lg border-2 overflow-hidden ${
                        index === currentImageIndex
                          ? "border-blue-500"
                          : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                      } transition-colors`}
                    >
                      <img
                        src={image}
                        alt={`Thumbnail ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src =
                            "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2RkZCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjEwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Tm88L3RleHQ+PC9zdmc+";
                        }}
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Product Info */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">SKU:</span>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {selectedProduct?.sku}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">
                    Fiyat:
                  </span>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {formatCurrency(selectedProduct?.price || 0)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">
                    Stok:
                  </span>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {selectedProduct?.stockQuantity || 0}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">
                    Kategori:
                  </span>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {selectedProduct?.category || "N/A"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderProductLinks;
