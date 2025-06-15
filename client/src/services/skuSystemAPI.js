/**
 * SKU System API Services
 * Frontend integration for the enhanced SKU system
 */

import { API_BASE_URL } from "../components/ProductManagement/utils/constants";

// API utility functions
const apiRequest = async (url, options = {}) => {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
};

/**
 * SKU System API Services
 */
export const skuSystemAPI = {
  /**
   * Process and classify a code (barcode or SKU) - ENHANCED API
   */
  processCode: async (code, context = {}) => {
    return apiRequest(`${API_BASE_URL}/sku/process`, {
      method: "POST",
      body: JSON.stringify({ code, context }),
    });
  },

  /**
   * Get all available data (brands, product types, variants, patterns) - ENHANCED API
   */
  getData: async () => {
    return apiRequest(`${API_BASE_URL}/sku/data`);
  },

  /**
   * Generate SKU using enhanced system
   */
  generateSKU: async (parameters) => {
    return apiRequest(`${API_BASE_URL}/sku/generate`, {
      method: "POST",
      body: JSON.stringify(parameters),
    });
  },

  /**
   * Parse existing SKU to extract components (legacy support)
   */
  parseSKU: async (sku) => {
    return apiRequest(`${API_BASE_URL}/sku/parse`, {
      method: "POST",
      body: JSON.stringify({ sku }),
    });
  },

  /**
   * Validate SKU format (legacy support)
   */
  validateSKU: async (sku) => {
    return apiRequest(`${API_BASE_URL}/sku/validate`, {
      method: "POST",
      body: JSON.stringify({ sku }),
    });
  },

  /**
   * Get available brands (legacy support)
   */
  getBrands: async () => {
    return apiRequest(`${API_BASE_URL}/sku/brands`);
  },

  /**
   * Get available product types (legacy support)
   */
  getProductTypes: async () => {
    return apiRequest(`${API_BASE_URL}/sku/product-types`);
  },

  /**
   * Get available variant codes (legacy support)
   */
  getVariantCodes: async () => {
    return apiRequest(`${API_BASE_URL}/sku/variant-codes`);
  },

  /**
   * Get next sequence number for a brand
   */
  getNextSequence: async (brandCode, productType) => {
    return apiRequest(`${API_BASE_URL}/products/sku/next-sequence`, {
      method: "POST",
      body: JSON.stringify({ brandCode, productType }),
    });
  },

  // Enhanced Data Management Methods

  /**
   * Brand Management
   */
  createBrand: async (brandData) => {
    return apiRequest(`${API_BASE_URL}/sku/brands`, {
      method: "POST",
      body: JSON.stringify(brandData),
    });
  },

  updateBrand: async (brandId, brandData) => {
    return apiRequest(`${API_BASE_URL}/sku/brands/${brandId}`, {
      method: "PUT",
      body: JSON.stringify(brandData),
    });
  },

  deleteBrand: async (brandId) => {
    return apiRequest(`${API_BASE_URL}/sku/brands/${brandId}`, {
      method: "DELETE",
    });
  },

  /**
   * Product Type Management
   */
  createProductType: async (typeData) => {
    return apiRequest(`${API_BASE_URL}/sku/product-types`, {
      method: "POST",
      body: JSON.stringify(typeData),
    });
  },

  updateProductType: async (typeId, typeData) => {
    return apiRequest(`${API_BASE_URL}/sku/product-types/${typeId}`, {
      method: "PUT",
      body: JSON.stringify(typeData),
    });
  },

  deleteProductType: async (typeId) => {
    return apiRequest(`${API_BASE_URL}/sku/product-types/${typeId}`, {
      method: "DELETE",
    });
  },

  /**
   * Variant Management
   */
  createVariant: async (variantData) => {
    return apiRequest(`${API_BASE_URL}/sku/variants`, {
      method: "POST",
      body: JSON.stringify(variantData),
    });
  },

  updateVariant: async (variantId, variantData) => {
    return apiRequest(`${API_BASE_URL}/sku/variants/${variantId}`, {
      method: "PUT",
      body: JSON.stringify(variantData),
    });
  },

  deleteVariant: async (variantId) => {
    return apiRequest(`${API_BASE_URL}/sku/variants/${variantId}`, {
      method: "DELETE",
    });
  },

  /**
   * Pattern Management
   */
  getPatterns: async () => {
    return apiRequest(`${API_BASE_URL}/sku/patterns`);
  },

  createPattern: async (patternData) => {
    return apiRequest(`${API_BASE_URL}/sku/patterns`, {
      method: "POST",
      body: JSON.stringify(patternData),
    });
  },

  updatePattern: async (patternId, patternData) => {
    return apiRequest(`${API_BASE_URL}/sku/patterns/${patternId}`, {
      method: "PUT",
      body: JSON.stringify(patternData),
    });
  },

  deletePattern: async (patternId) => {
    return apiRequest(`${API_BASE_URL}/sku/patterns/${patternId}`, {
      method: "DELETE",
    });
  },

  /**
   * Batch code analysis for pattern discovery
   */
  analyzeCodes: async (codes) => {
    return apiRequest(`${API_BASE_URL}/sku/analyze`, {
      method: "POST",
      body: JSON.stringify({ codes }),
    });
  },

  /**
   * Learn patterns from user feedback
   */
  learnFromFeedback: async (feedbackData) => {
    return apiRequest(`${API_BASE_URL}/sku/feedback`, {
      method: "POST",
      body: JSON.stringify(feedbackData),
    });
  },

  /**
   * Search across all SKU data
   */
  search: async (query, options = {}) => {
    const params = new URLSearchParams({ query, ...options });
    return apiRequest(`${API_BASE_URL}/sku/search?${params}`);
  },

  /**
   * Export SKU data
   */
  exportData: async (options = {}) => {
    const params = new URLSearchParams(options);
    return apiRequest(`${API_BASE_URL}/sku/export?${params}`);
  },

  /**
   * Import SKU data
   */
  importData: async (data) => {
    return apiRequest(`${API_BASE_URL}/sku/import`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // ...existing code...
};

/**
 * Enhanced Product API with SKU integration
 */
export const enhancedProductAPI = {
  /**
   * Create product with SKU generation
   */
  createWithSKU: async (productData) => {
    return apiRequest(`${API_BASE_URL}/products/create-with-sku`, {
      method: "POST",
      body: JSON.stringify(productData),
    });
  },

  /**
   * Update product and regenerate SKU if needed
   */
  updateWithSKU: async (productId, productData) => {
    return apiRequest(`${API_BASE_URL}/products/${productId}/update-with-sku`, {
      method: "PUT",
      body: JSON.stringify(productData),
    });
  },

  /**
   * Migrate existing product to structured SKU format
   */
  migrateSKU: async (productId, migrationData) => {
    return apiRequest(`${API_BASE_URL}/products/${productId}/migrate-sku`, {
      method: "PUT",
      body: JSON.stringify(migrationData),
    });
  },
};

const apis = { skuSystemAPI, enhancedProductAPI };
export default apis;
