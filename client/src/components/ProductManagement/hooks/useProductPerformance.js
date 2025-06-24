import { useCallback, useMemo, useRef } from 'react';

/**
 * Custom hook for optimizing product management performance
 * Provides memoized callbacks and computed values to prevent unnecessary re-renders
 */
export const useProductPerformance = (state, updateState, showAlert) => {
  // Memoize expensive calculations
  const filteredProductsCount = useMemo(() => {
    if (!state?.products || !Array.isArray(state.products)) return 0;
    return state.products.filter(product => {
      const { filters, searchValue } = state;
      
      // Search filter
      if (searchValue && !product.name?.toLowerCase().includes(searchValue.toLowerCase()) &&
          !product.sku?.toLowerCase().includes(searchValue.toLowerCase())) {
        return false;
      }
      
      // Category filter
      if (filters?.category && product.category !== filters.category) return false;
      
      // Status filter
      if (filters?.status && product.status !== filters.status) return false;
      
      // Price range filter
      if (filters?.minPrice && product.price < parseFloat(filters.minPrice)) return false;
      if (filters?.maxPrice && product.price > parseFloat(filters.maxPrice)) return false;
      
      // Stock filter
      if (filters?.minStock && product.stockQuantity < parseInt(filters.minStock)) return false;
      if (filters?.maxStock && product.stockQuantity > parseInt(filters.maxStock)) return false;
      
      return true;
    }).length;
  }, [state]);

  // Memoize sorted products
  const sortedProducts = useMemo(() => {
    if (!state?.products || !Array.isArray(state.products)) return [];
    
    return [...state.products].sort((a, b) => {
      const { sortField, sortOrder } = state;
      let aVal = a[sortField];
      let bVal = b[sortField];
      
      // Handle different data types
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [state]);

  // Memoize pagination calculations
  const paginationData = useMemo(() => {
    const totalItems = filteredProductsCount;
    const totalPages = Math.ceil(totalItems / (state?.itemsPerPage || 20));
    const startIndex = ((state?.currentPage || 1) - 1) * (state?.itemsPerPage || 20);
    const endIndex = startIndex + (state?.itemsPerPage || 20);
    
    return {
      totalItems,
      totalPages,
      startIndex,
      endIndex,
      hasNextPage: (state?.currentPage || 1) < totalPages,
      hasPrevPage: (state?.currentPage || 1) > 1,
    };
  }, [filteredProductsCount, state?.itemsPerPage, state?.currentPage]);

  // Optimized update handlers with minimal re-renders
  const optimizedUpdateState = useCallback((updates) => {
    updateState(prevState => {
      // Only update if values actually changed
      const hasChanges = Object.keys(updates).some(key => 
        JSON.stringify(prevState[key]) !== JSON.stringify(updates[key])
      );
      
      if (!hasChanges) return prevState;
      
      return { ...prevState, ...updates };
    });
  }, [updateState]);

  // Debounced search handler
  const searchTimeoutRef = useRef(null);
  const debouncedSearch = useCallback((searchValue) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      optimizedUpdateState({ searchValue, currentPage: 1 });
    }, 300);
  }, [optimizedUpdateState]);

  // Optimized selection handlers
  const handleSelectProduct = useCallback((productId) => {
    const isSelected = state?.selectedProducts?.includes(productId) || false;
    const currentSelection = state?.selectedProducts || [];
    const newSelection = isSelected
      ? currentSelection.filter(id => id !== productId)
      : [...currentSelection, productId];
    
    optimizedUpdateState({ selectedProducts: newSelection });
  }, [state?.selectedProducts, optimizedUpdateState]);

  const handleSelectAll = useCallback(() => {
    const allProductIds = state?.products?.map(p => p.id) || [];
    const currentSelection = state?.selectedProducts || [];
    const allSelected = currentSelection.length === allProductIds.length && allProductIds.length > 0;
    
    optimizedUpdateState({
      selectedProducts: allSelected ? [] : allProductIds
    });
  }, [state?.products, state?.selectedProducts, optimizedUpdateState]);

  // Batch operations for better performance
  const batchUpdate = useCallback((updates) => {
    // Group updates to minimize state changes
    const batchedUpdates = updates.reduce((acc, update) => {
      return { ...acc, ...update };
    }, {});
    
    optimizedUpdateState(batchedUpdates);
  }, [optimizedUpdateState]);

  // Error handling with user feedback
  const handleError = useCallback((error, context = '') => {
    console.error(`[ProductManagement${context}]:`, error);
    
    let userMessage = 'Bir hata oluştu. Lütfen tekrar deneyiniz.';
    
    if (error.message) {
      if (error.message.includes('network') || error.message.includes('fetch')) {
        userMessage = 'Bağlantı hatası. İnternet bağlantınızı kontrol ediniz.';
      } else if (error.message.includes('unauthorized') || error.message.includes('401')) {
        userMessage = 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapınız.';
      } else if (error.message.includes('forbidden') || error.message.includes('403')) {
        userMessage = 'Bu işlem için yetkiniz bulunmamaktadır.';
      }
    }
    
    showAlert(userMessage, 'error');
  }, [showAlert]);

  return {
    // Computed values
    filteredProductsCount,
    sortedProducts,
    paginationData,
    
    // Optimized handlers
    optimizedUpdateState,
    debouncedSearch,
    handleSelectProduct,
    handleSelectAll,
    batchUpdate,
    handleError,
  };
};

export default useProductPerformance;
