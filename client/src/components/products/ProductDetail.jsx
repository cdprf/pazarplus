import logger from "../../utils/logger.js";
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Package,
  Edit,
  Save,
  X,
  FileText,
  Download,
  Eye,
  Settings,
  ShoppingCart,
  TrendingUp,
  BarChart3,
  Globe,
  Copy,
  ImageIcon,
  Tag,
  MessageCircle,
} from "lucide-react";
import api from "../../services/api";
import { useAlert } from "../../contexts/AlertContext";
import ProductTimeline from "./ProductTimeline";
import ProductPlatformLinks from "./ProductPlatformLinks";
import ProductVariants from "./ProductVariants";
import ProductInventory from "./ProductInventory";
import ProductMedia from "./ProductMedia";

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editedProduct, setEditedProduct] = useState({});
  const [activeTab, setActiveTab] = useState("overview");
  const { showNotification } = useAlert();

  // Fetch product details
  const fetchProduct = useCallback(async () => {
    try {
      setLoading(true);
      logger.info(`🔍 Fetching product with ID: ${id}`);
      const response = await api.get(`/products/${id}`);
      logger.info("✅ Product fetched successfully:", response.data);

      // Handle both success: true/false response formats
      const productData = response.data.success
        ? response.data.data
        : response.data;
      setProduct(productData);
      setEditedProduct(productData);
    } catch (error) {
      logger.error("❌ Error fetching product:", error);

      if (error.response) {
        logger.error("Response status:", error.response.status);
        logger.error("Response data:", error.response.data);

        if (error.response.status === 401) {
          showNotification("Please log in to view product details", "error");
        } else if (error.response.status === 404) {
          showNotification("Product not found", "error");
        } else {
          showNotification(
            error.response.data?.message || "Failed to load product",
            "error"
          );
        }
      } else {
        showNotification(
          "Network error - please check your connection",
          "error"
        );
      }
    } finally {
      setLoading(false);
    }
  }, [id, showNotification]);

  useEffect(() => {
    if (id) {
      fetchProduct();
    }
  }, [id, fetchProduct]);

  const handleSaveEdit = async () => {
    try {
      await api.put(`/products/${product.id}`, editedProduct);
      setProduct(editedProduct);
      setEditing(false);
      showNotification("Product updated successfully", "success");
    } catch (error) {
      logger.error("Error updating product:", error);
      showNotification("Error updating product", "error");
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "inactive":
        return "bg-red-100 text-red-800";
      case "draft":
        return "bg-yellow-100 text-yellow-800";
      case "pending":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPlatformBadgeColor = (platform) => {
    switch (platform?.toLowerCase()) {
      case "trendyol":
        return "bg-orange-100 text-orange-800";
      case "hepsiburada":
        return "bg-blue-100 text-blue-800";
      case "n11":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatCurrency = (amount, currency = "TRY") => {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: currency,
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("tr-TR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    showNotification(`${label} copied to clipboard`, "success");
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="ml-4 text-gray-600 dark:text-gray-400">
            Loading product details...
          </p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Product not found
          </h3>
          <p className="text-gray-500">
            The product you're looking for doesn't exist.
          </p>
          <button
            onClick={() => navigate("/products")}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Back to Products
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <button
            onClick={() => navigate("/products")}
            className="mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {product.name}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              SKU: {product.sku} • Created {formatDate(product.createdAt)}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <span
            className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(
              product.status
            )}`}
          >
            {product.status}
          </span>

          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </button>
          ) : (
            <div className="flex space-x-2">
              <button
                onClick={handleSaveEdit}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center"
              >
                <Save className="w-4 h-4 mr-2" />
                Save
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setEditedProduct(product);
                }}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="flex space-x-8">
          {[
            { id: "overview", label: "Overview", icon: Package },
            { id: "platforms", label: "Platform Links", icon: Globe },
            { id: "variants", label: "Variants", icon: Tag },
            {
              id: "questions",
              label: "Customer Questions",
              icon: MessageCircle,
            },
            { id: "inventory", label: "Inventory", icon: BarChart3 },
            { id: "media", label: "Media", icon: ImageIcon },
            { id: "analytics", label: "Analytics", icon: TrendingUp },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {activeTab === "overview" && (
            <>
              {/* Product Information */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Package className="w-5 h-5 mr-2" />
                  Product Information
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Name
                      </label>
                      {editing ? (
                        <input
                          type="text"
                          value={editedProduct.name || ""}
                          onChange={(e) =>
                            setEditedProduct({
                              ...editedProduct,
                              name: e.target.value,
                            })
                          }
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      ) : (
                        <p className="mt-1 text-gray-900 dark:text-gray-100">
                          {product.name}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        SKU
                      </label>
                      <div className="mt-1 flex items-center space-x-2">
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                          {product.sku}
                        </code>
                        <button
                          onClick={() => copyToClipboard(product.sku, "SKU")}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Category
                      </label>
                      <p className="mt-1 text-gray-900 dark:text-gray-100">
                        {product.category || "N/A"}
                      </p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Brand
                      </label>
                      <p className="mt-1 text-gray-900 dark:text-gray-100">
                        {product.brand || "N/A"}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Price
                      </label>
                      {editing ? (
                        <input
                          type="number"
                          value={editedProduct.price || ""}
                          onChange={(e) =>
                            setEditedProduct({
                              ...editedProduct,
                              price: parseFloat(e.target.value),
                            })
                          }
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      ) : (
                        <p className="mt-1 text-2xl font-bold text-green-600">
                          {formatCurrency(product.price)}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Stock Quantity
                      </label>
                      {editing ? (
                        <input
                          type="number"
                          value={
                            editedProduct.stockQuantity ||
                            editedProduct.stock ||
                            ""
                          }
                          onChange={(e) =>
                            setEditedProduct({
                              ...editedProduct,
                              stockQuantity: parseInt(e.target.value),
                              stock: parseInt(e.target.value),
                            })
                          }
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      ) : (
                        <p className="mt-1 text-gray-900 dark:text-gray-100">
                          {product.stockQuantity || product.stock || 0} units
                        </p>
                      )}
                    </div>

                    {product.barcode && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">
                          Barcode
                        </label>
                        <div className="mt-1 flex items-center space-x-2">
                          <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                            {product.barcode}
                          </code>
                          <button
                            onClick={() =>
                              copyToClipboard(product.barcode, "Barcode")
                            }
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Weight
                      </label>
                      <p className="mt-1 text-gray-900 dark:text-gray-100">
                        {product.weight ? `${product.weight} kg` : "N/A"}
                      </p>
                    </div>
                  </div>
                </div>

                {product.description && (
                  <div className="mt-6">
                    <label className="text-sm font-medium text-gray-500">
                      Description
                    </label>
                    {editing ? (
                      <textarea
                        value={editedProduct.description || ""}
                        onChange={(e) =>
                          setEditedProduct({
                            ...editedProduct,
                            description: e.target.value,
                          })
                        }
                        rows={4}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="mt-1 text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                        {product.description}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Product Timeline */}
              <ProductTimeline product={product} />
            </>
          )}

          {activeTab === "platforms" && (
            <ProductPlatformLinks product={product} />
          )}
          {activeTab === "variants" && <ProductVariants product={product} />}
          {activeTab === "questions" && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <MessageCircle className="w-5 h-5 mr-2" />
                Customer Questions ({product?.questionsCount || 0})
              </h2>
              {product?.customerQuestions &&
              product.customerQuestions.length > 0 ? (
                <div className="space-y-4">
                  {product.customerQuestions.map((question, index) => (
                    <div
                      key={question.id || index}
                      className="border border-gray-200 dark:border-gray-600 rounded-lg p-4"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-medium text-blue-600 capitalize">
                          {question.platform}
                        </span>
                        <span className="text-xs text-gray-500">
                          {question.creation_date
                            ? new Date(
                                question.creation_date
                              ).toLocaleDateString()
                            : "N/A"}
                        </span>
                      </div>
                      <p className="text-gray-900 dark:text-gray-100 mb-3">
                        {question.question_text}
                      </p>
                      {question.answer_text && (
                        <div className="bg-gray-50 dark:bg-gray-700 rounded p-3 mt-2">
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            <strong>Answer:</strong> {question.answer_text}
                          </p>
                          {question.answer_date && (
                            <p className="text-xs text-gray-500 mt-1">
                              Answered on:{" "}
                              {new Date(
                                question.answer_date
                              ).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      )}
                      {question.status && (
                        <span
                          className={`inline-block mt-2 px-2 py-1 text-xs rounded-full ${
                            question.status === "answered"
                              ? "bg-green-100 text-green-800"
                              : question.status === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {question.status}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">
                  No customer questions for this product.
                </p>
              )}
            </div>
          )}
          {activeTab === "inventory" && <ProductInventory product={product} />}
          {activeTab === "media" && <ProductMedia product={product} />}
          {activeTab === "analytics" && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                Product Analytics
              </h2>
              <p className="text-gray-500">Analytics feature coming soon...</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              Quick Actions
            </h2>

            <div className="space-y-3">
              <button className="w-full bg-blue-100 hover:bg-blue-200 text-blue-800 px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center">
                <Eye className="w-4 h-4 mr-2" />
                Preview on Store
              </button>

              <button className="w-full bg-green-100 hover:bg-green-200 text-green-800 px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center">
                <ShoppingCart className="w-4 h-4 mr-2" />
                Add to Catalog
              </button>

              <button className="w-full bg-purple-100 hover:bg-purple-200 text-purple-800 px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center">
                <FileText className="w-4 h-4 mr-2" />
                Generate Report
              </button>

              <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center">
                <Download className="w-4 h-4 mr-2" />
                Export Data
              </button>
            </div>
          </div>

          {/* Platform Status */}
          {product.platformData && product.platformData.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Globe className="w-5 h-5 mr-2" />
                Platform Status
              </h2>

              <div className="space-y-3">
                {product.platformData.map((platform, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between"
                  >
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPlatformBadgeColor(
                        platform.platform
                      )}`}
                    >
                      {platform.platform}
                    </span>
                    <span className="text-sm text-gray-500">
                      {platform.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Product Stats */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              Product Stats
            </h2>

            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Total Views</span>
                <span className="text-sm font-medium text-gray-900">-</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Total Orders</span>
                <span className="text-sm font-medium text-gray-900">-</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Revenue</span>
                <span className="text-sm font-medium text-gray-900">-</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Last Updated</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatDate(product.updatedAt)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
