import { useCallback, useRef } from "react";
import { API_BASE_URL } from "../utils/constants";

/**
 * Custom hook for product API operations
 * Centralizes all API calls with proper error handling and loading states
 */
export const useProductAPI = (updateState, showAlert, handleError) => {
  const abortControllersRef = useRef(new Map());
  const activeRequestsRef = useRef(new Map());
  const debounceTimeoutsRef = useRef(new Map());

  // API utility functions
  const createAPICall = useCallback(
    async (url, options = {}, requestKey = "default") => {
      // Normalize the request signature for better deduplication
      // Remove timestamp-like parameters that might change between renders
      const normalizedUrl = url.replace(/&_=\d+/g, "").replace(/\?_=\d+/g, "");
      const requestSignature = `${requestKey}:${normalizedUrl}:${JSON.stringify(
        options.body || {}
      )}:${options.method || "GET"}`;

      // If an identical request is already in progress, return that promise
      if (activeRequestsRef.current.has(requestSignature)) {
        console.log(`[API] Reusing existing request: ${requestKey}`);
        return await activeRequestsRef.current.get(requestSignature);
      }

      // Debounce rapid successive requests of the same type
      if (debounceTimeoutsRef.current.has(requestKey)) {
        clearTimeout(debounceTimeoutsRef.current.get(requestKey));
      }

      // Only cancel previous request if it's truly a different request
      const existingController = abortControllersRef.current.get(requestKey);
      if (
        existingController &&
        !activeRequestsRef.current.has(requestSignature)
      ) {
        console.log(`[API] Cancelling previous request: ${requestKey}`);
        existingController.abort();
      }

      // Create new abort controller for this request type
      const abortController = new AbortController();
      abortControllersRef.current.set(requestKey, abortController);

      // Create the request promise
      const requestPromise = (async () => {
        try {
          console.log(`[API] Starting request: ${requestKey}`);

          // Handle timeout option
          let timeoutId;
          if (options.timeout) {
            timeoutId = setTimeout(() => {
              abortController.abort();
            }, options.timeout);
          }

          const response = await fetch(url, {
            ...options,
            signal: abortController.signal,
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
              ...options.headers,
            },
            // Remove timeout from options passed to fetch since it's handled above
            timeout: undefined,
          });

          // Clear timeout if request completes successfully
          if (timeoutId) {
            clearTimeout(timeoutId);
          }

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          console.log(`[API] Request completed: ${requestKey}`);
          return response.json();
        } catch (error) {
          if (error.name === "AbortError") {
            console.log(`[API] Request aborted: ${requestKey}`);
            return null;
          }
          console.error(`[API] Request failed: ${requestKey}`, error.message);
          throw error;
        }
      })();

      // Store the promise to prevent duplicate requests
      activeRequestsRef.current.set(requestSignature, requestPromise);

      try {
        const result = await requestPromise;
        return result;
      } finally {
        // Clean up the active request promise
        activeRequestsRef.current.delete(requestSignature);
        // Note: Don't delete the abort controller here as it may be reused
        // Only delete it when we create a new one for the same requestKey
      }
    },
    []
  );

  // Fetch products with comprehensive error handling
  const fetchProducts = useCallback(
    async (params = {}) => {
      try {
        updateState({ loading: true });

        const queryParams = new URLSearchParams({
          page: params.page || 1,
          limit: params.limit || 20,
          sortField: params.sortField || "updatedAt",
          sortOrder: params.sortOrder || "desc",
          ...params.filters,
        });

        // Only add search parameter if it has a value
        if (params.search && params.search.trim() !== "") {
          queryParams.set("search", params.search.trim());
        }

        console.log(
          "URL:",
          `${API_BASE_URL}/products?${queryParams.toString()}`
        );

        const data = await createAPICall(
          `${API_BASE_URL}/products?${queryParams.toString()}`,
          {},
          "fetchProducts"
        );

        if (data && data.success) {
          const responseData = data.data || {};
          updateState({
            products: responseData.products || [],
            totalItems: responseData.pagination?.totalItems || 0,
            totalPages: responseData.pagination?.totalPages || 1,
            currentPage: responseData.pagination?.currentPage || 1,
            loading: false,
          });
        } else if (data === null) {
          // Request was aborted - keep current state but stop loading
          updateState({ loading: false });
        } else {
          // API returned error - clear products and show empty state
          updateState({ loading: false, products: [] });
        }
      } catch (error) {
        handleError(error, " - fetchProducts");
        updateState({ loading: false, products: [] });
      }
    },
    [createAPICall, updateState, handleError]
  );

  // Fetch product statistics
  const fetchProductStats = useCallback(async () => {
    try {
      const data = await createAPICall(
        `${API_BASE_URL}/products/stats`,
        {},
        "fetchProductStats"
      );

      if (data && data.success) {
        const overview = data.data?.overview || {};
        return {
          total: overview.totalProducts || 0,
          active: overview.activeProducts || 0,
          inactive: overview.inactiveProducts || 0,
          draft: overview.draftProducts || 0,
          pending: overview.pendingProducts || 0,
          rejected: overview.rejectedProducts || 0,
          // Map backend camelCase to frontend properties
          outOfStock: overview.outOfStockProducts || 0, // for compatibility
          lowStock: overview.lowStockProducts || 0, // for compatibility
          inStock: overview.inStockProducts || 0,
          pasif: overview.pasifProducts || 0,
          aktif: overview.aktifProducts || 0,
        };
      } else if (data === null) {
        // Request was aborted - return default stats silently
        return getDefaultStats();
      } else {
        // Handle the case where API returns success: false
        console.warn("Product stats API returned unsuccessful response:", data);
        return getDefaultStats();
      }
    } catch (error) {
      // More detailed error logging for debugging
      console.error("fetchProductStats error details:", {
        message: error.message,
        status: error.status,
        stack: error.stack,
      });

      // Check if it's a connection error
      if (
        error.message?.includes("CONNECTION_NOT_FOUND") ||
        error.message?.includes("no connection found") ||
        error.status === 500
      ) {
        console.warn(
          "Product stats failed due to connection issues, returning defaults"
        );
      }

      handleError(error, " - fetchProductStats");
      return getDefaultStats();
    }
  }, [createAPICall, handleError]);

  // Helper function for default stats
  const getDefaultStats = () => ({
    total: 0,
    active: 0,
    inactive: 0,
    draft: 0,
    pending: 0,
    rejected: 0,
    outOfStock: 0,
    lowStock: 0,
    inStock: 0,
    pasif: 0,
    aktif: 0,
  });

  // Create product
  const createProduct = useCallback(
    async (productData) => {
      try {
        updateState({ loading: true });

        const data = await createAPICall(
          `${API_BASE_URL}/products`,
          {
            method: "POST",
            body: JSON.stringify(productData),
          },
          "createProduct"
        );

        if (data && data.success) {
          showAlert("Ürün başarıyla oluşturuldu", "success");
          return data.product;
        }
      } catch (error) {
        handleError(error, " - createProduct");
        throw error;
      } finally {
        updateState({ loading: false });
      }
    },
    [createAPICall, updateState, showAlert, handleError]
  );

  // Update product
  const updateProduct = useCallback(
    async (productId, productData) => {
      try {
        updateState({ loading: true });

        const data = await createAPICall(
          `${API_BASE_URL}/products/${productId}`,
          {
            method: "PUT",
            body: JSON.stringify(productData),
          },
          "updateProduct"
        );

        if (data && data.success) {
          showAlert("Ürün başarıyla güncellendi", "success");
          return data.product;
        }
      } catch (error) {
        handleError(error, " - updateProduct");
        throw error;
      } finally {
        updateState({ loading: false });
      }
    },
    [createAPICall, updateState, showAlert, handleError]
  );

  // Internal update product function without alerts (for bulk operations)
  const updateProductInternal = useCallback(
    async (
      productId,
      productData,
      requestKey = `updateProduct-${productId}`
    ) => {
      const data = await createAPICall(
        `${API_BASE_URL}/products/${productId}`,
        {
          method: "PUT",
          body: JSON.stringify(productData),
        },
        requestKey
      );

      if (data && data.success) {
        return data.product;
      }
      throw new Error(`Failed to update product ${productId}`);
    },
    [createAPICall]
  );

  // Delete product
  const deleteProduct = useCallback(
    async (productId) => {
      try {
        updateState({ loading: true });

        const data = await createAPICall(
          `${API_BASE_URL}/products/${productId}`,
          {
            method: "DELETE",
          },
          "deleteProduct"
        );

        if (data && data.success) {
          showAlert("Ürün başarıyla silindi", "success");
          return true;
        }
      } catch (error) {
        handleError(error, " - deleteProduct");
        throw error;
      } finally {
        updateState({ loading: false });
      }
    },
    [createAPICall, updateState, showAlert, handleError]
  );

  // Bulk operations
  const bulkUpdateProducts = useCallback(
    async (productIds, updateData) => {
      try {
        updateState({ loading: true });

        // For status updates, use the specific endpoint
        if (updateData.status) {
          const data = await createAPICall(
            `${API_BASE_URL}/products/bulk/status`,
            {
              method: "PUT",
              body: JSON.stringify({ productIds, status: updateData.status }),
            },
            "bulkUpdateStatus"
          );

          if (data && data.success) {
            showAlert(
              `${productIds.length} ürün durumu başarıyla güncellendi`,
              "success"
            );
            return data.updatedIds;
          }
        }

        // For stock updates, use the specific endpoint
        if (updateData.stockQuantity !== undefined) {
          const updates = productIds.map((productId) => ({
            productId,
            stockQuantity: updateData.stockQuantity,
          }));

          const data = await createAPICall(
            `${API_BASE_URL}/products/bulk/stock`,
            {
              method: "PUT",
              body: JSON.stringify({ updates }),
            },
            "bulkUpdateStock"
          );

          if (data && data.success) {
            showAlert(
              `${productIds.length} ürün stoğu başarıyla güncellendi`,
              "success"
            );
            return data.updates;
          }
        }

        // For other updates, iterate through individual updates
        const results = [];
        let successCount = 0;

        for (let i = 0; i < productIds.length; i++) {
          const productId = productIds[i];
          try {
            const product = await updateProductInternal(
              productId,
              updateData,
              `bulkUpdate-${productId}-${i}-${Date.now()}`
            );

            if (product) {
              successCount++;
              results.push({ success: true, product });
            }
          } catch (error) {
            console.error(`Failed to update product ${productId}:`, error);
            results.push({ success: false, error: error.message });
          }
        }

        if (successCount > 0) {
          showAlert(`${successCount} ürün başarıyla güncellendi`, "success");
          return results;
        } else {
          throw new Error("No products were updated successfully");
        }
      } catch (error) {
        handleError(error, " - bulkUpdateProducts");
        throw error;
      } finally {
        updateState({ loading: false });
      }
    },
    [createAPICall, updateState, showAlert, handleError, updateProductInternal]
  );

  const bulkDeleteProducts = useCallback(
    async (productIds) => {
      try {
        updateState({ loading: true });

        const data = await createAPICall(
          `${API_BASE_URL}/products/bulk/delete`,
          {
            method: "POST",
            body: JSON.stringify({ productIds }),
          },
          "bulkDeleteProducts"
        );

        if (data && data.success) {
          showAlert(`${productIds.length} ürün başarıyla silindi`, "success");
          return true;
        }
      } catch (error) {
        handleError(error, " - bulkDeleteProducts");
        throw error;
      } finally {
        updateState({ loading: false });
      }
    },
    [createAPICall, updateState, showAlert, handleError]
  );

  // Sync products
  const syncProducts = useCallback(async () => {
    try {
      updateState({ syncing: true });

      // Show initial progress message
      showAlert(
        "Ürün senkronizasyonu başlatılıyor... Bu işlem birkaç dakika sürebilir.",
        "info"
      );

      const data = await createAPICall(
        `${API_BASE_URL}/products/sync`,
        {
          method: "POST",
          // Add longer timeout for sync operation (5 minutes)
          timeout: 5 * 60 * 1000, // 5 minutes in milliseconds
        },
        "syncProducts"
      );

      if (data && data.success) {
        const { totalSaved, platformResults } = data.data || {};
        const successfulPlatforms =
          platformResults?.filter((p) => p.success).length || 0;
        showAlert(
          `Senkronizasyon tamamlandı! ${
            totalSaved || 0
          } ürün ${successfulPlatforms} platformdan başarıyla alındı.`,
          "success"
        );
        return data.syncedCount || totalSaved || 0;
      } else if (data && !data.success) {
        // Handle specific error messages from the API
        if (
          data.code === "NO_PLATFORM_CONNECTIONS" ||
          data.message.includes("No active platform connections")
        ) {
          showAlert(
            "Platform bağlantısı bulunamadı. Önce platformlarınızı bağlayın.",
            "warning"
          );
        } else {
          showAlert(`Senkronizasyon hatası: ${data.message}`, "error");
        }
        return data.syncedCount || 0;
      }
    } catch (error) {
      // Check if it's an abort error (timeout)
      if (
        error.name === "AbortError" ||
        (error.message && error.message.includes("aborted"))
      ) {
        showAlert(
          "Senkronizasyon zaman aşımına uğradı. Lütfen tekrar deneyin.",
          "error"
        );
        return 0;
      }
      // Check if it's a 400 error with no platform connections
      if (error.message && error.message.includes("HTTP 400")) {
        showAlert(
          "Platform bağlantısı bulunamadı. Önce platformlarınızı bağlayın.",
          "warning"
        );
        return 0;
      }
      handleError(error, " - syncProducts");
      throw error;
    } finally {
      updateState({ syncing: false });
    }
  }, [createAPICall, updateState, showAlert, handleError]);

  // Import products
  const importProducts = useCallback(
    async (file) => {
      try {
        updateState({ importing: true });

        const formData = new FormData();
        formData.append("file", file);

        const data = await createAPICall(
          `${API_BASE_URL}/products/import`,
          {
            method: "POST",
            body: formData,
            headers: {
              // Don't set Content-Type for FormData
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
          "importProducts"
        );

        if (data && data.success) {
          showAlert(
            `${data.importedCount} ürün başarıyla içe aktarıldı`,
            "success"
          );
          return data.importedCount;
        }
      } catch (error) {
        handleError(error, " - importProducts");
        throw error;
      } finally {
        updateState({ importing: false });
      }
    },
    [createAPICall, updateState, showAlert, handleError]
  );

  // Export products
  const exportProducts = useCallback(
    async (filters = {}) => {
      try {
        updateState({ exporting: true });

        const queryParams = new URLSearchParams(filters);
        const response = await fetch(
          `${API_BASE_URL}/products/export?${queryParams.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `products-${
            new Date().toISOString().split("T")[0]
          }.xlsx`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);

          showAlert("Ürünler başarıyla dışa aktarıldı", "success");
        }
      } catch (error) {
        handleError(error, " - exportProducts");
        throw error;
      } finally {
        updateState({ exporting: false });
      }
    },
    [updateState, showAlert, handleError]
  );

  // Fetch main products with enhanced features
  const fetchMainProducts = useCallback(
    async (params = {}) => {
      try {
        updateState({ loading: true });

        const queryParams = new URLSearchParams({
          page: params.page || 1,
          limit: params.limit || 20,
          sortField: params.sortField || "updatedAt",
          sortOrder: params.sortOrder || "desc",
          ...params.filters,
        });

        // Only add search parameter if it has a value
        if (params.search && params.search.trim() !== "") {
          queryParams.set("search", params.search.trim());
        }

        console.log(
          "URL:",
          `${API_BASE_URL}/products/main-products?${queryParams.toString()}`
        );

        const data = await createAPICall(
          `${API_BASE_URL}/products/main-products?${queryParams.toString()}`,
          {},
          "fetchMainProducts"
        );

        if (data && data.success) {
          const responseData = data.data || {};
          updateState({
            products: responseData.products || [],
            totalItems: responseData.pagination?.totalItems || 0,
            totalPages: responseData.pagination?.totalPages || 1,
            currentPage: responseData.pagination?.currentPage || 1,
            loading: false,
          });
        }
      } catch (error) {
        handleError(error, " - fetchMainProducts");
        updateState({ loading: false, products: [] });
      }
    },
    [createAPICall, updateState, handleError]
  );

  // Cleanup function
  const cleanup = useCallback(() => {
    // Clear any pending debounce timeouts
    for (const [, timeout] of debounceTimeoutsRef.current.entries()) {
      clearTimeout(timeout);
    }
    // Abort all active requests
    for (const [, controller] of abortControllersRef.current.entries()) {
      controller.abort();
    }
    // Clear all maps
    abortControllersRef.current.clear();
    activeRequestsRef.current.clear();
    debounceTimeoutsRef.current.clear();
  }, []);

  return {
    fetchProducts,
    fetchMainProducts,
    fetchProductStats,
    createProduct,
    updateProduct,
    deleteProduct,
    bulkUpdateProducts,
    bulkDeleteProducts,
    syncProducts,
    importProducts,
    exportProducts,
    cleanup,
  };
};

export default useProductAPI;
