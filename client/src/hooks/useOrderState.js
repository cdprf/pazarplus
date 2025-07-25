import logger from "../utils/logger.js";
/**
 * useOrderState - Centralized order state management hook
 * Implements proper state management patterns with validation and history
 */

import React, {
  useState,
  useCallback,
  useReducer,
  useRef,
  useEffect,
} from "react";
import { OrderValidator } from "../core/OrderValidator";
import { OrderTransformer } from "../core/OrderTransformer";
import { OrderHistory } from "../core/OrderHistory";
import OrderService from "../services/OrderService";

// Action types for order reducer
const ORDER_ACTIONS = {
  SET_ORDERS: "SET_ORDERS",
  ADD_ORDER: "ADD_ORDER",
  UPDATE_ORDER: "UPDATE_ORDER",
  DELETE_ORDER: "DELETE_ORDER",
  SET_LOADING: "SET_LOADING",
  SET_ERROR: "SET_ERROR",
  SET_FILTERS: "SET_FILTERS",
  SET_PAGINATION: "SET_PAGINATION",
  SET_PAGE: "SET_PAGE", // Add dedicated page action
  SET_SELECTED: "SET_SELECTED",
  CLEAR_ERROR: "CLEAR_ERROR",
  BULK_UPDATE: "BULK_UPDATE",
  SORT_ORDERS: "SORT_ORDERS",
  SET_SEARCH: "SET_SEARCH", // Add search action
  SELECT_ALL: "SELECT_ALL", // Add select all action
  TOGGLE_ORDER_SELECTION: "TOGGLE_ORDER_SELECTION", // Add toggle selection action
  CLEAR_SELECTION: "CLEAR_SELECTION", // Add clear selection action
  SET_RECORD_COUNT: "SET_RECORD_COUNT", // Add record count action
  CLEAR_FILTERS: "CLEAR_FILTERS", // Add clear filters action
  SET_STATS: "SET_STATS", // Add stats action
  SET_SYNCING: "SET_SYNCING", // Add syncing action
  SYNC_SUCCESS: "SYNC_SUCCESS", // Add sync success action
  REFRESH_ORDERS: "REFRESH_ORDERS", // Add refresh action
};

// Initial state
const initialState = {
  orders: [],
  filteredOrders: [],
  loading: false,
  syncing: false,
  error: null,
  refreshTrigger: 0, // Add refresh trigger
  filters: {
    status: "all",
    platform: "all",
    search: "",
    dateFrom: "",
    dateTo: "",
    priceMin: "",
    priceMax: "",
  },
  pagination: {
    currentPage: 1,
    recordCount: 20,
    totalPages: 0,
    totalRecords: 0,
  },
  selectedOrders: [],
  sortConfig: {
    field: "orderDate",
    direction: "desc",
  },
  stats: OrderTransformer.getEmptyStats(),
};

