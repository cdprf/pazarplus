import React, { useState } from "react";
import BusinessIntelligenceDashboard from "../components/analytics/BusinessIntelligenceDashboard";
import SalesAnalytics from "../components/analytics/SalesAnalytics";
import ProductAnalytics from "../components/analytics/ProductAnalytics";
import PlatformAnalytics from "../components/analytics/PlatformAnalytics";
import CustomerAnalytics from "../components/analytics/CustomerAnalytics";
import FinancialAnalytics from "../components/analytics/FinancialAnalytics";
import OperationalAnalytics from "../components/analytics/OperationalAnalytics";
import AnalyticsErrorBoundary from "../components/analytics/AnalyticsErrorBoundary";

const Analytics = () => {
  const [activeTab, setActiveTab] = useState("overview");

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return <BusinessIntelligenceDashboard />;
      case "sales":
        return <SalesAnalytics />;
      case "products":
        return <ProductAnalytics />;
      case "platforms":
        return <PlatformAnalytics />;
      case "customers":
        return <CustomerAnalytics />;
      case "financial":
        return <FinancialAnalytics />;
      case "operational":
        return <OperationalAnalytics />;
      default:
        return <BusinessIntelligenceDashboard />;
    }
  };

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "sales", label: "Sales" },
    { id: "products", label: "Products" },
    { id: "platforms", label: "Platforms" },
    { id: "customers", label: "Customers" },
    { id: "financial", label: "Financial" },
    { id: "operational", label: "Operational" },
  ];

  return (
    <AnalyticsErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Analytics Dashboard
                </h1>
                <p className="text-gray-600 mt-1">
                  Comprehensive business intelligence and performance insights
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex space-x-8" aria-label="Analytics sections">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                    activeTab === tab.id
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="analytics-content">{renderContent()}</div>
        </div>
      </div>
    </AnalyticsErrorBoundary>
  );
};

export default Analytics;
