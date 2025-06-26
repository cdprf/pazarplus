import React from "react";
import {
  Clock,
  Plus,
  Edit,
  Package,
  Globe,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

const ProductTimeline = ({ product }) => {
  // Create timeline events from product data
  const createTimelineEvents = (product) => {
    if (!product) return [];

    const events = [];

    // Product creation event
    if (product.createdAt) {
      events.push({
        id: "created",
        type: "created",
        title: "Ürün Oluşturuldu",
        description: `Ürün "${product.name}" sisteme eklendi`,
        timestamp: product.createdAt,
        icon: Plus,
        color: "bg-green-500",
      });
    }

    // Product updates
    if (product.updatedAt && product.updatedAt !== product.createdAt) {
      events.push({
        id: "updated",
        type: "updated",
        title: "Ürün Güncellendi",
        description: "Ürün bilgileri son kez güncellendi",
        timestamp: product.updatedAt,
        icon: Edit,
        color: "bg-blue-500",
      });
    }

    // Platform sync events
    if (product.lastSyncedAt) {
      events.push({
        id: "synced",
        type: "synced",
        title: "Platform Senkronizasyonu",
        description: "Ürün platformlarla senkronize edildi",
        timestamp: product.lastSyncedAt,
        icon: Globe,
        color: "bg-purple-500",
      });
    }

    // Status changes
    if (product.status) {
      const statusInfo = getStatusInfo(product.status);
      events.push({
        id: "status-change",
        type: "status",
        title: "Durum Değişikliği",
        description: `Ürün durumu: ${statusInfo.label}`,
        timestamp: product.updatedAt || product.createdAt,
        icon: statusInfo.icon,
        color: statusInfo.color,
      });
    }

    // Stock events (if stock is low or out)
    if (product.stockQuantity !== undefined || product.stock !== undefined) {
      const stock = product.stockQuantity || product.stock || 0;
      if (stock === 0) {
        events.push({
          id: "out-of-stock",
          type: "stock",
          title: "Stok Tükendi",
          description: "Ürün stoku tükendi",
          timestamp: product.updatedAt || product.createdAt,
          icon: AlertCircle,
          color: "bg-red-500",
        });
      } else if (stock < 10) {
        events.push({
          id: "low-stock",
          type: "stock",
          title: "Düşük Stok Uyarısı",
          description: `Stok miktarı: ${stock} adet`,
          timestamp: product.updatedAt || product.createdAt,
          icon: AlertCircle,
          color: "bg-yellow-500",
        });
      }
    }

    // Platform data events
    if (product.platformData && product.platformData.length > 0) {
      product.platformData.forEach((platform, index) => {
        events.push({
          id: `platform-${index}`,
          type: "platform",
          title: "Platform Bağlantısı",
          description: `${platform.platformType} platformuna bağlandı`,
          timestamp: platform.createdAt || product.createdAt,
          icon: Globe,
          color: "bg-indigo-500",
        });
      });
    }

    // Sort events by timestamp (newest first)
    return events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case "active":
        return { label: "Aktif", icon: CheckCircle, color: "bg-green-500" };
      case "inactive":
        return { label: "Pasif", icon: AlertCircle, color: "bg-red-500" };
      case "draft":
        return { label: "Taslak", icon: Edit, color: "bg-yellow-500" };
      case "pending":
        return { label: "Beklemede", icon: Clock, color: "bg-blue-500" };
      default:
        return { label: status, icon: Package, color: "bg-gray-500" };
    }
  };

  const formatDateTime = (timestamp) => {
    return new Date(timestamp).toLocaleDateString("tr-TR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const timelineEvents = createTimelineEvents(product);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center mb-6">
        <Clock className="h-5 w-5 mr-2" />
        Ürün Zaman Çizelgesi
      </h3>

      {timelineEvents.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>Henüz zaman çizelgesi verisi bulunmuyor</p>
        </div>
      ) : (
        <div className="flow-root">
          <ul className="-mb-8">
            {timelineEvents.map((event, eventIdx) => (
              <li key={event.id}>
                <div className="relative pb-8">
                  {eventIdx !== timelineEvents.length - 1 ? (
                    <span
                      className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200 dark:bg-gray-600"
                      aria-hidden="true"
                    />
                  ) : null}
                  <div className="relative flex space-x-3">
                    <div>
                      <span
                        className={`${event.color} h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white dark:ring-gray-800`}
                      >
                        <event.icon
                          className="h-4 w-4 text-white"
                          aria-hidden="true"
                        />
                      </span>
                    </div>
                    <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {event.title}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {event.description}
                        </p>
                      </div>
                      <div className="whitespace-nowrap text-right text-sm text-gray-500 dark:text-gray-400">
                        <time dateTime={event.timestamp}>
                          {formatDateTime(event.timestamp)}
                        </time>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Summary Stats */}
      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {timelineEvents.length}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Toplam Olay
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {product?.platformData?.length || 0}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Platform Sayısı
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {product?.stockQuantity || product?.stock || 0}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Mevcut Stok
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {product?.status === "active" ? "Aktif" : "Pasif"}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Durum
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductTimeline;
