/**
 * Utility functions for safe data formatting in analytics components
 */

/**
 * Safely format currency values, handling NaN, null, undefined
 */
export const formatCurrency = (amount, locale = "tr-TR", currency = "TRY") => {
  // Handle null, undefined, NaN, or invalid values
  const numericAmount = parseFloat(amount);
  if (isNaN(numericAmount) || amount === null || amount === undefined) {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(0);
  }

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(numericAmount);
};

/**
 * Safely format numbers with proper handling of invalid values
 */
export const formatNumber = (
  number,
  minimumFractionDigits = 0,
  maximumFractionDigits = 2
) => {
  const numericValue = parseFloat(number);
  if (isNaN(numericValue) || number === null || number === undefined) {
    return "0";
  }

  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(numericValue);
};

/**
 * Safely format percentages
 */
export const formatPercentage = (value, precision = 1) => {
  const numericValue = parseFloat(value);
  if (isNaN(numericValue) || value === null || value === undefined) {
    return "0%";
  }
  return `${numericValue > 0 ? "+" : ""}${numericValue.toFixed(precision)}%`;
};

/**
 * Safely get numeric value from potentially invalid data
 */
export const safeNumeric = (value, defaultValue = 0) => {
  const numericValue = parseFloat(value);
  return isNaN(numericValue) || value === null || value === undefined
    ? defaultValue
    : numericValue;
};

/**
 * Safely get integer value from potentially invalid data
 */
export const safeInteger = (value, defaultValue = 0) => {
  const integerValue = parseInt(value);
  return isNaN(integerValue) || value === null || value === undefined
    ? defaultValue
    : integerValue;
};

/**
 * Process product data to ensure all fields are properly formatted
 */
export const processProductData = (products = []) => {
  return products.map((product, index) => ({
    ...product,
    id: product.id || product.productId || index,
    name: product.name || "Unknown Product",
    sku: product.sku || "N/A",
    category: product.category || "Uncategorized",
    totalRevenue: safeNumeric(product.totalRevenue || product.revenue),
    totalSold: safeInteger(
      product.totalSold || product.quantity || product.sales
    ),
    avgPrice: safeNumeric(product.avgPrice),
    orderCount: safeInteger(product.orderCount),
    revenueShare: safeNumeric(product.revenueShare),
  }));
};

/**
 * Process analytics data to ensure safe rendering
 */
export const processAnalyticsData = (data) => {
  if (!data) return null;

  return {
    ...data,
    orderSummary: {
      totalOrders: safeInteger(data.orderSummary?.totalOrders),
      totalRevenue: safeNumeric(data.orderSummary?.totalRevenue),
      validOrders: safeInteger(data.orderSummary?.validOrders),
      averageOrderValue: safeNumeric(data.orderSummary?.averageOrderValue),
      cancelledOrders: safeInteger(data.orderSummary?.cancelledOrders),
      returnedOrders: safeInteger(data.orderSummary?.returnedOrders),
      ...data.orderSummary,
    },
    revenue: {
      total: safeNumeric(data.revenue?.total),
      growth: safeNumeric(data.revenue?.growth),
      previousPeriod: safeNumeric(data.revenue?.previousPeriod),
      trends: data.revenue?.trends || [],
      ...data.revenue,
    },
    topProducts: processProductData(data.topProducts),
    platforms: data.platforms || [],
    performance: data.performance || { metrics: {} },
  };
};

/**
 * Safely extract text from insights/recommendations objects or strings
 */
export const extractInsightText = (item) => {
  if (typeof item === "string") {
    return item;
  }

  if (typeof item === "object" && item !== null) {
    return (
      item.message ||
      item.description ||
      item.title ||
      item.text ||
      JSON.stringify(item)
    );
  }

  return "No details available";
};

/**
 * Process insights data to ensure safe rendering
 */
export const processInsightsData = (insights) => {
  if (!insights)
    return { recommendations: [], opportunities: [], warnings: [] };

  return {
    recommendations: (insights.recommendations || []).map((rec) => ({
      text: extractInsightText(rec),
      priority: typeof rec === "object" ? rec.priority || "medium" : "medium",
      category: typeof rec === "object" ? rec.category || "General" : "General",
      title:
        typeof rec === "object"
          ? rec.title || rec.message || "Recommendation"
          : rec,
      description:
        typeof rec === "object"
          ? rec.description || rec.message || rec.title
          : rec,
      estimatedImpact:
        typeof rec === "object"
          ? rec.estimatedImpact || "High Impact"
          : "High Impact",
    })),
    opportunities: (insights.opportunities || []).map((opp) => ({
      text: extractInsightText(opp),
      ...opp,
    })),
    warnings: (insights.warnings || []).map((warn) => ({
      text: extractInsightText(warn),
      ...warn,
    })),
  };
};

const analyticsFormatting = {
  formatCurrency,
  formatNumber,
  formatPercentage,
  safeNumeric,
  safeInteger,
  processProductData,
  processAnalyticsData,
  extractInsightText,
  processInsightsData,
};

export default analyticsFormatting;
