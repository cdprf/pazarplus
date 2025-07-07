import React, { useState, useEffect } from "react";
import {
  OptimizedBarChart,
  OptimizedPieChart,
  ChartContainer,
} from "./OptimizedCharts";
import analyticsService from "../../services/analyticsService";
import {
  formatCurrency,
  formatNumber,
  safeInteger,
  processProductData,
  processInsightsData,
} from "../../utils/analyticsFormatting";
import KPICard from "./KPICard";
import ExportButton from "./ExportButton";
import {
  CubeIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

const ProductAnalytics = ({ timeframe = "30d", filters = {} }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chartType, setChartType] = useState("performance");
  const [showAllProducts, setShowAllProducts] = useState(false);
  const [allProductsData, setAllProductsData] = useState([]);
  const [allProductsLoading, setAllProductsLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  useEffect(() => {
    const fetchProductData = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log("🔍 Fetching product analytics for timeframe:", timeframe);

        const productData = await analyticsService.getProductAnalytics(
          timeframe
        );

        console.log("✅ Product analytics data received:", {
          success: productData?.success,
          hasData: !!productData?.data,
          dataKeys: productData?.data ? Object.keys(productData.data) : [],
        });

        // Process the data to handle different API response formats
        if (productData && (productData.success || productData.data)) {
          const rawData = productData.data || productData;

          // Ensure consistent data structure
          const normalizedData = {
            ...rawData,
            topProducts: processProductData(rawData.topProducts || []),
            performance: rawData.performance || {
              categories: [],
              sales: [],
              stockStatus: [],
            },
            inventory: rawData.inventory || {
              lowStock: [],
              outOfStock: [],
              overStock: [],
            },
            insights: processInsightsData(rawData.insights || {}),
          };

          console.log("📊 Processed product analytics:", {
            topProductsLength: normalizedData.topProducts?.length || 0,
            hasPerformance: !!normalizedData.performance,
            hasInsights: !!normalizedData.insights,
            normalizedData: normalizedData,
          });

          setData(normalizedData);
        } else {
          console.warn("⚠️ No product data received, setting empty data");
          setData({
            topProducts: [],
            performance: {
              categories: [],
              sales: [],
              stockStatus: [],
            },
            inventory: {
              lowStock: [],
              outOfStock: [],
              overStock: [],
            },
            insights: {
              recommendations: [],
              opportunities: [],
              warnings: [],
            },
          });
        }
      } catch (err) {
        console.error("Error fetching product analytics:", err);
        setError(err.message || "Failed to load product analytics");
      } finally {
        setLoading(false);
      }
    };

    fetchProductData();
  }, [timeframe]);

  // Function to fetch all products with detailed analysis
  const fetchAllProductsData = async () => {
    try {
      setAllProductsLoading(true);

      // Fetch all products analytics with no limit
      const allProductsResponse = await analyticsService.getProductAnalytics(
        timeframe + "&all=true"
      );

      if (
        allProductsResponse &&
        (allProductsResponse.success || allProductsResponse.data)
      ) {
        const rawData = allProductsResponse.data || allProductsResponse;
        // Use allProducts first, then fall back to products/topProducts
        const allProducts =
          rawData.allProducts || rawData.products || rawData.topProducts || [];
        setAllProductsData(allProducts);
        console.log(`Loaded ${allProducts.length} total products with orders`);
      }

      setShowAllProducts(true);
      setCurrentPage(1); // Reset to first page when loading new data
    } catch (err) {
      console.error("Error fetching all products data:", err);
      setError("Failed to load detailed product analysis");
    } finally {
      setAllProductsLoading(false);
    }
  };

  // Sorting function
  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  // Get sorted data
  const getSortedData = (data) => {
    if (!sortConfig.key) return data;

    return [...data].sort((a, b) => {
      const aValue = getNestedValue(a, sortConfig.key);
      const bValue = getNestedValue(b, sortConfig.key);

      if (aValue < bValue) {
        return sortConfig.direction === "asc" ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === "asc" ? 1 : -1;
      }
      return 0;
    });
  };

  // Helper function to get nested object values
  const getNestedValue = (obj, key) => {
    switch (key) {
      case "name":
        return obj.name || "";
      case "quantity":
        return parseInt(obj.totalQuantity || obj.totalSold) || 0;
      case "revenue":
        return parseFloat(obj.totalRevenue) || 0;
      case "orders":
        return parseInt(obj.orderCount || obj.totalOrders) || 0;
      case "price":
        const quantity = parseInt(obj.totalQuantity || obj.totalSold) || 1;
        const revenue = parseFloat(obj.totalRevenue) || 0;
        return revenue / quantity;
      case "stock":
        return parseInt(obj.currentStock || obj.stockQuantity) || 0;
      case "category":
        return obj.category || "";
      default:
        return obj[key] || "";
    }
  };

  // Pagination logic
  const getPaginatedData = (data) => {
    if (!showAllProducts) return data.slice(0, 10);

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return data.slice(startIndex, endIndex);
  };

  // Get total pages
  const getTotalPages = (dataLength) => {
    return Math.ceil(dataLength / itemsPerPage);
  };

  // Sortable header component
  const SortableHeader = ({ column, children, className = "" }) => (
    <th
      className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 ${className}`}
      onClick={() => handleSort(column)}
    >
      <div className="flex items-center justify-between">
        <span>{children}</span>
        <div className="flex flex-col ml-1">
          <svg
            className={`h-3 w-3 ${
              sortConfig.key === column && sortConfig.direction === "asc"
                ? "text-blue-600"
                : "text-gray-300"
            }`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
              clipRule="evenodd"
            />
          </svg>
          <svg
            className={`h-3 w-3 -mt-1 ${
              sortConfig.key === column && sortConfig.direction === "desc"
                ? "text-blue-600"
                : "text-gray-300"
            }`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </div>
    </th>
  );

  // Pagination component
  const Pagination = ({
    currentPage,
    totalPages,
    onPageChange,
    itemsPerPage,
    onItemsPerPageChange,
    totalItems,
  }) => (
    <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
      <div className="flex-1 flex justify-between sm:hidden">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
        <div className="flex items-center space-x-4">
          <p className="text-sm text-gray-700">
            Showing{" "}
            <span className="font-medium">
              {(currentPage - 1) * itemsPerPage + 1}
            </span>{" "}
            to{" "}
            <span className="font-medium">
              {Math.min(currentPage * itemsPerPage, totalItems)}
            </span>{" "}
            of <span className="font-medium">{totalItems}</span> results
          </p>
          <select
            value={itemsPerPage}
            onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
            className="border border-gray-300 rounded-md px-3 py-1 text-sm"
          >
            <option value={10}>10 per page</option>
            <option value={20}>20 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
          </select>
        </div>
        <div>
          <nav
            className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
            aria-label="Pagination"
          >
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((page) => {
                if (totalPages <= 7) return true;
                if (page === 1 || page === totalPages) return true;
                if (page >= currentPage - 2 && page <= currentPage + 2)
                  return true;
                return false;
              })
              .map((page, index, array) => {
                if (index > 0 && array[index - 1] !== page - 1) {
                  return [
                    <span
                      key={`ellipsis-${page}`}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700"
                    >
                      ...
                    </span>,
                    <button
                      key={page}
                      onClick={() => onPageChange(page)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        page === currentPage
                          ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
                          : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      {page}
                    </button>,
                  ];
                }
                return (
                  <button
                    key={page}
                    onClick={() => onPageChange(page)}
                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                      page === currentPage
                        ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
                        : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </nav>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading product analytics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 m-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-red-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Error Loading Product Analytics
            </h3>
            <div className="mt-2 text-sm text-red-700">{error}</div>
            <div className="mt-3">
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center px-3 py-2 border border-red-300 text-sm leading-4 font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Extract product data from response
  const productAnalytics = data || {};
  const topProducts = productAnalytics.topProducts || [];
  const performance = productAnalytics.performance || {};
  const categoryData = performance.categories || [];
  const insights = productAnalytics.insights || {};

  // Prepare data for charts and tables
  const displayProducts = showAllProducts ? allProductsData : topProducts;
  const sortedProducts = getSortedData(displayProducts);
  const paginatedProducts = getPaginatedData(sortedProducts);
  const totalPages = getTotalPages(sortedProducts.length);

  const chartProductLimit = showAllProducts ? 20 : 10;

  const topProductsChart = sortedProducts
    .slice(0, chartProductLimit)
    .map((product) => ({
      name: product.name || `Product ${product.id}`,
      quantity: product.totalSold || 0,
      revenue: product.totalRevenue || 0,
      orders: product.orderCount || 0,
    }));

  const categoryChart = categoryData.map((category) => ({
    name: category.name || "Unknown",
    value: category.revenue || 0,
    count: category.count || 0,
  }));

  // Calculate KPIs
  const currentProducts = showAllProducts ? sortedProducts : topProducts;
  const totalProducts = currentProducts.length;
  const totalRevenue = currentProducts.reduce(
    (sum, p) => sum + (p.totalRevenue || 0),
    0
  );
  const totalQuantity = currentProducts.reduce(
    (sum, p) => sum + (p.totalSold || 0),
    0
  );
  const avgOrderValue = totalQuantity > 0 ? totalRevenue / totalQuantity : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Product Analytics
          </h2>
          <p className="text-gray-600">
            Product performance, inventory insights, and recommendations
          </p>
        </div>
        <ExportButton type="products" timeframe={timeframe} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title={showAllProducts ? "All Products" : "Top Products"}
          value={totalProducts.toLocaleString()}
          icon={CubeIcon}
          color="primary"
        />
        <KPICard
          title={showAllProducts ? "Total Revenue" : "Top Products Revenue"}
          value={formatCurrency(totalRevenue)}
          icon={ChartBarIcon}
          color="success"
        />
        <KPICard
          title="Units Sold"
          value={formatNumber(totalQuantity)}
          icon={ArrowTrendingUpIcon}
          color="info"
        />
        <KPICard
          title="Avg Unit Price"
          value={formatCurrency(avgOrderValue)}
          icon={ExclamationTriangleIcon}
          color="warning"
        />
      </div>

      {/* Chart Controls */}
      <div className="flex flex-wrap gap-2">
        <button
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            chartType === "performance"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
          onClick={() => setChartType("performance")}
        >
          Product Performance
        </button>
        <button
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            chartType === "categories"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
          onClick={() => setChartType("categories")}
        >
          Category Breakdown
        </button>
        <button
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            chartType === "inventory"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
          onClick={() => setChartType("inventory")}
        >
          Inventory Analysis
        </button>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {chartType === "performance" &&
                (showAllProducts
                  ? `Top ${chartProductLimit} Performing Products (All Data)`
                  : "Top Performing Products")}
              {chartType === "categories" && "Category Performance"}
              {chartType === "inventory" && "Inventory Levels"}
            </h3>
            <ChartContainer height={400}>
              {chartType === "performance" && (
                <OptimizedBarChart
                  data={topProductsChart}
                  bars={[
                    {
                      dataKey: "quantity",
                      fill: "#8884d8",
                      name: "Quantity Sold",
                    },
                    {
                      dataKey: "revenue",
                      fill: "#82ca9d",
                      name: "Revenue ($)",
                    },
                  ]}
                  xAxisKey="name"
                  showGrid
                  showLegend
                  height={400}
                />
              )}
              {chartType === "categories" && (
                <OptimizedPieChart
                  data={categoryChart}
                  dataKey="value"
                  nameKey="name"
                  height={400}
                  showLegend
                />
              )}
              {chartType === "inventory" && (
                <OptimizedBarChart
                  data={topProductsChart}
                  bars={[
                    { dataKey: "orders", fill: "#ffc658", name: "Order Count" },
                  ]}
                  xAxisKey="name"
                  showGrid
                  showLegend
                  height={400}
                />
              )}
            </ChartContainer>
          </div>
        </div>
        <div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Product Insights
            </h3>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">
                  Top Performer
                </h4>
                <p className="text-green-600 font-medium">
                  {topProducts[0]?.name || "No data"}
                </p>
                <p className="text-sm text-gray-500">
                  {safeInteger(
                    topProducts[0]?.orderCount || 0
                  ).toLocaleString()}{" "}
                  orders
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">
                  Categories
                </h4>
                <p className="text-sm text-gray-500">
                  {categoryData.length} categories tracked
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">
                  Performance Metrics
                </h4>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Conversion Rate</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {totalQuantity > 0
                      ? ((totalProducts / totalQuantity) * 100).toFixed(1)
                      : "0"}
                    %
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Product Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {showAllProducts ? "All Products Analysis" : "Top 10 Products"}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {showAllProducts
                  ? `Showing ${paginatedProducts.length} of ${
                      sortedProducts.length
                    } products with detailed analysis data${
                      sortConfig.key
                        ? ` (sorted by ${sortConfig.key} ${sortConfig.direction})`
                        : ""
                    }`
                  : `Top performing products for ${timeframe} timeframe`}
              </p>
            </div>
            <div className="flex space-x-2">
              {!showAllProducts && (
                <button
                  onClick={fetchAllProductsData}
                  disabled={allProductsLoading}
                  className="inline-flex items-center px-4 py-2 border border-blue-300 shadow-sm text-sm font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {allProductsLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                      Loading...
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-4 h-4 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                        />
                      </svg>
                      View All Products Analysis
                    </>
                  )}
                </button>
              )}
              {showAllProducts && (
                <button
                  onClick={() => {
                    setShowAllProducts(false);
                    setSortConfig({ key: null, direction: "asc" });
                    setCurrentPage(1);
                  }}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                  Back to Top 10
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rank
                </th>
                <SortableHeader column="name">Product</SortableHeader>
                <SortableHeader column="quantity">Quantity Sold</SortableHeader>
                <SortableHeader column="revenue">Revenue</SortableHeader>
                <SortableHeader column="orders">Orders</SortableHeader>
                <SortableHeader column="price">Avg. Price</SortableHeader>
                {showAllProducts && (
                  <>
                    <SortableHeader column="stock">Stock Status</SortableHeader>
                    <SortableHeader column="category">Category</SortableHeader>
                  </>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Performance
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedProducts.map((product, index) => {
                const quantity =
                  parseInt(product.totalQuantity || product.totalSold) || 0;
                const revenue = parseFloat(product.totalRevenue) || 0;
                const orders =
                  parseInt(product.orderCount || product.totalOrders) || 1;
                const avgPrice = revenue / Math.max(quantity, 1);
                const performance = Math.min(
                  100,
                  (revenue / Math.max(totalRevenue, 1)) * 100 * 10
                );

                return (
                  <tr key={product.id || index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div
                          className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium ${
                            (showAllProducts
                              ? (currentPage - 1) * itemsPerPage + index + 1
                              : index + 1) < 4
                              ? "bg-yellow-100 text-yellow-800"
                              : (showAllProducts
                                  ? (currentPage - 1) * itemsPerPage + index + 1
                                  : index + 1) < 11
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {showAllProducts
                            ? (currentPage - 1) * itemsPerPage + index + 1
                            : index + 1}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {product.name || `Product ${product.id}`}
                        </div>
                        <div className="text-sm text-gray-500">
                          SKU: {product.sku || "N/A"} • ID:{" "}
                          {product.id || product.productId}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="font-medium">
                        {quantity.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="font-medium">
                        {formatCurrency(revenue)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="font-medium">
                        {orders.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="font-medium">
                        {formatCurrency(avgPrice)}
                      </div>
                    </td>
                    {showAllProducts && (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              (product.currentStock ||
                                product.stockQuantity ||
                                0) > 10
                                ? "bg-green-100 text-green-800"
                                : (product.currentStock ||
                                    product.stockQuantity ||
                                    0) > 0
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {(product.currentStock ||
                              product.stockQuantity ||
                              0) > 10
                              ? "In Stock"
                              : (product.currentStock ||
                                  product.stockQuantity ||
                                  0) > 0
                              ? "Low Stock"
                              : "Out of Stock"}
                          </span>
                          <div className="text-xs text-gray-500 mt-1">
                            {product.currentStock || product.stockQuantity || 0}{" "}
                            units
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {product.category || "Uncategorized"}
                        </td>
                      </>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div
                            className={`h-2 rounded-full ${
                              performance > 75
                                ? "bg-green-500"
                                : performance > 50
                                ? "bg-yellow-500"
                                : "bg-red-500"
                            }`}
                            style={{ width: `${performance}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-medium">
                          {performance.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {(showAllProducts ? sortedProducts : topProducts).length === 0 && (
            <div className="text-center py-8">
              <div className="text-gray-500">
                <CubeIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-lg font-medium">No product data available</p>
                <p className="text-sm">
                  No products found for the selected timeframe.
                </p>
              </div>
            </div>
          )}
          {showAllProducts && sortedProducts.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              itemsPerPage={itemsPerPage}
              onItemsPerPageChange={(newSize) => {
                setItemsPerPage(newSize);
                setCurrentPage(1); // Reset to first page when changing page size
              }}
              totalItems={sortedProducts.length}
            />
          )}
        </div>
      </div>

      {/* Product Insights Section */}
      {insights &&
        (insights.recommendations?.length > 0 ||
          insights.opportunities?.length > 0 ||
          insights.warnings?.length > 0) && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Product Insights & Recommendations
              </h3>
            </div>
            <div className="p-6">
              {insights.recommendations?.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-green-700 mb-2 flex items-center">
                    <CheckCircleIcon className="h-4 w-4 mr-2" />
                    Recommendations
                  </h4>
                  <div className="space-y-2">
                    {insights.recommendations.map((rec, index) => (
                      <div
                        key={index}
                        className="bg-green-50 border border-green-200 rounded-md p-3"
                      >
                        <p className="text-sm text-green-800">{rec.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {insights.opportunities?.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-blue-700 mb-2 flex items-center">
                    <ArrowTrendingUpIcon className="h-4 w-4 mr-2" />
                    Opportunities
                  </h4>
                  <div className="space-y-2">
                    {insights.opportunities.map((opp, index) => (
                      <div
                        key={index}
                        className="bg-blue-50 border border-blue-200 rounded-md p-3"
                      >
                        <p className="text-sm text-blue-800">{opp.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {insights.warnings?.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-yellow-700 mb-2 flex items-center">
                    <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
                    Warnings
                  </h4>
                  <div className="space-y-2">
                    {insights.warnings.map((warn, index) => (
                      <div
                        key={index}
                        className="bg-yellow-50 border border-yellow-200 rounded-md p-3"
                      >
                        <p className="text-sm text-yellow-800">{warn.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      {/* All Products Analysis Notice */}
      {showAllProducts && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-blue-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Comprehensive Product Analysis
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  You are viewing detailed analysis data for all{" "}
                  {allProductsData.length} products. This includes stock status,
                  category information, and performance metrics for the entire
                  product catalog. The data provides insights into inventory
                  management, sales patterns, and category performance across
                  your complete product range.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductAnalytics;
