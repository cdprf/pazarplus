import { useReducer, useCallback } from "react";

// Action types
const ACTION_TYPES = {
  SET_LOADING: "SET_LOADING",
  SET_PRODUCTS: "SET_PRODUCTS",
  SET_PRODUCT_STATS: "SET_PRODUCT_STATS",
  SET_FILTERS: "SET_FILTERS",
  SET_SEARCH: "SET_SEARCH",
  SET_SORT: "SET_SORT",
  SET_PAGINATION: "SET_PAGINATION",
  SET_SELECTED_PRODUCTS: "SET_SELECTED_PRODUCTS",
  SET_VIEW_MODE: "SET_VIEW_MODE",
  SET_MODALS: "SET_MODALS",
  SET_BULK_STATE: "SET_BULK_STATE",
  SET_ACTIVE_TAB: "SET_ACTIVE_TAB",
  RESET_FILTERS: "RESET_FILTERS",
  UPDATE_MULTIPLE: "UPDATE_MULTIPLE",
};

// Initial state
const initialState = {
  // Data
  products: [],
  allProductsStats: {
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
  },

  // Loading states
  loading: true,
  syncing: false,
  importing: false,
  exporting: false,

  // Selection
  selectedProducts: [],

  // Search and filtering
  searchValue: "",
  filters: {
    category: "",
    status: "",
    stockStatus: "",
    minPrice: "",
    maxPrice: "",
    minStock: "",
    maxStock: "",
    platform: "all",
  },

  // Sorting
  sortField: "updatedAt",
  sortOrder: "desc",

  // Pagination
  currentPage: 1,
  itemsPerPage: 20,
  totalPages: 1,
  totalItems: 0,

  // UI state
  viewMode: "table",
  activeTab: "all",
  showAnalytics: false,

  // Modals
  productModal: { open: false, product: null },
  detailsModal: { open: false, product: null },
  imageModal: {
    open: false,
    imageUrl: "",
    productName: "",
    images: [],
    currentIndex: 0,
  },
  showBulkEditModal: false,
  showExportModal: false,

  // Other
  recentSearches: [],
  analyticsTimeRange: "week",
};

// Reducer function
const productReducer = (state, action) => {
  switch (action.type) {
    case ACTION_TYPES.SET_LOADING:
      return {
        ...state,
        loading: action.payload,
      };

    case ACTION_TYPES.SET_PRODUCTS:
      return {
        ...state,
        products: action.payload.products,
        totalItems: action.payload.totalItems || state.totalItems,
        totalPages: action.payload.totalPages || state.totalPages,
        currentPage: action.payload.currentPage || state.currentPage,
        loading: false,
      };

    case ACTION_TYPES.SET_PRODUCT_STATS:
      return {
        ...state,
        allProductsStats: action.payload,
      };

    case ACTION_TYPES.SET_FILTERS:
      return {
        ...state,
        filters: {
          ...state.filters,
          ...action.payload,
        },
        currentPage: 1, // Reset to first page when filters change
      };

    case ACTION_TYPES.SET_SEARCH:
      return {
        ...state,
        searchValue: action.payload,
        currentPage: 1, // Reset to first page when search changes
      };

    case ACTION_TYPES.SET_SORT:
      return {
        ...state,
        sortField: action.payload.field,
        sortOrder: action.payload.order,
      };

    case ACTION_TYPES.SET_PAGINATION:
      return {
        ...state,
        currentPage: action.payload.page || state.currentPage,
        itemsPerPage: action.payload.itemsPerPage || state.itemsPerPage,
        totalPages: action.payload.totalPages || state.totalPages,
        totalItems: action.payload.totalItems || state.totalItems,
      };

    case ACTION_TYPES.SET_SELECTED_PRODUCTS:
      return {
        ...state,
        selectedProducts: action.payload,
      };

    case ACTION_TYPES.SET_VIEW_MODE:
      return {
        ...state,
        viewMode: action.payload,
      };

    case ACTION_TYPES.SET_MODALS:
      return {
        ...state,
        ...action.payload,
      };

    case ACTION_TYPES.SET_BULK_STATE:
      return {
        ...state,
        syncing:
          action.payload.syncing !== undefined
            ? action.payload.syncing
            : state.syncing,
        importing:
          action.payload.importing !== undefined
            ? action.payload.importing
            : state.importing,
        exporting:
          action.payload.exporting !== undefined
            ? action.payload.exporting
            : state.exporting,
      };

    case ACTION_TYPES.SET_ACTIVE_TAB:
      return {
        ...state,
        activeTab: action.payload,
        currentPage: 1, // Reset pagination when changing tabs
      };

    case ACTION_TYPES.RESET_FILTERS:
      return {
        ...state,
        filters: initialState.filters,
        searchValue: "",
        currentPage: 1,
      };

    case ACTION_TYPES.UPDATE_MULTIPLE:
      return {
        ...state,
        ...action.payload,
      };

    default:
      return state;
  }
};

