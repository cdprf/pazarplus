import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orderService } from '../services/api/orderService';
import { useWebSocketQuery } from './useWebSocketQuery';

/**
 * Hook to fetch all orders with filtering, sorting and pagination
 * @param {Object} params - Filter and pagination parameters
 * @returns {Object} Query result with orders data
 */
export const useOrders = (params = {}) => {
  const { 
    page = 1, 
    limit = 20, 
    sort = 'createdAt', 
    direction = 'desc',
    status,
    search,
    platform,
    dateFrom,
    dateTo
  } = params;
  
  const queryParams = { page, limit, sort, direction };
  
  // Add optional filters if they exist
  if (status) queryParams.status = status;
  if (search) queryParams.search = search;
  if (platform) queryParams.platform = platform;
  if (dateFrom) queryParams.dateFrom = dateFrom;
  if (dateTo) queryParams.dateTo = dateTo;
  
  const queryKey = ['orders', queryParams];
  
  // Set up WebSocket event listener to automatically refetch when order events happen
  useWebSocketQuery(queryKey, ['ORDER_CREATED', 'ORDER_UPDATED', 'ORDER_DELETED']);
  
  return useQuery({
    queryKey,
    queryFn: () => orderService.getOrders(queryParams),
    select: (data) => ({
      orders: data.success ? data.data : [],
      pagination: data.pagination || {
        total: 0,
        page: 1,
        limit: 20,
        pages: 1
      }
    }),
    keepPreviousData: true,
    staleTime: 30000, // 30 seconds
  });
};

/**
 * Hook to fetch a single order by ID
 * @param {string} id - Order ID
 * @returns {Object} Query result with order data
 */
export const useOrder = (id) => {
  const queryKey = ['order', id];
  
  // Set up WebSocket event listener for this specific order
  useWebSocketQuery(queryKey, ['ORDER_UPDATED', 'ORDER_DELETED']);
  
  return useQuery({
    queryKey,
    queryFn: () => orderService.getOrder(id),
    select: (data) => data.success ? data.data : null,
    enabled: !!id, // Only run query if ID exists
    staleTime: 60000, // 1 minute
  });
};

/**
 * Hook to create a new order
 */
export const useCreateOrder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (orderData) => orderService.createOrder(orderData),
    onSuccess: (data) => {
      if (data.success) {
        // Invalidate orders list to trigger refetch
        queryClient.invalidateQueries({ queryKey: ['orders'] });
      }
    }
  });
};

/**
 * Hook to update an existing order
 */
export const useUpdateOrder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, orderData }) => orderService.updateOrder(id, orderData),
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['order', variables.id] });
      
      // Snapshot the previous value
      const previousOrder = queryClient.getQueryData(['order', variables.id]);
      
      // Optimistically update to the new value
      if (previousOrder) {
        queryClient.setQueryData(['order', variables.id], {
          ...previousOrder,
          data: { ...previousOrder.data, ...variables.orderData }
        });
      }
      
      return { previousOrder };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, roll back to the previous value
      if (context?.previousOrder) {
        queryClient.setQueryData(['order', variables.id], context.previousOrder);
      }
    },
    onSettled: (data, error, variables) => {
      // Always invalidate to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['order', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    }
  });
};

/**
 * Hook to delete an order
 */
export const useDeleteOrder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id) => orderService.deleteOrder(id),
    onSuccess: (data, id) => {
      if (data.success) {
        // Remove from cache
        queryClient.removeQueries({ queryKey: ['order', id] });
        // Invalidate orders list
        queryClient.invalidateQueries({ queryKey: ['orders'] });
      }
    }
  });
};

/**
 * Hook to get order statistics/metrics
 */
