/**
 * OrderStatsCards - Enhanced with Pazar+ Design System
 * Displays order statistics with consistent design patterns, animations, and theming
 */

import React from "react";
import {
  BarChart3,
  Clock,
  Package,
  Truck,
  CheckCircle,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { OrderTransformer } from "../../core/OrderTransformer";

const STAT_CONFIGS = {
  total: {
    label: "Toplam Sipariş",
    icon: BarChart3,
    color: "primary",
    variant: "stat-icon-primary",
  },
  new: {
    label: "Yeni Siparişler",
    icon: Clock,
    color: "warning",
    variant: "stat-icon-warning",
  },
  processing: {
    label: "Hazırlanıyor",
    icon: Package,
    color: "info",
    variant: "stat-icon-info",
  },
  shipped: {
    label: "Kargoda",
    icon: Truck,
    color: "info",
    variant: "stat-icon-info",
  },
  delivered: {
    label: "Teslim Edildi",
    icon: CheckCircle,
    color: "success",
    variant: "stat-icon-success",
  },
  cancelled: {
    label: "İptal Edildi",
    icon: Clock,
    color: "danger",
    variant: "stat-icon-danger",
  },
  totalRevenue: {
    label: "Toplam Gelir",
    icon: DollarSign,
    color: "success",
    variant: "stat-icon-success",
    formatter: (value, currency = "TRY") =>
      OrderTransformer.formatCurrency(value, currency),
  },
  averageOrderValue: {
    label: "Ortalama Sipariş Değeri",
    icon: TrendingUp,
    color: "primary",
    variant: "stat-icon-primary",
    formatter: (value, currency = "TRY") =>
      OrderTransformer.formatCurrency(value, currency),
  },
};

const StatCard = ({
  stat,
  value,
  previousValue,
  currency = "TRY",
  showTrend = false,
  onClick,
  className = "",
}) => {
  const config = STAT_CONFIGS[stat];
  if (!config) return null;

  const Icon = config.icon;
  const formattedValue = config.formatter
    ? config.formatter(value, currency)
    : value?.toLocaleString("tr-TR") || "0";

  // Calculate trend with enhanced styling
  let trendIcon = null;
  let trendColorClass = "";
  let trendValue = null;

  if (showTrend && previousValue !== undefined && previousValue !== null) {
    const change = value - previousValue;
    const percentChange =
      previousValue > 0 ? (change / previousValue) * 100 : 0;

    if (percentChange > 0) {
      trendIcon = TrendingUp;
      trendColorClass = "stat-trend-up";
      trendValue = `+${percentChange.toFixed(1)}%`;
    } else if (percentChange < 0) {
      trendIcon = TrendingDown;
      trendColorClass = "stat-trend-down";
      trendValue = `${percentChange.toFixed(1)}%`;
    } else {
      trendIcon = Minus;
      trendColorClass = "text-gray-500";
      trendValue = "0%";
    }
  }

  const TrendIcon = trendIcon;

  return (
    <div
      className={`dashboard-stat ${
        onClick ? "cursor-pointer" : ""
      } ${className}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <div className={`stat-icon ${config.variant}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div className="stat-content">
        <div className="stat-value">{formattedValue}</div>
        <div className="stat-label">{config.label}</div>
        {showTrend && TrendIcon && (
          <div className={`stat-trend ${trendColorClass}`}>
            <TrendIcon className="h-4 w-4 mr-1" />
            <span className="text-xs font-medium">{trendValue}</span>
          </div>
        )}
      </div>
    </div>
  );
};

const OrderStatsCards = ({
  stats = OrderTransformer.getEmptyStats(),
  previousStats,
  currency = "TRY",
  showTrend = false,
  onStatClick,
  className = "",
  gridCols = 6,
  isGlobalStats = true, // New prop to indicate these are stats for all orders
}) => {
  const defaultStats = [
    "total",
    "new",
    "processing",
    "shipped",
    "delivered",
    "totalRevenue",
  ];

  return (
    <div className={`w-full ${className}`}>
      {isGlobalStats && (
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Tüm Sipariş İstatistikleri
          </h3>
          <span className="text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
            Tüm zamanlar
          </span>
        </div>
      )}
      <div className="dashboard-grid-full">
        {defaultStats.map((statKey) => (
          <StatCard
            key={statKey}
            stat={statKey}
            value={stats[statKey]}
            previousValue={previousStats?.[statKey]}
            currency={currency}
            showTrend={showTrend}
            onClick={
              onStatClick
                ? () => onStatClick(statKey, stats[statKey])
                : undefined
            }
          />
        ))}
      </div>
    </div>
  );
};

// Enhanced Platform breakdown component
const PlatformBreakdown = ({
  platformBreakdown = {},
  className = "",
  showPercentages = true,
}) => {
  const total = Object.values(platformBreakdown).reduce(
    (sum, count) => sum + count,
    0
  );

  if (total === 0) {
    return (
      <div className={`card ${className}`}>
        <div className="card-header">
          <h3 className="card-title">Platform Dağılımı</h3>
        </div>
        <div className="card-body">
          <div className="empty-state">
            <p className="empty-state-description">Veri bulunamadı</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`card ${className}`}>
      <div className="card-header">
        <h3 className="card-title">Platform Dağılımı</h3>
      </div>
      <div className="card-body">
        <div className="space-y-4">
          {Object.entries(platformBreakdown).map(([platform, count]) => {
            const percentage =
              total > 0 ? ((count / total) * 100).toFixed(1) : "0.0";

            let badgeClass;
            switch (platform.toLowerCase()) {
              case "trendyol":
                badgeClass = "badge-warning";
                break;
              case "hepsiburada":
                badgeClass = "badge-info";
                break;
              case "n11":
                badgeClass = "badge-pending";
                break;
              default:
                badgeClass = "badge-info";
            }

            return (
              <div
                key={platform}
                className="flex items-center justify-between py-2"
              >
                <div className="flex items-center space-x-3">
                  <span className={`badge ${badgeClass}`}>{platform}</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900">
                    {count.toLocaleString("tr-TR")}
                  </div>
                  {showPercentages && (
                    <div className="text-sm text-gray-600">{percentage}%</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Enhanced Status breakdown component
const StatusBreakdown = ({
  statusBreakdown = {},
  className = "",
  showPercentages = true,
}) => {
  const total = Object.values(statusBreakdown).reduce(
    (sum, count) => sum + count,
    0
  );

  if (total === 0) {
    return (
      <div className={`card ${className}`}>
        <div className="card-header">
          <h3 className="card-title">Durum Dağılımı</h3>
        </div>
        <div className="card-body">
          <div className="empty-state">
            <p className="empty-state-description">Veri bulunamadı</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`card ${className}`}>
      <div className="card-header">
        <h3 className="card-title">Durum Dağılımı</h3>
      </div>
      <div className="card-body">
        <div className="space-y-4">
          {Object.entries(statusBreakdown).map(([status, count]) => {
            const percentage =
              total > 0 ? ((count / total) * 100).toFixed(1) : "0.0";
            const config = STAT_CONFIGS[status];

            let badgeClass;
            switch (status.toLowerCase()) {
              case "delivered":
                badgeClass = "badge-delivered";
                break;
              case "shipped":
                badgeClass = "badge-shipped";
                break;
              case "processing":
                badgeClass = "badge-processing";
                break;
              case "cancelled":
                badgeClass = "badge-cancelled";
                break;
              case "new":
                badgeClass = "badge-pending";
                break;
              default:
                badgeClass = "badge-info";
            }

            return (
              <div
                key={status}
                className="flex items-center justify-between py-2"
              >
                <div className="flex items-center space-x-3">
                  <span className={`badge ${badgeClass}`}>
                    {config?.label || status}
                  </span>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900">
                    {count.toLocaleString("tr-TR")}
                  </div>
                  {showPercentages && (
                    <div className="text-sm text-gray-600">{percentage}%</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Enhanced combined stats dashboard
const OrderStatsDashboard = ({
  stats = OrderTransformer.getEmptyStats(),
  previousStats,
  showTrend = false,
  showBreakdowns = true,
  currency = "TRY",
  onStatClick,
  className = "",
  isGlobalStats = true,
}) => {
  return (
    <div className={`space-y-8 ${className}`}>
      {/* Main stats cards with enhanced animation */}
      <div className="animate-fade-in">
        <OrderStatsCards
          stats={stats}
          previousStats={previousStats}
          currency={currency}
          showTrend={showTrend}
          onStatClick={onStatClick}
          isGlobalStats={isGlobalStats}
        />
      </div>

      {/* Breakdown cards with staggered animation */}
      {showBreakdowns && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-slide-up">
          <PlatformBreakdown
            platformBreakdown={stats.platformBreakdown}
            className="animate-slide-in-left"
          />
          <StatusBreakdown
            statusBreakdown={stats.statusBreakdown}
            className="animate-slide-in-right"
          />
        </div>
      )}
    </div>
  );
};

export default OrderStatsCards;
export {
  OrderStatsCards,
  PlatformBreakdown,
  StatusBreakdown,
  OrderStatsDashboard,
  StatCard,
};