/**
 * Custom hook for managing product state with useReducer
 * Provides optimized state management and action creators
 */
export const useProductState = () => {
  const [state, dispatch] = useReducer(productReducer, initialState);

  // Action creators
  const actions = {
    setLoading: useCallback((loading) => {
      dispatch({ type: ACTION_TYPES.SET_LOADING, payload: loading });
    }, []),

    setProducts: useCallback((products, pagination = {}) => {
      dispatch({
        type: ACTION_TYPES.SET_PRODUCTS,
        payload: { products, ...pagination },
      });
    }, []),

    setProductStats: useCallback((stats) => {
      dispatch({ type: ACTION_TYPES.SET_PRODUCT_STATS, payload: stats });
    }, []),

    setFilters: useCallback((filters) => {
      dispatch({ type: ACTION_TYPES.SET_FILTERS, payload: filters });
    }, []),

    setSearch: useCallback((searchValue) => {
      dispatch({ type: ACTION_TYPES.SET_SEARCH, payload: searchValue });
    }, []),

    setSort: useCallback((field, order) => {
      dispatch({
        type: ACTION_TYPES.SET_SORT,
        payload: { field, order },
      });
    }, []),

    setPagination: useCallback((pagination) => {
      dispatch({ type: ACTION_TYPES.SET_PAGINATION, payload: pagination });
    }, []),

    setSelectedProducts: useCallback((selectedProducts) => {
      dispatch({
        type: ACTION_TYPES.SET_SELECTED_PRODUCTS,
        payload: selectedProducts,
      });
    }, []),

    setViewMode: useCallback((viewMode) => {
      dispatch({ type: ACTION_TYPES.SET_VIEW_MODE, payload: viewMode });
    }, []),

    setModals: useCallback((modals) => {
      dispatch({ type: ACTION_TYPES.SET_MODALS, payload: modals });
    }, []),

    setBulkState: useCallback((bulkState) => {
      dispatch({ type: ACTION_TYPES.SET_BULK_STATE, payload: bulkState });
    }, []),

    setActiveTab: useCallback((tab) => {
      dispatch({ type: ACTION_TYPES.SET_ACTIVE_TAB, payload: tab });
    }, []),

    resetFilters: useCallback(() => {
      dispatch({ type: ACTION_TYPES.RESET_FILTERS });
    }, []),

    updateMultiple: useCallback((updates) => {
      dispatch({ type: ACTION_TYPES.UPDATE_MULTIPLE, payload: updates });
    }, []),

    updateState: useCallback((updates) => {
      dispatch({ type: ACTION_TYPES.UPDATE_MULTIPLE, payload: updates });
    }, []),
  };

  // Computed selectors
  const selectors = {
    // Get current page products
    getCurrentPageProducts: useCallback(() => {
      if (!state.products || state.products.length === 0) return [];
      const startIndex = (state.currentPage - 1) * state.itemsPerPage;
      const endIndex = startIndex + state.itemsPerPage;
      return state.products.slice(startIndex, endIndex);
    }, [state.products, state.currentPage, state.itemsPerPage]),

    // Get selected products data
    getSelectedProductsData: useCallback(() => {
      if (!state.products || state.products.length === 0) return [];
      return state.products.filter((product) =>
        state.selectedProducts.includes(product.id)
      );
    }, [state.products, state.selectedProducts]),

    // Get active filters count
    getActiveFiltersCount: useCallback(() => {
      return (
        Object.entries(state.filters).filter(
          ([key, value]) => value && value !== "all" && value !== ""
        ).length + (state.searchValue ? 1 : 0)
      );
    }, [state.filters, state.searchValue]),

    // Check if all products on current page are selected
    getAllSelected: useCallback(() => {
      if (!state?.products || state.products.length === 0) return false;

      const startIndex = (state.currentPage - 1) * state.itemsPerPage;
      const endIndex = startIndex + state.itemsPerPage;
      const currentPageProducts = state.products.slice(startIndex, endIndex);

      return (
        currentPageProducts.length > 0 &&
        currentPageProducts.every((product) =>
          state.selectedProducts.includes(product.id)
        )
      );
    }, [
      state?.products,
      state?.selectedProducts,
      state?.currentPage,
      state?.itemsPerPage,
    ]),

    // Get status counts for tabs
    getStatusCounts: useCallback(() => {
      // Ensure we have a valid stats object
      const stats = state?.allProductsStats || initialState.allProductsStats;
      return {
        all: stats?.total || 0,
        active: stats?.active || 0,
        inactive: stats?.inactive || 0,
        draft: stats?.draft || 0,
        pending: stats?.pending || 0,
        rejected: stats?.rejected || 0,
        out_of_stock: stats?.outOfStock || 0,
        low_stock: stats?.lowStock || 0,
        in_stock: stats?.inStock || 0,
        pasif: stats?.pasif || 0,
        aktif: stats?.aktif || 0,
      };
    }, [state?.allProductsStats]),
  };

  return {
    state,
    actions,
    selectors,
  };
};

export default useProductState;
