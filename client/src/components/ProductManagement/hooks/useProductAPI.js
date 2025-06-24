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
          const response = await fetch(url, {
            ...options,
            signal: abortController.signal,
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
              ...options.headers,
            },
          });

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
          outOfStock: overview.outOfStockProducts || 0,
          lowStock: overview.lowStockProducts || 0,
        };
      }
    } catch (error) {
      handleError(error, " - fetchProductStats");
      return {
        total: 0,
        active: 0,
        inactive: 0,
        draft: 0,
        pending: 0,
        rejected: 0,
        outOfStock: 0,
        lowStock: 0,
      };
    }
  }, [createAPICall, handleError]);

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

        const data = await createAPICall(
          `${API_BASE_URL}/products/bulk-update`,
          {
            method: "PUT",
            body: JSON.stringify({ productIds, updateData }),
          },
          "bulkUpdateProducts"
        );

        if (data && data.success) {
          showAlert(
            `${productIds.length} ürün başarıyla güncellendi`,
            "success"
          );
          return data.updatedProducts;
        }
      } catch (error) {
        handleError(error, " - bulkUpdateProducts");
        throw error;
      } finally {
        updateState({ loading: false });
      }
    },
    [createAPICall, updateState, showAlert, handleError]
  );

  const bulkDeleteProducts = useCallback(
    async (productIds) => {
      try {
        updateState({ loading: true });

        const data = await createAPICall(
          `${API_BASE_URL}/products/bulk-delete`,
          {
            method: "DELETE",
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

      const data = await createAPICall(
        `${API_BASE_URL}/products/sync`,
        {
          method: "POST",
        },
        "syncProducts"
      );

      if (data && data.success) {
        showAlert("Ürünler başarıyla senkronize edildi", "success");
        return data.syncedCount;
      }
    } catch (error) {
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