// Order reducer
const orderReducer = (state, action) => {
  switch (action.type) {
    case ORDER_ACTIONS.SET_ORDERS:
      const orders = action.payload;
      // Don't calculate stats from paginated orders - preserve existing global stats
      return {
        ...state,
        orders,
        loading: false,
        error: null,
        // Keep existing stats instead of recalculating from paginated orders
      };

    case ORDER_ACTIONS.ADD_ORDER:
      const newOrders = [...state.orders, action.payload];
      return {
        ...state,
        orders: newOrders,
        // Don't recalculate stats here - let fetchStats() handle it
      };

    case ORDER_ACTIONS.UPDATE_ORDER:
      const updatedOrders = state.orders.map((order) =>
        order.id === action.payload.id ? { ...order, ...action.payload } : order
      );
      return {
        ...state,
        orders: updatedOrders,
        // Don't recalculate stats here - let fetchStats() handle it
      };

    case ORDER_ACTIONS.DELETE_ORDER:
      const remainingOrders = state.orders.filter(
        (order) => order.id !== action.payload
      );
      return {
        ...state,
        orders: remainingOrders,
        selectedOrders: state.selectedOrders.filter(
          (id) => id !== action.payload
        ),
        // Don't recalculate stats here - let fetchStats() handle it
      };

    case ORDER_ACTIONS.BULK_UPDATE:
      const { orderIds, updateData } = action.payload;
      const bulkUpdatedOrders = state.orders.map((order) =>
        orderIds.includes(order.id) ? { ...order, ...updateData } : order
      );
      return {
        ...state,
        orders: bulkUpdatedOrders,
        // Don't recalculate stats here - let fetchStats() handle it
      };

    case ORDER_ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: action.payload,
      };

    case ORDER_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        loading: false,
      };

    case ORDER_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };

    case ORDER_ACTIONS.SET_FILTERS:
      return {
        ...state,
        filters: { ...state.filters, ...action.payload },
        pagination: { ...state.pagination, currentPage: 1 }, // Reset to first page
      };

    case ORDER_ACTIONS.SET_PAGINATION:
      return {
        ...state,
        pagination: { ...state.pagination, ...action.payload },
      };

    case ORDER_ACTIONS.SET_PAGE:
      return {
        ...state,
        pagination: { ...state.pagination, currentPage: action.payload },
      };

    case ORDER_ACTIONS.SET_SELECTED:
      return {
        ...state,
        selectedOrders: action.payload,
      };

    case ORDER_ACTIONS.SORT_ORDERS:
      return {
        ...state,
        sortConfig: action.payload,
      };

    case ORDER_ACTIONS.SET_SEARCH:
      return {
        ...state,
        filters: { ...state.filters, search: action.payload },
        pagination: { ...state.pagination, currentPage: 1 }, // Reset to first page
      };

    case ORDER_ACTIONS.SELECT_ALL:
      const allOrderIds = action.payload
        ? state.orders.map((order) => order.id)
        : [];
      return {
        ...state,
        selectedOrders: allOrderIds,
      };

    case ORDER_ACTIONS.TOGGLE_ORDER_SELECTION:
      const { orderId, selected } = action.payload;
      const currentSelection = [...state.selectedOrders];
      if (selected) {
        if (!currentSelection.includes(orderId)) {
          currentSelection.push(orderId);
        }
      } else {
        const index = currentSelection.indexOf(orderId);
        if (index > -1) {
          currentSelection.splice(index, 1);
        }
      }
      return {
        ...state,
        selectedOrders: currentSelection,
      };

    case ORDER_ACTIONS.CLEAR_SELECTION:
      return {
        ...state,
        selectedOrders: [],
      };

    case ORDER_ACTIONS.SET_RECORD_COUNT:
      return {
        ...state,
        pagination: {
          ...state.pagination,
          recordCount: action.payload,
          currentPage: 1, // Reset to first page when changing record count
        },
      };

    case ORDER_ACTIONS.CLEAR_FILTERS:
      return {
        ...state,
        filters: {
          status: "all",
          platform: "all",
          search: "",
          dateFrom: "",
          dateTo: "",
          priceMin: "",
          priceMax: "",
        },
        pagination: {
          ...state.pagination,
          currentPage: 1, // Reset to first page when clearing filters
        },
      };

    case ORDER_ACTIONS.SET_STATS:
      return {
        ...state,
        stats: action.payload,
      };

    case ORDER_ACTIONS.SET_SYNCING:
      return {
        ...state,
        syncing: action.payload,
      };

    case ORDER_ACTIONS.SYNC_SUCCESS:
      return {
        ...state,
        orders: action.payload.orders || state.orders,
        stats: action.payload.stats || state.stats,
        syncing: false,
      };

    case ORDER_ACTIONS.REFRESH_ORDERS:
      // This will trigger a re-fetch in the useEffect
      return {
        ...state,
        loading: true,
        refreshTrigger: Date.now(), // Add a trigger to force re-render
      };

    default:
      return state;
  }
};

