import React, { useState, useEffect, useCallback } from "react";
import {
  Package2,
  Plus,
  Edit,
  Trash2,
  ExternalLink,
  RefreshCw,
  Check,
  X,
  AlertCircle,
  Settings,
  Upload,
  Eye,
} from "lucide-react";
import { useAlert } from "../../contexts/AlertContext";
import PlatformVariantsAPI from "../../services/platformVariantsAPI";
import PlatformVariantModal from "./PlatformVariantModal";
import Button from "../ui/Button";

/**
 * Platform Icons Component
 */
const PlatformIcon = ({ platform, className = "w-5 h-5" }) => {
  const platformConfigs = {
    trendyol: {
      name: "Trendyol",
      color: "text-orange-600",
      bgColor: "bg-orange-100",
      icon: "🛒",
    },
    hepsiburada: {
      name: "Hepsiburada",
      color: "text-orange-700",
      bgColor: "bg-orange-100",
      icon: "🛍️",
    },
    n11: {
      name: "N11",
      color: "text-purple-600",
      bgColor: "bg-purple-100",
      icon: "🏪",
    },
  };

  const config = platformConfigs[platform] || {
    name: platform,
    color: "text-gray-600",
    bgColor: "bg-gray-100",
    icon: "🌐",
  };

  return (
    <div
      className={`${className} ${config.bgColor} ${config.color} flex items-center justify-center rounded-full font-semibold text-xs`}
      title={config.name}
    >
      {config.icon}
    </div>
  );
};

/**
 * Sync Status Badge Component
 */
const SyncStatusBadge = ({ status, error }) => {
  const statusConfigs = {
    pending: {
      label: "Bekliyor",
      color: "bg-gray-100 text-gray-800",
      icon: <AlertCircle className="w-3 h-3" />,
    },
    syncing: {
      label: "Senkronize Ediliyor",
      color: "bg-blue-100 text-blue-800",
      icon: <RefreshCw className="w-3 h-3 animate-spin" />,
    },
    success: {
      label: "Başarılı",
      color: "bg-green-100 text-green-800",
      icon: <Check className="w-3 h-3" />,
    },
    error: {
      label: "Hata",
      color: "bg-red-100 text-red-800",
      icon: <X className="w-3 h-3" />,
    },
    conflict: {
      label: "Çakışma",
      color: "bg-yellow-100 text-yellow-800",
      icon: <AlertCircle className="w-3 h-3" />,
    },
  };

  const config = statusConfigs[status] || statusConfigs.pending;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}
      title={error || config.label}
    >
      {config.icon}
      {config.label}
    </span>
  );
};

/**
 * Variant Card Component
 */
const VariantCard = ({
  variant,
  onEdit,
  onDelete,
  onPublish,
  onSync,
  onView,
}) => {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <PlatformIcon platform={variant.platform} />
          <div>
            <h4 className="font-medium text-gray-900 dark:text-gray-100">
              {variant.platformTitle || variant.platformSku}
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {variant.platform.toUpperCase()} • {variant.platformSku}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SyncStatusBadge
            status={variant.syncStatus}
            error={variant.syncError}
          />
          {variant.isPublished && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <Check className="w-3 h-3" />
              Yayında
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Fiyat
          </p>
          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            ₺{variant.platformPrice}
          </p>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Son Senkronizasyon
          </p>
          <p className="text-sm text-gray-900 dark:text-gray-100">
            {variant.lastSyncAt
              ? new Date(variant.lastSyncAt).toLocaleDateString("tr-TR")
              : "Henüz senkronize edilmedi"}
          </p>
        </div>
      </div>

      {variant.externalUrl && (
        <div className="mb-4">
          <a
            href={variant.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
          >
            <ExternalLink className="w-4 h-4" />
            Platform'da Görüntüle
          </a>
        </div>
      )}

      <div className="flex items-center gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onView(variant)}
          className="flex items-center gap-1"
        >
          <Eye className="w-4 h-4" />
          Görüntüle
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onEdit(variant)}
          className="flex items-center gap-1"
        >
          <Edit className="w-4 h-4" />
          Düzenle
        </Button>
        {!variant.isPublished ? (
          <Button
            variant="primary"
            size="sm"
            onClick={() => onPublish(variant)}
            className="flex items-center gap-1"
            disabled={variant.syncStatus === "syncing"}
          >
            <Upload className="w-4 h-4" />
            Yayınla
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSync(variant)}
            className="flex items-center gap-1"
            disabled={variant.syncStatus === "syncing"}
          >
            <RefreshCw className="w-4 h-4" />
            Senkronize Et
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDelete(variant)}
          className="flex items-center gap-1 text-red-600 hover:text-red-800"
        >
          <Trash2 className="w-4 h-4" />
          Sil
        </Button>
      </div>
    </div>
  );
};

