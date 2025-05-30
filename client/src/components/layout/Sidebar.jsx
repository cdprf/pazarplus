/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../contexts/ThemeContext";
import { useAlert } from "../../contexts/AlertContext";
import { cn } from "../../utils/cn";
import { Button, Badge } from "../ui";
import api from "../../services/api";
import {
  HomeIcon,
  ShoppingCartIcon,
  CubeIcon,
  TruckIcon,
  DocumentArrowDownIcon,
  DocumentArrowUpIcon,
  CogIcon,
  ChartBarIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  BuildingStorefrontIcon,
  CloudArrowUpIcon,
  DocumentTextIcon,
  QuestionMarkCircleIcon,
  BellIcon,
  UserIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  XMarkIcon,
  ArrowRightOnRectangleIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  BoltIcon,
  ShieldCheckIcon,
  CreditCardIcon,
  ArchiveBoxIcon,
  TagIcon,
  WifiIcon,
  SunIcon,
  MoonIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [orderCounts, setOrderCounts] = useState({
    total: 0,
    pending: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
  });

  // Fetch order counts for navigation badges
  useEffect(() => {
    const fetchOrderCounts = async () => {
      if (!isAuthenticated) return;

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
          console.error(
            "Alternative order count fetch failed in sidebar:",
            err
          );
        }
      }
    };

    fetchOrderCounts();

    // Refresh counts every 30 seconds
    const interval = setInterval(fetchOrderCounts, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Handle navigation with mobile sidebar close
  const handleNavigation = () => {
    // Close mobile sidebar when navigating
    if (onClose) {
      onClose();
    }
  };

  // Handle logout with confirmation
  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // Enhanced navigation structure with categories and subcategories
  const navigationSections = [
    {
      id: "main",
      title: null,
      items: [
        {
          name: "Dashboard",
          href: "/",
          icon: HomeIcon,
          description: "Genel bakış ve özetler",
          badge: null,
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
              ariaLabel: "Veri dışa aktarım",
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
          name: "Help & Support",
          href: "/support",
          icon: QuestionMarkCircleIcon,
          description: "Yardım alın",
          ariaLabel: "Yardım ve destek",
        },
      ],
    },
  ];

  // Enhanced quick action buttons with better accessibility
  const quickActions = [
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

  // Enhanced skeleton loader component for better loading states
  const SidebarSkeleton = () => (
    <div className="space-y-4 animate-pulse">
      {[...Array(3)].map((_, sectionIndex) => (
        <div key={sectionIndex} className="space-y-2">
          <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-24"></div>
          {[...Array(4)].map((_, itemIndex) => (
            <div key={itemIndex} className="flex items-center space-x-3 p-3">
              <div className="h-5 w-5 bg-gray-300 dark:bg-gray-600 rounded"></div>
              <div className="flex-1 space-y-1">
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );

  // Enhanced error boundary for sidebar sections
  const SidebarErrorBoundary = ({ children, fallback }) => {
    const [hasError, setHasError] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
      const handleError = (error) => {
        setHasError(true);
        setError(error);
      };

      window.addEventListener("error", handleError);
      return () => window.removeEventListener("error", handleError);
    }, []);

    if (hasError) {
      return (
        <div className="p-4 text-center">
          <ExclamationTriangleIcon className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {fallback || "Navigation section failed to load"}
          </p>
          <button
            onClick={() => setHasError(false)}
            className="mt-2 text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400"
          >
            Try again
          </button>
        </div>
      );
    }

    return children;
  };

  // Enhanced connection status indicator
  const ConnectionStatus = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }, []);

    if (!isOnline) {
      return (
        <div className="flex items-center space-x-2 px-3 py-2 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 text-xs rounded-md mb-3">
          <WifiIcon className="h-4 w-4" />
          <span>Offline mode</span>
        </div>
      );
    }

    return null;
  };

  const SidebarLink = ({ item, isActive, level = 0, onNavigate }) => {
    const [showSubItems, setShowSubItems] = useState(isActive);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const hasSubItems = item.subItems && item.subItems.length > 0;
    const location = useLocation();

    const handleClick = async () => {
      try {
        setError(null);

        if (hasSubItems) {
          setShowSubItems(!showSubItems);
        } else {
          setIsLoading(true);
          // Simulate navigation loading with error handling
          await new Promise((resolve, reject) => {
            setTimeout(() => {
              // Simulate occasional errors for demo
              if (Math.random() > 0.95) {
                reject(new Error("Navigation failed"));
              } else {
                resolve();
              }
            }, 200);
          });
        }

        if (onNavigate) {
          onNavigate();
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <div className="space-y-1">
        <Link
          to={item.href}
          onClick={
            hasSubItems
              ? (e) => {
                  e.preventDefault();
                  handleClick();
                }
              : () => handleClick()
          }
          className={cn(
            // Base classes following design system
            "nav-item group relative block px-3 py-2.5 rounded-lg text-sm font-medium",
            "transition-all duration-200 ease-in-out transform",

            // Enhanced hover effects from design system
            "hover:shadow-lg hover:-translate-y-0.5 hover:scale-[1.02]",
            "hover:bg-gradient-to-r hover:from-gray-50 hover:to-white",
            "dark:hover:from-gray-800/50 dark:hover:to-gray-700/30",

            // Enhanced focus states from design system
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2",
            "focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900",

            // Active states
            isActive && !hasSubItems
              ? "nav-item-active bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 shadow-md border-l-4 border-primary-500"
              : hasSubItems && showSubItems
              ? "bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-gray-100"
              : "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100",

            // Error state
            error && "ring-2 ring-red-500 ring-opacity-50",

            // Loading state
            isLoading && "opacity-70 cursor-wait"
          )}
          aria-label={item.ariaLabel}
          aria-expanded={hasSubItems ? showSubItems : undefined}
          aria-current={isActive && !hasSubItems ? "page" : undefined}
          aria-describedby={error ? `${item.name}-error` : undefined}
        >
          <div className="flex items-center relative">
            {/* Enhanced loading state with skeleton */}
            {isLoading ? (
              <div className="mr-3 animate-pulse">
                <div className="w-5 h-5 bg-gray-300 dark:bg-gray-600 rounded"></div>
              </div>
            ) : (
              <item.icon
                className={cn(
                  "mr-3 h-5 w-5 transition-all duration-200",
                  "group-hover:scale-110 group-hover:text-primary-600 dark:group-hover:text-primary-400",
                  isActive && "text-primary-600 dark:text-primary-400"
                )}
              />
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "truncate font-medium",
                    isActive && "font-semibold"
                  )}
                >
                  {item.name}
                </span>

                {/* Enhanced badges following design system */}
                {item.badge && (
                  <Badge
                    variant={
                      item.badge === "new"
                        ? "success"
                        : item.badge === "beta"
                        ? "warning"
                        : "info"
                    }
                    size="sm"
                    className={cn(
                      "ml-2 animate-fade-in shadow-sm",
                      "transition-all duration-200 group-hover:scale-105",
                      item.badge === "new" &&
                        "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
                      item.badge === "beta" &&
                        "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
                      item.badge !== "new" &&
                        item.badge !== "beta" &&
                        "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                    )}
                  >
                    {item.badge}
                  </Badge>
                )}
              </div>

              {/* Enhanced description */}
              {item.description && level === 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 opacity-80 group-hover:opacity-100 transition-opacity duration-200 truncate">
                  {item.description}
                </p>
              )}
            </div>

            {/* Enhanced chevron for expandable items */}
            {hasSubItems && (
              <ChevronDownIcon
                className={cn(
                  "ml-2 h-4 w-4 transition-all duration-300 ease-in-out",
                  "group-hover:text-primary-600 dark:group-hover:text-primary-400",
                  showSubItems &&
                    "rotate-180 text-primary-600 dark:text-primary-400"
                )}
              />
            )}
          </div>

          {/* Enhanced ripple effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-lg" />

          {/* Error indicator */}
          {error && (
            <div className="absolute -top-1 -right-1">
              <ExclamationCircleIcon className="h-3 w-3 text-red-500" />
            </div>
          )}
        </Link>

        {/* Error message */}
        {error && (
          <div
            id={`${item.name}-error`}
            className="px-3 py-1 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded"
          >
            {error}
          </div>
        )}

        {/* Enhanced sub-items with staggered animations */}
        {hasSubItems && (
          <div
            className={cn(
              "overflow-hidden transition-all duration-300 ease-in-out",
              showSubItems
                ? "max-h-96 opacity-100 transform translate-y-0"
                : "max-h-0 opacity-0 transform -translate-y-2"
            )}
            aria-hidden={!showSubItems}
          >
            <div className="ml-8 mt-2 space-y-1">
              {item.subItems.map((subItem, index) => (
                <Link
                  key={subItem.name}
                  to={subItem.href}
                  onClick={onNavigate}
                  className={cn(
                    "block px-3 py-2 text-sm rounded-md transition-all duration-200",
                    "hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:translate-x-1",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500",
                    "focus-visible:ring-offset-1 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900",
                    location.pathname === subItem.href
                      ? "bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 border-l-2 border-primary-500 font-medium"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                  )}
                  aria-label={subItem.ariaLabel}
                  aria-current={
                    location.pathname === subItem.href ? "page" : undefined
                  }
                  style={{
                    animationDelay: `${index * 50}ms`,
                    animation: showSubItems
                      ? "fadeInUp 0.3s ease-out forwards"
                      : "none",
                  }}
                >
                  <div className="flex items-center">
                    <div className="w-1.5 h-1.5 bg-current rounded-full mr-3 opacity-60"></div>
                    <span>{subItem.name}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const SidebarSection = ({ section, location, onNavigate }) => {
    const [isCollapsed, setIsCollapsed] = useState(!section.defaultOpen);

    const toggleSection = () => {
      if (section.collapsible) {
        setIsCollapsed(!isCollapsed);
      }
    };

    return (
      <div className="sidebar-section">
        {section.title && (
          <button
            onClick={toggleSection}
            className={cn(
              "sidebar-section-header w-full text-left transition-all duration-200 px-2 py-1 rounded-lg",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1",
              "focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900",
              section.collapsible
                ? "sidebar-section-header-collapsible hover:text-primary-600 dark:hover:text-primary-400 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                : "sidebar-section-header-static cursor-default"
            )}
            aria-expanded={section.collapsible ? !isCollapsed : undefined}
            aria-label={
              section.collapsible
                ? `${section.title} bölümünü ${isCollapsed ? "aç" : "kapat"}`
                : section.title
            }
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {section.title}
              </span>
              {section.collapsible && (
                <ChevronRightIcon
                  className={cn(
                    "sidebar-section-chevron w-3 h-3 transition-transform duration-300 ease-in-out",
                    !isCollapsed && "rotate-90"
                  )}
                />
              )}
            </div>
          </button>
        )}

        {(!section.collapsible || !isCollapsed) && (
          <div
            className={cn(
              "sidebar-section-items transition-all duration-300 ease-in-out",
              section.title ? "mt-3" : "",
              isCollapsed
                ? "opacity-0 max-h-0 overflow-hidden"
                : "opacity-100 max-h-none animate-fade-in"
            )}
            aria-hidden={section.collapsible && isCollapsed}
          >
            <div className="space-y-1">
              {section.items.map((item, index) => (
                <div
                  key={item.name}
                  className="animate-slide-in-left"
                  style={{ animationDelay: `${index * 75}ms` }}
                >
                  <SidebarLink
                    item={item}
                    isActive={
                      location.pathname === item.href ||
                      location.pathname.startsWith(item.href + "/") ||
                      (item.subItems &&
                        item.subItems.some(
                          (sub) => location.pathname === sub.href
                        ))
                    }
                    onNavigate={onNavigate}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const QuickActionsPanel = ({ onAction }) => {
    const { showAlert } = useAlert();
    const [isLoading, setIsLoading] = useState({});

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

      if (onAction) onAction(action);
    };

    return (
      <div className="quick-actions">
        <h4 className="quick-actions-header">Quick Actions</h4>
        <div className="quick-actions-grid">
          {quickActions.map((action) => {
            const Icon = action.icon;
            const loading = isLoading[action.action];

            return (
              <Button
                key={action.name}
                variant="ghost"
                size="sm"
                onClick={() => handleAction(action.action)}
                className="quick-action-btn"
                disabled={loading}
                aria-label={`${action.ariaLabel}${
                  action.shortcut ? ` (${action.shortcut})` : ""
                }`}
                title={
                  action.shortcut ? `Shortcut: ${action.shortcut}` : undefined
                }
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-primary-500 rounded-full animate-spin mr-2" />
                ) : (
                  <Icon className="w-4 h-4 mr-2" />
                )}
                <span className="text-sm">{action.name}</span>
                {action.shortcut && (
                  <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">
                    {action.shortcut}
                  </span>
                )}
              </Button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && <div className="sidebar-backdrop" onClick={onClose} />}

      {/* Sidebar Container */}
      <div
        className={cn(
          "sidebar-container",
          isOpen ? "sidebar-container-open" : "sidebar-container-closed"
        )}
      >
        <div className="sidebar">
          {/* Header */}
          <div className="sidebar-header">
            <div className="flex items-center space-x-2">
              <span className="sidebar-title">Navigation</span>
            </div>
            <button onClick={onClose} className="sidebar-close-btn">
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>

          {/* Navigation - Scrollable content */}
          <nav className="sidebar-nav">
            <div className="sidebar-sections">
              {navigationSections.map((section) => (
                <SidebarSection
                  key={section.id}
                  section={section}
                  location={location}
                  onNavigate={handleNavigation}
                />
              ))}
            </div>
          </nav>

          {/* Footer */}
          <div className="sidebar-footer">
            {/* Quick Actions */}
            <QuickActionsPanel />

            {/* User Profile */}
            <div className="user-profile">
              <div className="user-info">
                <div className="user-avatar">
                  <span className="user-avatar-text">
                    {user?.email?.charAt(0).toUpperCase() || "U"}
                  </span>
                </div>
                <div className="user-details">
                  <p className="user-name">{user?.email || "User"}</p>
                  <p className="user-role">Administrator</p>
                </div>
              </div>

              <div className="user-actions">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleTheme}
                  className="user-action-btn"
                  icon={theme === "dark" ? SunIcon : MoonIcon}
                >
                  Theme
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="user-action-btn"
                  icon={ArrowRightOnRectangleIcon}
                >
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