export const useOrderState = (initialOrders = []) => {
  const [state, dispatch] = useReducer(orderReducer, {
    ...initialState,
    orders: initialOrders,
    stats: OrderTransformer.calculateOrderStats(initialOrders),
  });

  const historyRef = useRef(new OrderHistory());
  const debounceRef = useRef(null); // Add debounce timer ref
  const [validationErrors, setValidationErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Data fetching function
  const fetchOrders = useCallback(async () => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });
      dispatch({ type: "CLEAR_ERROR" });

      // Validate filters before API call
      const validationErrors = OrderService.validateFilters(state.filters);
      if (Object.keys(validationErrors).length > 0) {
        setValidationErrors(validationErrors);
        dispatch({ type: "SET_LOADING", payload: false });
        return;
      }

      setValidationErrors({});

      const params = {
        page: state.pagination.currentPage,
        limit: state.pagination.recordCount,
        search: state.filters.search?.trim(),
        ...state.filters,
      };

      const result = await OrderService.fetchOrders(params);

      if (result.success) {
        dispatch({ type: "SET_ORDERS", payload: result.data.orders });
        dispatch({ type: "SET_PAGINATION", payload: result.data.pagination });
        // Don't use stats from paginated results - fetch separately
        // dispatch({ type: "SET_STATS", payload: result.data.stats });
      } else {
        dispatch({ type: "SET_ERROR", payload: result.error });
      }
    } catch (error) {
      logger.error("Error fetching orders:", error);
      dispatch({ type: "SET_ERROR", payload: error.message });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, [
    state.filters,
    state.pagination.currentPage,
    state.pagination.recordCount,
  ]);

  // Separate function to fetch accurate stats from all orders
  const fetchStats = useCallback(async () => {
    try {
      logger.info("Fetching accurate stats for ALL orders...");

      // We don't pass any filters to ensure we get stats for ALL orders regardless of current view
      const statsResult = await OrderService.fetchOrderStats();

      if (statsResult.success) {
        dispatch({ type: "SET_STATS", payload: statsResult.data });
        logger.info("Updated stats for all orders:", statsResult.data);
      } else {
        logger.error("Failed to fetch stats:", statsResult.error);
      }
    } catch (error) {
      logger.error("Error fetching stats:", error);
    }
  }, []); // No dependencies to ensure it always fetches ALL orders

  // Effect for initial data loading and when dependencies change
  useEffect(() => {
    fetchOrders();
    fetchStats(); // Fetch accurate stats for all orders separately
  }, [fetchOrders, fetchStats]); // Include fetchStats to satisfy linter

  // Effect for handling refresh trigger
  useEffect(() => {
    if (state.refreshTrigger > 0) {
      logger.info("Refresh triggered, fetching data...");
      // Fetch both orders (which respect current filters) and overall stats (which include all orders)
      fetchOrders();
      fetchStats();
    }
  }, [state.refreshTrigger, fetchOrders, fetchStats]);

  // Effect for handling search debouncing
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      if (state.filters.search !== undefined) {
        fetchOrders();
        // Don't call fetchStats here since stats should always show ALL orders
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [state.filters.search, fetchOrders]); // Remove fetchStats dependency

  // Effect to refetch orders when pagination changes
  useEffect(() => {
    if (state.pagination.currentPage > 0) {
      fetchOrders();
    }
  }, [state.pagination.currentPage, state.pagination.recordCount, fetchOrders]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Memoized filtered and sorted orders
  const filteredAndSortedOrders = React.useMemo(() => {
    let result = [...state.orders];

    // Apply filters
    if (state.filters.status && state.filters.status !== "all") {
      result = result.filter(
        (order) => (order.orderStatus || order.status) === state.filters.status
      );
    }

    if (state.filters.platform && state.filters.platform !== "all") {
      result = result.filter(
        (order) => order.platform === state.filters.platform
      );
    }

    if (state.filters.search) {
      const searchTerm = state.filters.search.toLowerCase();
      result = result.filter(
        (order) =>
          order.orderNumber?.toLowerCase().includes(searchTerm) ||
          order.customerName?.toLowerCase().includes(searchTerm) ||
          order.customerEmail?.toLowerCase().includes(searchTerm) ||
          order.items?.some((item) =>
            item.productName?.toLowerCase().includes(searchTerm)
          )
      );
    }

    if (state.filters.dateFrom) {
      const fromDate = new Date(state.filters.dateFrom);
      result = result.filter((order) => {
        const orderDate = new Date(order.orderDate);
        return orderDate >= fromDate;
      });
    }

    if (state.filters.dateTo) {
      const toDate = new Date(state.filters.dateTo);
      toDate.setHours(23, 59, 59, 999); // End of day
      result = result.filter((order) => {
        const orderDate = new Date(order.orderDate);
        return orderDate <= toDate;
      });
    }

    if (state.filters.priceMin) {
      const minPrice = parseFloat(state.filters.priceMin);
      if (!isNaN(minPrice)) {
        result = result.filter((order) => order.totalAmount >= minPrice);
      }
    }

    if (state.filters.priceMax) {
      const maxPrice = parseFloat(state.filters.priceMax);
      if (!isNaN(maxPrice)) {
        result = result.filter((order) => order.totalAmount <= maxPrice);
      }
    }

    // Apply sorting
    if (state.sortConfig.field) {
      result.sort((a, b) => {
        let aValue = a[state.sortConfig.field];
        let bValue = b[state.sortConfig.field];

        // Handle nested properties
        if (state.sortConfig.field.includes(".")) {
          const parts = state.sortConfig.field.split(".");
          aValue = parts.reduce((obj, key) => obj?.[key], a);
          bValue = parts.reduce((obj, key) => obj?.[key], b);
        }

        // Handle different data types
        if (typeof aValue === "string" && typeof bValue === "string") {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }

        if (aValue < bValue) {
          return state.sortConfig.direction === "asc" ? -1 : 1;
        }
        if (aValue > bValue) {
          return state.sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    }

    return result;
  }, [state.orders, state.filters, state.sortConfig]);

  // Paginated orders
  const paginatedOrders = React.useMemo(() => {
    const startIndex =
      (state.pagination.currentPage - 1) * state.pagination.recordCount;
    const endIndex = startIndex + state.pagination.recordCount;
    return filteredAndSortedOrders.slice(startIndex, endIndex);
  }, [filteredAndSortedOrders, state.pagination]);

  // Update pagination info when filtered orders change
  useEffect(() => {
    const totalRecords = filteredAndSortedOrders.length;
    const recordCount = state.pagination.recordCount || 20; // Default fallback
    const totalPages =
      recordCount > 0 ? Math.ceil(totalRecords / recordCount) : 0;

    dispatch({
      type: ORDER_ACTIONS.SET_PAGINATION,
      payload: { totalRecords, totalPages },
    });
  }, [filteredAndSortedOrders.length, state.pagination.recordCount]);

  // Action creators
  const actions = {
    // Data fetching
    fetchOrders,
    fetchStats, // Add fetchStats to actions for manual refresh

    // Basic CRUD operations
    setOrders: useCallback((orders) => {
      dispatch({ type: ORDER_ACTIONS.SET_ORDERS, payload: orders });
    }, []),

    addOrder: useCallback(
      (orderData) => {
        const validationResult = OrderValidator.validateOrder(orderData);
        if (validationResult) {
          setValidationErrors(validationResult);
          return { success: false, errors: validationResult };
        }

        const order = {
          ...orderData,
          id: orderData.id || Date.now().toString(),
        };

        // Add to history
        historyRef.current.createOrder(order);

        dispatch({ type: ORDER_ACTIONS.ADD_ORDER, payload: order });
        setValidationErrors({});

        // Refresh stats since we added a new order
        fetchStats();

        return { success: true, order };
      },
      [fetchStats]
    ),

    updateOrder: useCallback(
      (orderId, updateData) => {
        const existingOrder = state.orders.find(
          (order) => order.id === orderId
        );
        if (!existingOrder) {
          return { success: false, error: "Order not found" };
        }

        const mergedData = { ...existingOrder, ...updateData };
        const validationResult = OrderValidator.validateOrder(mergedData);

        if (validationResult) {
          setValidationErrors(validationResult);
          return { success: false, errors: validationResult };
        }

        // Add to history
        historyRef.current.updateOrder(orderId, updateData, existingOrder);

        dispatch({
          type: ORDER_ACTIONS.UPDATE_ORDER,
          payload: { id: orderId, ...updateData },
        });
        setValidationErrors({});

        // Refresh stats since we updated an order
        fetchStats();

        return { success: true, order: mergedData };
      },
      [state.orders, fetchStats]
    ),

    deleteOrder: useCallback(
      (orderId) => {
        const orderToDelete = state.orders.find(
          (order) => order.id === orderId
        );
        if (!orderToDelete) {
          return { success: false, error: "Order not found" };
        }

        // Add to history
        historyRef.current.deleteOrder(orderToDelete);

        dispatch({ type: ORDER_ACTIONS.DELETE_ORDER, payload: orderId });

        // Refresh stats since we deleted an order
        fetchStats();

        return { success: true };
      },
      [state.orders, fetchStats]
    ),

    bulkUpdate: useCallback(
      (orderIds, updateData) => {
        const existingOrders = state.orders.filter((order) =>
          orderIds.includes(order.id)
        );
        const previousDataMap = {};

        existingOrders.forEach((order) => {
          previousDataMap[order.id] = { ...order };
        });

        // Add to history
        historyRef.current.bulkUpdate(orderIds, updateData, previousDataMap);

        dispatch({
          type: ORDER_ACTIONS.BULK_UPDATE,
          payload: { orderIds, updateData },
        });

        // Refresh stats since we bulk updated orders
        fetchStats();

        return { success: true };
      },
      [state.orders, fetchStats]
    ),

    // Filter and search operations
    setFilters: useCallback((filters) => {
      const filterErrors = OrderValidator.validateFilters(filters);
      if (filterErrors) {
        setValidationErrors((prev) => ({ ...prev, filters: filterErrors }));
        return { success: false, errors: filterErrors };
      }

      dispatch({ type: ORDER_ACTIONS.SET_FILTERS, payload: filters });
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.filters;
        return newErrors;
      });

      return { success: true };
    }, []),

    clearFilters: useCallback(() => {
      dispatch({
        type: ORDER_ACTIONS.SET_FILTERS,
        payload: {
          status: "all",
          platform: "all",
          search: "",
          dateFrom: "",
          dateTo: "",
          priceMin: "",
          priceMax: "",
        },
      });
    }, []),

    // Debounced search
    setSearch: useCallback((searchTerm) => {
      // Clear existing timeout
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      // Set new timeout for search (500ms debounce)
      debounceRef.current = setTimeout(() => {
        dispatch({ type: ORDER_ACTIONS.SET_SEARCH, payload: searchTerm });
      }, 500);
    }, []),

    // Immediate search (for non-debounced updates)
    setSearchImmediate: useCallback((searchTerm) => {
      dispatch({ type: ORDER_ACTIONS.SET_SEARCH, payload: searchTerm });
    }, []),

    // Sorting
    sortOrders: useCallback(
      (field) => {
        const currentSort = state.sortConfig;
        const direction =
          currentSort.field === field && currentSort.direction === "asc"
            ? "desc"
            : "asc";

        dispatch({
          type: ORDER_ACTIONS.SORT_ORDERS,
          payload: { field, direction },
        });
      },
      [state.sortConfig]
    ),

    // Selection
    selectOrder: useCallback(
      (orderId) => {
        const newSelected = state.selectedOrders.includes(orderId)
          ? state.selectedOrders.filter((id) => id !== orderId)
          : [...state.selectedOrders, orderId];

        dispatch({ type: ORDER_ACTIONS.SET_SELECTED, payload: newSelected });
      },
      [state.selectedOrders]
    ),

    selectAllOrders: useCallback(
      (orders = paginatedOrders) => {
        const orderIds = orders.map((order) => order.id);
        const allSelected = orderIds.every((id) =>
          state.selectedOrders.includes(id)
        );

        if (allSelected) {
          // Deselect all
          const newSelected = state.selectedOrders.filter(
            (id) => !orderIds.includes(id)
          );
          dispatch({ type: ORDER_ACTIONS.SET_SELECTED, payload: newSelected });
        } else {
          // Select all
          const newSelected = [
            ...new Set([...state.selectedOrders, ...orderIds]),
          ];
          dispatch({ type: ORDER_ACTIONS.SET_SELECTED, payload: newSelected });
        }
      },
      [state.selectedOrders, paginatedOrders]
    ),

    clearSelection: useCallback(() => {
      dispatch({ type: ORDER_ACTIONS.SET_SELECTED, payload: [] });
    }, []),

    // Pagination
    setPage: useCallback((page) => {
      dispatch({
        type: ORDER_ACTIONS.SET_PAGINATION,
        payload: { currentPage: page },
      });
    }, []),

    setRecordCount: useCallback((count) => {
      dispatch({
        type: ORDER_ACTIONS.SET_PAGINATION,
        payload: { recordCount: count, currentPage: 1 },
      });
    }, []),

    // Loading and error states
    setLoading: useCallback((loading) => {
      dispatch({ type: ORDER_ACTIONS.SET_LOADING, payload: loading });
    }, []),

    setError: useCallback((error) => {
      dispatch({ type: ORDER_ACTIONS.SET_ERROR, payload: error });
    }, []),

    clearError: useCallback(() => {
      dispatch({ type: ORDER_ACTIONS.CLEAR_ERROR });
    }, []),

    // History operations
    undo: useCallback(() => {
      try {
        const result = historyRef.current.undo();
        // Apply the undo result to state
        // This would need to be implemented based on the command type
        return { success: true, result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }, []),

    redo: useCallback(() => {
      try {
        const result = historyRef.current.redo();
        // Apply the redo result to state
        // This would need to be implemented based on the command type
        return { success: true, result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }, []),

    // Validation
    validateField: useCallback((fieldName, value, orderData = {}) => {
      const errors = OrderValidator.validateField(fieldName, value, orderData);

      setValidationErrors((prev) => ({
        ...prev,
        [fieldName]: errors,
      }));

      setTouched((prev) => ({
        ...prev,
        [fieldName]: true,
      }));

      return errors;
    }, []),

    validateOrder: useCallback((orderData) => {
      const errors = OrderValidator.validateOrder(orderData);
      setValidationErrors(errors || {});
      return errors;
    }, []),
  };

  // Computed values
  const computed = {
    filteredOrders: filteredAndSortedOrders,
    currentOrders: paginatedOrders,
    hasSelection: state.selectedOrders.length > 0,
    isAllSelected:
      paginatedOrders.length > 0 &&
      paginatedOrders.every((order) => state.selectedOrders.includes(order.id)),
    historyState: historyRef.current.getState(),
    totalFilteredRecords: filteredAndSortedOrders.length,
  };
  return {
    // State properties
    ...state,
    orders: state.orders,
    filters: state.filters,
    pagination: state.pagination,
    selectedOrders: state.selectedOrders,
    loading: state.loading,
    error: state.error,
    syncing: state.syncing,
    stats: state.stats,
    sortConfig: state.sortConfig,

    // Additional state
    validationErrors,
    touched,

    // Reducer dispatch function
    dispatch,

    // Actions
    ...actions,

    // Computed values
    ...computed,
  };
};
