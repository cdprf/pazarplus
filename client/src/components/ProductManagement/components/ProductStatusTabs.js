import React from "react";
import {
  Package,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Info,
  Edit,
  XCircle,
} from "lucide-react";
import { Tooltip } from "../../ui";

const ProductStatusTabs = ({
  activeTab = "all",
  onTabChange,
  tabs = [],
  counts = {
    all: 0,
    active: 0,
    pending: 0,
    inactive: 0,
    outOfStock: 0,
    draft: 0,
    rejected: 0,
    lowStock: 0,
  },
  compact = false, // New prop for compact layout
  noWrap = false, // New prop for no-wrap horizontal scroll
}) => {
  // Use dynamic tabs if provided, otherwise fallback to default tabs
  const tabsToRender =
    tabs.length > 0
      ? tabs
      : [
          // Core Status
          {
            key: "all",
            label: "Tümü",
            count: counts.all,
            description:
              "Arşivlenmemiş ve onaylı tüm ürünlerinize ulaşabilirsiniz.",
            icon: <Package className="h-4 w-4" />,
          },
          {
            key: "active",
            label: "Aktif",
            count: counts.active,
            description: "Satıştaki ürünlerinizi gösterir.",
            icon: <CheckCircle className="h-4 w-4 text-green-500" />,
          },
          {
            key: "inactive",
            label: "Pasif",
            count: counts.inactive,
            description: "Tükenen, kilitli ve arşiv ürünlerinizi gösterir.",
            icon: <AlertCircle className="h-4 w-4 text-red-500" />,
          },
          {
            key: "draft",
            label: "Taslak",
            count: counts.draft,
            description: "Henüz tamamlanmamış taslak ürünlerinizi gösterir.",
            icon: <Edit className="h-4 w-4 text-gray-500" />,
          },

          // Approval Status
          {
            key: "pending",
            label: "Bekliyor",
            count: counts.pending,
            description:
              "Onay bekleyen ve revize gereken ürünlerinizi gösterir.",
            icon: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
          },
          {
            key: "rejected",
            label: "Red",
            count: counts.rejected,
            description:
              "Platform tarafından reddedilen ürünlerinizi gösterir.",
            icon: <XCircle className="h-4 w-4 text-red-600" />,
          },

          // Stock Status
          {
            key: "out_of_stock",
            label: "Stoksuz",
            count: counts.outOfStock,
            description: "Stokta bulunmayan ürünlerinizi gösterir.",
            icon: <Package className="h-4 w-4 text-red-500" />,
          },
          {
            key: "low_stock",
            label: "Az Stok",
            count: counts.lowStock,
            description: "Stok seviyesi düşük olan ürünlerinizi gösterir.",
            icon: <AlertTriangle className="h-4 w-4 text-orange-500" />,
          },
        ];

  return (
    <div
      className={`${compact ? "border-b-0" : "border-b border-gray-200"} ${
        compact ? "py-1" : ""
      }`}
    >
      <div className={noWrap ? "overflow-x-auto scrollbar-hide" : ""}>
        <nav
          className={`flex ${noWrap ? "gap-1 min-w-max" : "flex-wrap gap-1"} ${
            compact ? "sm:gap-2" : "sm:gap-4"
          }`}
          role="tablist"
          aria-label="Ürün durumu sekmeleri"
        >
          {tabsToRender.map((tab) => (
            <button
              key={tab.key}
              onClick={() => onTabChange?.(tab.key)}
              role="tab"
              aria-selected={activeTab === tab.key}
              aria-controls={`tabpanel-${tab.key}`}
              className={`group relative ${
                compact ? "py-1.5 px-2" : "py-2 px-3"
              } border-b-2 font-medium text-sm transition-colors ${
                noWrap ? "flex-shrink-0 whitespace-nowrap" : "flex-shrink-0"
              } ${
                activeTab === tab.key
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <div
                className={`flex items-center ${
                  compact ? "space-x-1" : "space-x-1.5"
                }`}
              >
                {!compact && !noWrap && (
                  <span className="hidden sm:inline">{tab.icon}</span>
                )}
                <span
                  className={`${
                    compact || noWrap ? "text-xs" : "text-xs sm:text-sm"
                  }`}
                >
                  {tab.label}
                </span>
                <span
                  className={`text-xs ${
                    compact ? "px-1 py-0.5" : "px-1.5 py-0.5"
                  } rounded-full bg-gray-100 ${
                    activeTab === tab.key
                      ? "text-blue-600 bg-blue-50"
                      : "text-gray-500"
                  }`}
                >
                  {tab.count?.toLocaleString() || 0}
                </span>
                {!compact && !noWrap && tab.description && (
                  <Tooltip content={tab.description}>
                    <Info className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:inline" />
                  </Tooltip>
                )}
              </div>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default ProductStatusTabs;
