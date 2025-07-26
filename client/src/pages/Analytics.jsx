import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "../i18n/hooks/useTranslation";
import BusinessIntelligenceDashboard from "../components/analytics/BusinessIntelligenceDashboard";
import SalesAnalytics from "../components/analytics/SalesAnalytics";
import ProductAnalytics from "../components/analytics/ProductAnalytics";
import PlatformAnalytics from "../components/analytics/PlatformAnalytics";
import CustomerAnalytics from "../components/analytics/CustomerAnalytics";
import FinancialAnalytics from "../components/analytics/FinancialAnalytics";
import OperationalAnalytics from "../components/analytics/OperationalAnalytics";
import AnalyticsErrorBoundary from "../components/analytics/AnalyticsErrorBoundary";
import {
  ChartBarIcon,
  BanknotesIcon,
  CubeIcon,
  GlobeAltIcon,
  UserGroupIcon,
  PresentationChartLineIcon,
  CogIcon,
  ClockIcon,
  DocumentArrowDownIcon,
} from "@heroicons/react/24/outline";

const Analytics = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("overview");
  const [timeframe, setTimeframe] = useState("30d");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Enhanced tab configuration with icons and descriptions
  const tabs = useMemo(
    () => [
      {
        id: "overview",
        label: t("analytics.overview", {}, "Genel Bakış"),
        icon: ChartBarIcon,
        description: t(
          "analytics.overviewDesc",
          {},
          "Kapsamlı iş zekası dashboard"
        ),
        color: "primary",
      },
      {
        id: "sales",
        label: t("analytics.sales", {}, "Satışlar"),
        icon: BanknotesIcon,
        description: t(
          "analytics.salesDesc",
          {},
          "Satış performansı ve gelir trendleri"
        ),
        color: "success",
      },
      {
        id: "products",
        label: t("analytics.products", {}, "Ürünler"),
        icon: CubeIcon,
        description: t(
          "analytics.productsDesc",
          {},
          "Ürün performansı ve stok analizi"
        ),
        color: "warning",
      },
      {
        id: "platforms",
        label: t("analytics.platforms", {}, "Platformlar"),
        icon: GlobeAltIcon,
        description: t(
          "analytics.platformsDesc",
          {},
          "Çok platformlu karşılaştırma ve analiz"
        ),
        color: "info",
      },
      {
        id: "customers",
        label: t("analytics.customers", {}, "Müşteriler"),
        icon: UserGroupIcon,
        description: t(
          "analytics.customersDesc",
          {},
          "Müşteri analizi ve segmentasyon"
        ),
        color: "purple",
      },
      {
        id: "financial",
        label: t("analytics.financial", {}, "Finansal"),
        icon: PresentationChartLineIcon,
        description: t(
          "analytics.financialDesc",
          {},
          "Finansal KPI'lar ve karlılık analizi"
        ),
        color: "teal",
      },
      {
        id: "operational",
        label: t("analytics.operational", {}, "Operasyonel"),
        icon: CogIcon,
        description: t(
          "analytics.operationalDesc",
          {},
          "Operasyonel metrikler ve verimlilik"
        ),
        color: "gray",
      },
    ],
    [t]
  );

  // Timeframe options
  const timeframeOptions = [
    { value: "7d", label: t("analytics.timeframe.last7days", {}, "Son 7 gün") },
    {
      value: "30d",
      label: t("analytics.timeframe.last30days", {}, "Son 30 gün"),
    },
    {
      value: "90d",
      label: t("analytics.timeframe.last3months", {}, "Son 3 ay"),
    },
    { value: "1y", label: t("analytics.timeframe.lastYear", {}, "Son yıl") },
  ];

  const renderContent = () => {
    const commonProps = { timeframe };

    switch (activeTab) {
      case "overview":
        return <BusinessIntelligenceDashboard {...commonProps} />;
      case "sales":
        return <SalesAnalytics {...commonProps} />;
      case "products":
        return <ProductAnalytics {...commonProps} />;
      case "platforms":
        return <PlatformAnalytics {...commonProps} />;
      case "customers":
        return <CustomerAnalytics {...commonProps} />;
      case "financial":
        return <FinancialAnalytics {...commonProps} />;
      case "operational":
        return <OperationalAnalytics {...commonProps} />;
      default:
        return <BusinessIntelligenceDashboard {...commonProps} />;
    }
  };

  // Handle tab change with smooth transition
  const handleTabChange = (tabId) => {
    if (tabId !== activeTab) {
      setIsTransitioning(true);
      setTimeout(() => {
        setActiveTab(tabId);
        setIsTransitioning(false);
      }, 150);
    }
  };

  // Update last updated timestamp periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdated(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const currentTab = tabs.find((tab) => tab.id === activeTab);

  return (
    <AnalyticsErrorBoundary>
      <div className="analytics-dashboard">
        {/* Enhanced Header with Design System */}
        <div className="bg-gradient-primary">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-8">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl">
                      <ChartBarIcon className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h1 className="text-3xl lg:text-4xl font-bold text-white">
                        {t("analytics.dashboard.title", {}, "Analitik Paneli")}
                      </h1>
                      <p className="text-white/80 mt-1 text-lg">
                        {currentTab?.description ||
                          t(
                            "analytics.dashboard.subtitle",
                            {},
                            "İş zekası ve performans görüşleri"
                          )}
                      </p>
                    </div>
                  </div>

                  {/* Status Info */}
                  <div className="flex items-center space-x-6 text-sm text-white/70">
                    <div className="flex items-center space-x-2">
                      <ClockIcon className="h-4 w-4" />
                      <span>
                        {t("analytics.lastUpdated", {}, "Son güncelleme")}:{" "}
                        {lastUpdated.toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span>{t("analytics.liveData", {}, "Canlı veri")}</span>
                    </div>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center space-x-4 mt-6 lg:mt-0">
                  {/* Timeframe Selector */}
                  <div className="relative">
                    <select
                      value={timeframe}
                      onChange={(e) => setTimeframe(e.target.value)}
                      className="appearance-none bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-lg px-4 py-2 pr-8 focus:outline-none focus:border-white/40 focus:ring-2 focus:ring-white/20 transition-all duration-200"
                      style={{ minWidth: "150px" }}
                    >
                      {timeframeOptions.map((option) => (
                        <option
                          key={option.value}
                          value={option.value}
                          className="text-gray-900 bg-white"
                        >
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {/* Custom dropdown arrow */}
                    <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                      <svg
                        className="w-4 h-4 text-white/70"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </div>

                  {/* Export Button */}
                  <button className="flex items-center px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-lg hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all duration-200">
                    <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
                    {t("analytics.export", {}, "Dışa Aktar")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Navigation Tabs */}
        <div className="analytics-tab-nav">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav
              className="flex space-x-1"
              aria-label={t(
                "analytics.navigation.label",
                {},
                "Analitik bölümleri"
              )}
            >
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`analytics-tab-button ${
                      isActive ? "active" : ""
                    }`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span className="hidden sm:block">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Content Area with Enhanced Design */}
        <main className="page-content">
          <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <div
              className={`analytics-content transition-all duration-300 ${
                isTransitioning
                  ? "opacity-0 transform translate-y-4"
                  : "opacity-100 transform translate-y-0"
              }`}
            >
              {renderContent()}
            </div>
          </div>
        </main>
      </div>
    </AnalyticsErrorBoundary>
  );
};

export default Analytics;