export const useOrderStatistics = (params = {}) => {
  const { period = 'week', platform } = params;
  const queryParams = { period };
  
  if (platform) queryParams.platform = platform;
  
  const queryKey = ['orderStats', queryParams];
  
  // Statistics should be updated when order changes happen
  useWebSocketQuery(['orderStats'], ['ORDER_CREATED', 'ORDER_UPDATED', 'ORDER_DELETED']);
  
  return useQuery({
    queryKey,
    queryFn: () => orderService.getOrderStatistics(queryParams),
    select: (data) => data.success ? data.data : null,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to fetch order history/audit logs
 */
export const useOrderHistory = (orderId) => {
  const queryKey = ['orderHistory', orderId];
  
  return useQuery({
    queryKey,
    queryFn: () => orderService.getOrderHistory(orderId),
    select: (data) => data.success ? data.data : [],
    enabled: !!orderId,
  });
};

/**
 * Hook to process a specific action on an order (e.g., fulfill, cancel)
 */
export const useOrderAction = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, action, data = {} }) => orderService.performOrderAction(id, action, data),
    onSuccess: (data, variables) => {
      if (data.success) {
        // Invalidate specific order and list
        queryClient.invalidateQueries({ queryKey: ['order', variables.id] });
        queryClient.invalidateQueries({ queryKey: ['orders'] });
        queryClient.invalidateQueries({ queryKey: ['orderStats'] });
      }
    }
  });
};

/**
 * Hook to export orders
 */
export const useExportOrders = () => {
  return useMutation({
    mutationFn: (params) => orderService.exportOrders(params)
  });
};

/**
 * Hook to import orders
 */
export const useImportOrders = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (fileData) => orderService.importOrders(fileData),
    onSuccess: (data) => {
      if (data.success) {
        // Invalidate orders list
        queryClient.invalidateQueries({ queryKey: ['orders'] });
        queryClient.invalidateQueries({ queryKey: ['orderStats'] });
      }
    }
  });
};

/**
 * Hook to get order statistics/metrics
 * @param {Object} params - Parameters for filtering statistics
 * @returns {Object} Query result with order statistics
 */
export const useOrderStats = (params = {}) => {
  const { period = 'week', platform } = params;
  const queryParams = { period };
  
  if (platform) queryParams.platform = platform;
  
  const queryKey = ['orderStats', queryParams];
  
  // Statistics should be updated when order changes happen
  useWebSocketQuery(['orderStats'], ['ORDER_CREATED', 'ORDER_UPDATED', 'ORDER_DELETED']);
  
  return useQuery({
    queryKey,
    queryFn: () => orderService.getOrderStatistics(queryParams),
    select: (data) => data.success ? data.data : null,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to sync orders from external platforms
 * @returns {Object} Mutation for syncing orders
 */
export const useOrderSync = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (params) => orderService.syncOrders(params),
    onSuccess: (data) => {
      if (data.success) {
        // Invalidate related queries to reflect new data
        queryClient.invalidateQueries({ queryKey: ['orders'] });
        queryClient.invalidateQueries({ queryKey: ['orderStats'] });
      }
    }
  });
};

/**
 * Hook to fetch order trend data for charts
 * @param {Object} params - Parameters for trend data
 * @returns {Object} Query result with order trend data
 */
export const useOrderTrends = (params = {}) => {
  const { period = 'week', platform, compareWithPrevious = true } = params;
  const queryParams = { period, compareWithPrevious };
  
  if (platform) queryParams.platform = platform;
  
  const queryKey = ['orderTrends', queryParams];
  
  // Set up WebSocket event listener for order changes
  useWebSocketQuery(queryKey, ['ORDER_CREATED', 'ORDER_UPDATED', 'ORDER_DELETED']);
  
  return useQuery({
    queryKey,
    queryFn: () => orderService.getOrderTrends(queryParams),
    select: (data) => data.success ? data.data : null,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

/**
 * Hook to import Hepsiburada orders directly
 */
export const useImportHepsiburadaOrder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ orderData, connectionId }) => 
      orderService.importHepsiburadaOrder(orderData, connectionId),
    onSuccess: (data) => {
      if (data.success) {
        // Invalidate orders list to show the newly imported order
        queryClient.invalidateQueries({ queryKey: ['orders'] });
        queryClient.invalidateQueries({ queryKey: ['orderStats'] });
      }
    }
  });
};