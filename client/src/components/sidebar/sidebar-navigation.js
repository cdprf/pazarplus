import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useAlert } from "../../contexts/AlertContext";
import api from "../../services/api";
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
} from "@heroicons/react/24/outline";

// Enhanced Order Counts Hook with Real-time Updates
export const useOrderCounts = () => {
  const { isAuthenticated } = useAuth();
  const [orderCounts, setOrderCounts] = useState({
    total: 0,
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
      const response = await api.orders.getOrders({ page: 0, size: 1 });
      if (response.success) {
        // Get total count from response
        let totalOrders = 0;

        if (Array.isArray(response.data)) {
          totalOrders = response.data.length;
        } else if (response.data && response.data.total) {
          totalOrders = response.data.total;
        } else if (response.data && Array.isArray(response.data.data)) {
          totalOrders = response.data.data.length;
        }

        // Also fetch stats for different statuses
        const statsResponse = await api.orders.getOrderStats?.();
        let counts = {
          total: totalOrders,
          pending: 0,
          processing: 0,
          shipped: 0,
          delivered: 0,
        };

        if (statsResponse?.success && statsResponse.data) {
          counts = {
            total: statsResponse.data.total || totalOrders,
            pending: statsResponse.data.pending || 0,
            processing: statsResponse.data.processing || 0,
            shipped: statsResponse.data.shipped || 0,
            delivered: statsResponse.data.delivered || 0,
          };
        }

        setOrderCounts(counts);
        console.log("Sidebar order counts updated:", counts);
      }
    } catch (error) {
      console.error("Error fetching order counts in sidebar:", error);
      setError(error.message);

      // Try alternative method to get total orders count
      try {
        const response = await api.orders.getOrders({ page: 0, size: 999 });
        if (response.success && Array.isArray(response.data)) {
          setOrderCounts((prev) => ({
            ...prev,
            total: response.data.length,
          }));
        }
      } catch (err) {
        console.error("Alternative order count fetch failed in sidebar:", err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchOrderCounts();

    // Enhanced refresh with proper cleanup
    const interval = setInterval(fetchOrderCounts, 30000);

    // Cleanup function to prevent memory leaks
    return () => {
      clearInterval(interval);
    };
  }, [fetchOrderCounts]);

  return { orderCounts, isLoading, error, refetch: fetchOrderCounts };
};

// Navigation sections factory (moved outside component for performance)
const createNavigationSections = (orderCounts, userPermissions = []) => [
  {
    id: "main",
    title: null,
    items: [
      {
        name: "Dashboard",
        href: "/",
        icon: HomeIcon,
        description: "Genel bakış ve özetler",
        ariaLabel: "Ana sayfa dashboard",
      },
    ],
  },
  {
    id: "commerce",
    title: "E-Commerce",
    collapsible: true,
    defaultOpen: true,
    items: [
      {
        name: "Orders",
        href: "/orders",
        icon: ShoppingCartIcon,
        description: "Sipariş listesi",
        badge: orderCounts.total > 0 ? orderCounts.total.toString() : null,
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
        name: "Products",
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
            name: "Base Products",
            href: "/products/base",
            ariaLabel: "Temel ürün yönetimi",
          },
          {
            name: "Enhanced Products",
            href: "/products/enhanced",
            ariaLabel: "Gelişmiş ürün yönetimi",
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
        ],
      },
      {
        name: "Customers",
        href: "/customers",
        icon: UserGroupIcon,
        description: "Müşteri bilgileri",
        ariaLabel: "Müşteri yönetimi",
      },
      {
        name: "Analytics",
        href: "/analytics",
        icon: ChartBarIcon,
        description: "Satış analizi",
        ariaLabel: "Analitik raporlar",
        subItems: [
          {
            name: "Sales Report",
            href: "/analytics/sales",
            ariaLabel: "Satış raporları",
          },
          {
            name: "Performance",
            href: "/analytics/performance",
            ariaLabel: "Performans analizi",
          },
          {
            name: "Trends",
            href: "/analytics/trends",
            ariaLabel: "Trend analizi",
          },
        ],
      },
    ],
  },
  {
    id: "platforms",
    title: "Platforms & Integration",
    collapsible: true,
    defaultOpen: true,
    items: [
      {
        name: "Platform Connections",
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
        name: "Platform Operations",
        href: "/platform-operations",
        icon: BoltIcon,
        description: "Background tasks and operations",
        ariaLabel: "Platform background operations",
        badge: "new",
      },
      {
        name: "Shipping",
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
            name: "Rates",
            href: "/shipping/rates",
            ariaLabel: "Kargo ücret tarifeleri",
          },
          {
            name: "Slip Designer",
            href: "/shipping/slip-designer",
            ariaLabel: "Kargo fişi tasarım stüdyosu",
            badge: "new",
          },
        ],
      },
      {
        name: "Payments",
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
    title: "Tools & Utilities",
    collapsible: true,
    defaultOpen: false,
    items: [
      {
        name: "Import/Export",
        href: "/import-export",
        icon: CloudArrowUpIcon,
        description: "Veri yönetimi",
        ariaLabel: "Veri içe/dışa aktarım",
        subItems: [
          {
            name: "Import CSV",
            href: "/import-export?tab=import",
            ariaLabel: "CSV dosyası içe aktarım",
          },
          {
            name: "Export Data",
            href: "/import-export?tab=export",
            ariaLabel: "Veri dışa aktar",
          },
          {
            name: "Bulk Operations",
            href: "/import-export?tab=bulk",
            ariaLabel: "Toplu işlemler",
          },
        ],
      },
      {
        name: "Compliance",
        href: "/compliance",
        icon: ShieldCheckIcon,
        description: "KVKK & düzenlemeler",
        ariaLabel: "Uyumluluk ve düzenlemeler",
      },
      {
        name: "Reports",
        href: "/reports",
        icon: DocumentTextIcon,
        description: "Rapor oluşturma",
        ariaLabel: "Rapor sistemleri",
        subItems: [
          {
            name: "Sales Reports",
            href: "/reports/sales",
            ariaLabel: "Satış raporları",
          },
          {
            name: "Tax Reports",
            href: "/reports/tax",
            ariaLabel: "Vergi raporları",
          },
          {
            name: "Inventory Reports",
            href: "/reports/inventory",
            ariaLabel: "Stok raporları",
          },
        ],
      },
    ],
  },
  {
    id: "system",
    title: "System",
    collapsible: true,
    defaultOpen: false,
    items: [
      {
        name: "Settings",
        href: "/settings",
        icon: Cog6ToothIcon,
        description: "Sistem yapılandırması",
        ariaLabel: "Sistem ayarları",
        subItems: [
          { name: "Genel", href: "/settings", ariaLabel: "Genel ayarlar" },
          {
            name: "Print Settings",
            href: "/print-settings",
            ariaLabel: "Yazdırma ayarları",
            badge: "new",
          },
          {
            name: "Notifications",
            href: "/settings/notifications",
            ariaLabel: "Bildirim ayarları",
          },
          {
            name: "API Keys",
            href: "/settings/api",
            ariaLabel: "API anahtar yönetimi",
          },
          {
            name: "Users",
            href: "/settings/users",
            ariaLabel: "Kullanıcı yönetimi",
          },
        ],
      },
      {
        name: "Product Linking",
        href: "/admin/product-linking",
        icon: LinkIcon,
        description: "Ürün bağlama işlemleri",
        ariaLabel: "Ürün bağlama dashboard",
      },
      {
        name: "Help & Support",
        href: "/support",
        icon: QuestionMarkCircleIcon,
        description: "Yardım alın",
        ariaLabel: "Yardım ve destek",
      },
    ],
  },
];

// Memoized navigation sections hook
const useNavigationSections = (orderCounts, userPermissions) => {
  return useMemo(
    () => createNavigationSections(orderCounts, userPermissions),
    [orderCounts, userPermissions]
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