/**
 * Enhanced Product Variants Component
 */
const ProductVariants = ({ product }) => {
  const { showAlert } = useAlert();
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [viewMode, setViewMode] = useState("grid"); // grid, list

  // Fetch variants for the product
  const fetchVariants = useCallback(async () => {
    if (!product?.id) return;

    try {
      setLoading(true);
      const variants = await PlatformVariantsAPI.getProductVariants(product.id);
      setVariants(variants);
    } catch (error) {
      console.error("Fetch variants error:", error);
      showAlert(error.message || "Varyantlar getirilemedi", "error");
    } finally {
      setLoading(false);
    }
  }, [product?.id, showAlert]);

  useEffect(() => {
    fetchVariants();
  }, [fetchVariants]);

  // Handle create variant
  const handleCreateVariant = () => {
    setSelectedVariant(null);
    setShowCreateModal(true);
  };

  // Handle edit variant
  const handleEditVariant = (variant) => {
    setSelectedVariant(variant);
    setShowCreateModal(true);
  };

  // Handle delete variant
  const handleDeleteVariant = async (variant) => {
    if (
      !window.confirm(
        `${variant.platform} varyantını silmek istediğinizden emin misiniz?`
      )
    ) {
      return;
    }

    try {
      await PlatformVariantsAPI.deletePlatformVariant(variant.id);
      showAlert("Varyant başarıyla silindi", "success");
      fetchVariants();
    } catch (error) {
      console.error("Delete variant error:", error);
      showAlert(error.message || "Varyant silinemedi", "error");
    }
  };

  // Handle publish variant
  const handlePublishVariant = async (variant) => {
    try {
      await PlatformVariantsAPI.publishVariant(variant.id);
      showAlert("Varyant yayınlanıyor...", "info");
      fetchVariants();
    } catch (error) {
      console.error("Publish variant error:", error);
      showAlert(error.message || "Varyant yayınlanamadı", "error");
    }
  };

  // Handle sync variant
  const handleSyncVariant = async (variant) => {
    try {
      await PlatformVariantsAPI.syncVariant(variant.id);
      showAlert("Varyant senkronize ediliyor...", "info");
      fetchVariants();
    } catch (error) {
      console.error("Sync variant error:", error);
      showAlert(error.message || "Varyant senkronize edilemedi", "error");
    }
  };

  // Handle view variant
  const handleViewVariant = (variant) => {
    // TODO: Implement variant detail view
    console.log("View variant:", variant);
  };

  // Handle modal close
  const handleModalClose = () => {
    setShowCreateModal(false);
    setSelectedVariant(null);
  };

  // Handle variant save
  const handleVariantSave = () => {
    handleModalClose();
    fetchVariants();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center">
          <Package2 className="h-5 w-5 mr-2" />
          Ürün Varyantları
        </h3>
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-600">Varyantlar yükleniyor...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center">
          <Package2 className="h-5 w-5 mr-2" />
          Platform Varyantları
        </h3>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1 rounded ${
                viewMode === "grid"
                  ? "bg-white dark:bg-gray-600 shadow-sm"
                  : "hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1 rounded ${
                viewMode === "list"
                  ? "bg-white dark:bg-gray-600 shadow-sm"
                  : "hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              <Package2 className="w-4 h-4" />
            </button>
          </div>
          <Button
            onClick={handleCreateVariant}
            className="flex items-center gap-2"
            size="sm"
          >
            <Plus className="w-4 h-4" />
            Platform Varyantı Oluştur
          </Button>
        </div>
      </div>

      {variants.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <Package2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            Henüz Platform Varyantı Yok
          </h4>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Bu ürünü farklı platformlara gönderebilmek için platform varyantları
            oluşturun.
          </p>
          <Button
            onClick={handleCreateVariant}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            İlk Varyantını Oluştur
          </Button>
        </div>
      ) : (
        <div
          className={`${
            viewMode === "grid"
              ? "grid grid-cols-1 md:grid-cols-2 gap-4"
              : "space-y-4"
          }`}
        >
          {variants.map((variant) => (
            <VariantCard
              key={variant.id}
              variant={variant}
              onEdit={handleEditVariant}
              onDelete={handleDeleteVariant}
              onPublish={handlePublishVariant}
              onSync={handleSyncVariant}
              onView={handleViewVariant}
            />
          ))}
        </div>
      )}

      {showCreateModal && (
        <PlatformVariantModal
          isOpen={showCreateModal}
          onClose={handleModalClose}
          product={product}
          variant={selectedVariant}
          onSave={handleVariantSave}
        />
      )}
    </div>
  );
};

export default ProductVariants;
