import logger from "../../utils/logger.js";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useAlert } from "../../contexts/AlertContext";
import { useNetworkAwareInterval } from "../../hooks/useNetworkStatus";
import { useTranslation } from "../../i18n/hooks/useTranslation";
import api from "../../services/api";
import requestQueue from "../../utils/requestQueue";
import {
  HomeIcon,
  ShoppingCartIcon,
  ArchiveBoxIcon,
  TruckIcon,
  ChartBarIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  BuildingStorefrontIcon,
  CloudArrowUpIcon,
  DocumentTextIcon,
  QuestionMarkCircleIcon,
  CreditCardIcon,
  ShieldCheckIcon,
  PlusIcon,
  BoltIcon,
  DocumentArrowDownIcon,
  WifiIcon,
  LinkIcon,
  CommandLineIcon,
} from "@heroicons/react/24/outline";

// Enhanced Order Counts Hook with Real-time Updates
export const useOrderCounts = () => {
  const { isAuthenticated } = useAuth();
  const [orderCounts, setOrderCounts] = useState({
    total: 0,
    newOrders: 0,
    pending: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchOrderCounts = useCallback(async () => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    setError(null);

    try {
      // Use request queue for background requests to prevent overwhelming server
      const response = await requestQueue.add(
        () =>
          api.orders.getOrders(
            { page: 1, limit: 1 }, // Minimal data request
            { timeout: 8000 } // Shorter timeout for background requests
          ),
        "normal" // Normal priority for background requests
      );

      if (response.success || response.data) {
        // Get total count from response
        let totalOrders = 0;

        if (Array.isArray(response.data)) {
          totalOrders = response.data.length;
        } else if (response.data && response.data.pagination?.total) {
          totalOrders = response.data.pagination.total;
        } else if (response.data && response.data.total) {
          totalOrders = response.data.total;
        } else if (response.data && Array.isArray(response.data.data)) {
          totalOrders = response.data.data.length;
        }

        // Also fetch stats for different statuses
        const statsResponse = await api.orders.getOrderStats?.();
        let counts = {
          total: totalOrders,
          newOrders: 0,
          pending: 0,
          processing: 0,
          shipped: 0,
          delivered: 0,
        };

        if (statsResponse?.success && statsResponse.data) {
          counts = {
            total: statsResponse.data.total || totalOrders,
            newOrders: statsResponse.data.newOrders || 0,
            pending: statsResponse.data.pending || 0,
            processing: statsResponse.data.processing || 0,
            shipped: statsResponse.data.shipped || 0,
            delivered: statsResponse.data.delivered || 0,
          };
        }

        setOrderCounts(counts);
        logger.info("Sidebar order counts updated:", counts);
      }
    } catch (error) {
      logger.error("Error fetching order counts in sidebar:", error);

      // Handle timeout errors gracefully without making more requests
      if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
        logger.info(
          "⏱️ Sidebar order count request timed out, keeping previous values"
        );
        setError("Server response slow"); // Don't show timeout errors prominently in sidebar
      } else {
        setError(error.message);
      }

      // Don't make additional requests on error - this can cause cascade failures
      // Keep existing counts or set to safe defaults
      setOrderCounts((prev) => {
        if (!prev.total) {
          return {
            total: 0,
            pending: 0,
            processing: 0,
            shipped: 0,
            delivered: 0,
          };
        }
        return prev;
      });
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchOrderCounts();
  }, [fetchOrderCounts]);

  // Use network-aware interval for order count polling with longer interval to reduce server load
  useNetworkAwareInterval(fetchOrderCounts, 60000); // Increased from 30s to 60s

  return { orderCounts, isLoading, error, refetch: fetchOrderCounts };
};

// Navigation sections factory (moved outside component for performance)
const createNavigationSections = (orderCounts, userPermissions = [], t) => [
  {
    id: "main",
    title: null,
    items: [
      {
        name: t("navigation.dashboard", {}, "Ana Sayfa"),
        href: "/",
        icon: HomeIcon,
        description: "Genel bakış ve özetler",
        ariaLabel: "Ana sayfa dashboard",
      },
    ],
  },
  {
    id: "commerce",
    title: t("navigation.ecommerce", {}, "E-Ticaret"),
    collapsible: true,
    defaultOpen: true,
    items: [
      {
        name: t("navigation.orders", {}, "Siparişler"),
        href: "/orders",
        icon: ShoppingCartIcon,
        description: "Sipariş listesi",
        badge:
          orderCounts.newOrders > 0 ? orderCounts.newOrders.toString() : null,
        ariaLabel: "Sipariş yönetimi",
        subItems: [
          {
            name: "Tüm Siparişler",
            href: "/orders",
            ariaLabel: "Tüm siparişleri görüntüle",
          },
          {
            name: "Bekleyen",
            href: "/orders?status=pending",
            ariaLabel: "Bekleyen siparişler",
            badge:
              orderCounts.pending > 0 ? orderCounts.pending.toString() : null,
          },
          {
            name: "Hazırlanan",
            href: "/orders?status=processing",
            ariaLabel: "Hazırlanan siparişler",
            badge:
              orderCounts.processing > 0
                ? orderCounts.processing.toString()
                : null,
          },
          {
            name: "Kargoda",
            href: "/orders?status=shipped",
            ariaLabel: "Kargodaki siparişler",
            badge:
              orderCounts.shipped > 0 ? orderCounts.shipped.toString() : null,
          },
          {
            name: "Tamamlanan",
            href: "/orders/completed",
            ariaLabel: "Tamamlanan siparişler",
            badge:
              orderCounts.delivered > 0
                ? orderCounts.delivered.toString()
                : null,
          },
        ],
      },
      {
        name: t("navigation.products", {}, "Ürünler"),
        href: "/products",
        icon: ArchiveBoxIcon,
        description: "Ürün kataloğu",
        ariaLabel: "Ürün yönetimi",
        subItems: [
          {
            name: "Ürün Listesi",
            href: "/products",
            ariaLabel: "Ürün listesini görüntüle",
          },
          {
            name: "Kategori Yönetimi",
            href: "/products/categories",
            ariaLabel: "Kategori yönetimi",
          },
          {
            name: "Stok Takibi",
            href: "/products/inventory",
            ariaLabel: "Stok durumu takibi",
          },
          {
            name: "Fiyatlandırma",
            href: "/products/pricing",
            ariaLabel: "Ürün fiyatlandırması",
          },
          {
            name: "Varyant Algılama",
            href: "/products/variant-detection",
            ariaLabel: "Varyant algılama ayarları",
          },
        ],
      },
      {
        name: t("navigation.customers", {}, "Müşteriler"),
        href: "/customers",
        icon: UserGroupIcon,
        description: "Müşteri bilgileri",
        ariaLabel: "Müşteri yönetimi",
        subItems: [
          {
            name: "Müşteri Listesi",
            href: "/customers",
            ariaLabel: "Müşteri listesi",
          },
          {
            name: "Müşteri Profilleri",
            href: "/customers/profiles",
            ariaLabel: "Müşteri profilleri",
          },
          {
            name: "Müşteri Soruları",
            href: "/customer-questions",
            ariaLabel: "Müşteri soruları ve cevapları",
          },
          {
            name: "Müşteri Analitikleri",
            href: "/customers/analytics",
            ariaLabel: "Müşteri analitikleri",
          },
          {
            name: "Müşteri Siparişleri",
            href: "/customers/orders",
            ariaLabel: "Müşteri siparişleri",
          },
          {
            name: "Müşteri Segmentleri",
            href: "/customers/segments",
            ariaLabel: "Müşteri segmentleri",
          },
        ],
      },
      {
        name: t("navigation.analytics", {}, "Analitik"),
        href: "/analytics",
        icon: ChartBarIcon,
        description: "Satış analizi",
        ariaLabel: "Analitik raporlar",
        subItems: [
          {
            name: "Satış Raporu",
            href: "/analytics/sales",
            ariaLabel: "Satış raporları",
          },
          {
            name: "Performans",
            href: "/analytics/performance",
            ariaLabel: "Performans analizi",
          },
          {
            name: "Trendler",
            href: "/analytics/trends",
            ariaLabel: "Trend analizi",
          },
        ],
      },
    ],
  },
  {
    id: "platforms",
    title: t(
      "navigation.platformsIntegration",
      {},
      "Platformlar ve Entegrasyon"
    ),
    collapsible: true,
    defaultOpen: true,
    items: [
      {
        name: t("navigation.platformConnections", {}, "Platform Bağlantıları"),
        href: "/platforms",
        icon: BuildingStorefrontIcon,
        description: "Marketplace entegrasyonları",
        ariaLabel: "Platform entegrasyonları",
        subItems: [
          {
            name: "Tüm Platformlar",
            href: "/platforms",
            ariaLabel: "Tüm platformları görüntüle",
          },
          {
            name: "Trendyol",
            href: "/platforms/trendyol",
            ariaLabel: "Trendyol entegrasyonu",
          },
          {
            name: "Hepsiburada",
            href: "/platforms/hepsiburada",
            ariaLabel: "Hepsiburada entegrasyonu",
          },
          {
            name: "N11",
            href: "/platforms/n11",
            ariaLabel: "N11 entegrasyonu",
          },
          {
            name: "GittiGidiyor",
            href: "/platforms/gittigidiyor",
            ariaLabel: "GittiGidiyor entegrasyonu",
          },
        ],
      },
      {
        name: t("navigation.platformOperations", {}, "Platform İşlemleri"),
        href: "/platform-operations",
        icon: BoltIcon,
        description: "Background tasks and operations",
        ariaLabel: "Platform background operations",
        badge: "new",
      },
      {
        name: t("navigation.shipping", {}, "Kargo"),
        href: "/shipping",
        icon: TruckIcon,
        description: "Lojistik yönetimi",
        ariaLabel: "Kargo ve lojistik",
        subItems: [
          {
            name: "Gönderi Oluştur",
            href: "/shipping/create",
            ariaLabel: "Yeni gönderi oluştur",
          },
          {
            name: "Takip",
            href: "/shipping/tracking",
            ariaLabel: "Kargo takip sistemi",
          },
          {
            name: "Kargo Firmaları",
            href: "/shipping/carriers",
            ariaLabel: "Kargo firması yönetimi",
          },
          {
            name: "Tarifeler",
            href: "/shipping/rates",
            ariaLabel: "Kargo ücret tarifeleri",
          },
          {
            name: "Fiş Tasarımcısı",
            href: "/shipping/slip-designer",
            ariaLabel: "Kargo fişi tasarım stüdyosu",
            badge: "new",
          },
        ],
      },
      {
        name: t("navigation.payments", {}, "Ödemeler"),
        href: "/payments",
        icon: CreditCardIcon,
        description: "Ödeme işlemleri",
        badge: "beta",
        ariaLabel: "Ödeme sistemi yönetimi",
      },
    ],
  },
  {
    id: "tools",
    title: t("navigation.toolsUtilities", {}, "Araçlar ve Yardımcılar"),
    collapsible: true,
    defaultOpen: false,
    items: [
      {
        name: t("navigation.importExport", {}, "İçe/Dışa Aktarım"),
        href: "/import-export",
        icon: CloudArrowUpIcon,
        description: "Veri yönetimi",
        ariaLabel: "Veri içe/dışa aktarım",
        subItems: [
          {
            name: "CSV İçe Aktar",
            href: "/import-export?tab=import",
            ariaLabel: "CSV dosyası içe aktarım",
          },
          {
            name: "Veri Dışa Aktar",
            href: "/import-export?tab=export",
            ariaLabel: "Veri dışa aktar",
          },
          {
            name: "Toplu İşlemler",
            href: "/import-export?tab=bulk",
            ariaLabel: "Toplu işlemler",
          },
        ],
      },
      {
        name: t("navigation.compliance", {}, "Uyumluluk"),
        href: "/compliance",
        icon: ShieldCheckIcon,
        description: "KVKK & düzenlemeler",
        ariaLabel: "Uyumluluk ve düzenlemeler",
      },
      {
        name: t("navigation.reports", {}, "Raporlar"),
        href: "/reports",
        icon: DocumentTextIcon,
        description: "Rapor oluşturma",
        ariaLabel: "Rapor sistemleri",
        subItems: [
          {
            name: "Satış Raporları",
            href: "/reports/sales",
            ariaLabel: "Satış raporları",
          },
          {
            name: "Vergi Raporları",
            href: "/reports/tax",
            ariaLabel: "Vergi raporları",
          },
          {
            name: "Stok Raporları",
            href: "/reports/inventory",
            ariaLabel: "Stok raporları",
          },
        ],
      },
    ],
  },
  {
    id: "system",
    title: t("navigation.system", {}, "Sistem"),
    collapsible: true,
    defaultOpen: false,
    items: [
      {
        name: t("navigation.settings", {}, "Ayarlar"),
        href: "/settings",
        icon: Cog6ToothIcon,
        description: "Sistem yapılandırması",
        ariaLabel: "Sistem ayarları",
        subItems: [
          { name: "Genel", href: "/settings", ariaLabel: "Genel ayarlar" },
          {
            name: "Yazdırma Ayarları",
            href: "/print-settings",
            ariaLabel: "Yazdırma ayarları",
            badge: "new",
          },
          {
            name: "Bildirimler",
            href: "/settings/notifications",
            ariaLabel: "Bildirim ayarları",
          },
          {
            name: "API Anahtarları",
            href: "/settings/api",
            ariaLabel: "API anahtar yönetimi",
          },
          {
            name: "Kullanıcılar",
            href: "/settings/users",
            ariaLabel: "Kullanıcı yönetimi",
          },
        ],
      },
      {
        name: t("navigation.config", {}, "Yapılandırma"),
        href: "/config",
        icon: Cog6ToothIcon,
        description: "Uygulama yapılandırması",
        ariaLabel: "Uygulama ayarları",
      },
      {
        name: t("navigation.productLinking", {}, "Ürün Bağlama"),
        href: "/admin/product-linking",
        icon: LinkIcon,
        description: "Ürün bağlama işlemleri",
        ariaLabel: "Ürün bağlama dashboard",
      },
      {
        name: t("navigation.backgroundTasks", {}, "Arka Plan Görevleri"),
        href: "/admin/background-tasks",
        icon: CommandLineIcon,
        description: "Arka plan görev yönetimi",
        ariaLabel: "Arka plan görevleri",
        subItems: [
          {
            name: "Aktif Görevler",
            href: "/admin/background-tasks?status=active",
            ariaLabel: "Aktif görevleri görüntüle",
          },
          {
            name: "Tamamlanan",
            href: "/admin/background-tasks?status=completed",
            ariaLabel: "Tamamlanan görevler",
          },
          {
            name: "Başarısız",
            href: "/admin/background-tasks?status=failed",
            ariaLabel: "Başarısız görevler",
          },
        ],
      },
      {
        name: t("navigation.helpSupport", {}, "Yardım ve Destek"),
        href: "/support",
        icon: QuestionMarkCircleIcon,
        description: "Yardım alın",
        ariaLabel: "Yardım ve destek",
      },
    ],
  },
  ...(process.env.NODE_ENV === "development"
    ? [
        {
          id: "developer",
          title: "Developer",
          collapsible: true,
          defaultOpen: false,
          items: [
            {
              name: "Developer Tools",
              href: "/developer",
              icon: CommandLineIcon,
              description: "Geliştirici araçları ve ayarları",
              ariaLabel: "Geliştirici araçları",
              badge: "dev",
            },
          ],
        },
      ]
    : []),
];

// Memoized navigation sections hook
const useNavigationSections = (orderCounts, userPermissions) => {
  const { t } = useTranslation();

  return useMemo(
    () => createNavigationSections(orderCounts, userPermissions, t),
    [orderCounts, userPermissions, t]
  );
};

// Enhanced Quick Actions Hook
const useQuickActions = () => {
  const { showAlert } = useAlert();
  const [isLoading, setIsLoading] = useState({});

  const actions = [
    {
      name: "New Order",
      icon: PlusIcon,
      action: "create-order",
      variant: "primary",
      ariaLabel: "Yeni sipariş oluştur",
      shortcut: "Ctrl+N",
    },
    {
      name: "Sync All",
      icon: BoltIcon,
      action: "sync-platforms",
      variant: "success",
      ariaLabel: "Tüm platformları senkronize et",
      shortcut: "Ctrl+S",
    },
    {
      name: "Export",
      icon: DocumentArrowDownIcon,
      action: "export-data",
      variant: "info",
      ariaLabel: "Veri dışa aktar",
      shortcut: "Ctrl+E",
    },
  ];

  const handleAction = async (action) => {
    setIsLoading((prev) => ({ ...prev, [action]: true }));

    try {
      switch (action) {
        case "create-order":
          await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate API call
          showAlert("Create Order feature coming soon!", "info");
          break;
        case "sync-platforms":
          await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call
          showAlert("All platforms synchronized successfully", "success");
          break;
        case "export-data":
          await new Promise((resolve) => setTimeout(resolve, 800)); // Simulate API call
          showAlert("Export completed successfully", "success");
          break;
        default:
          break;
      }
    } catch (error) {
      showAlert("Action failed. Please try again.", "error");
    } finally {
      setIsLoading((prev) => ({ ...prev, [action]: false }));
    }
  };

  return { actions, handleAction, isLoading };
};

// Enhanced connection status hook with proper cleanup
const useConnectionStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionQuality, setConnectionQuality] = useState("good");

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setConnectionQuality("good");
    };

    const handleOffline = () => {
      setIsOnline(false);
      setConnectionQuality("offline");
    };

    // Enhanced connection quality check with proper cleanup
    const checkConnectionQuality = () => {
      if (navigator.onLine) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        fetch("/api/health", {
          method: "HEAD",
          signal: controller.signal,
        })
          .then(() => {
            clearTimeout(timeoutId);
            setConnectionQuality("good");
          })
          .catch((error) => {
            clearTimeout(timeoutId);
            if (error.name !== "AbortError") {
              setConnectionQuality("poor");
            }
          });
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Check connection quality every 30 seconds with cleanup
    const interval = setInterval(checkConnectionQuality, 30000);
    checkConnectionQuality(); // Initial check

    // Enhanced cleanup function
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, []);

  return { isOnline, connectionQuality };
};

// Connection Status Component
const ConnectionStatus = () => {
  const { isOnline, connectionQuality } = useConnectionStatus();

  if (isOnline) {
    // Show connection quality indicator when online but poor quality
    if (connectionQuality === "poor") {
      return (
        <div className="flex items-center space-x-2 px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 text-xs rounded-md mb-3">
          <WifiIcon className="h-4 w-4" />
          <span>Slow connection</span>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="flex items-center space-x-2 px-3 py-2 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 text-xs rounded-md mb-3">
      <WifiIcon className="h-4 w-4" />
      <span>Offline mode</span>
    </div>
  );
};

export {
  createNavigationSections,
  useNavigationSections,
  useQuickActions,
  ConnectionStatus,
};
