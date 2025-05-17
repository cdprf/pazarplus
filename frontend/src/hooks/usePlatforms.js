import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import platformService from '../services/api/platformService';

// Query key prefixes for better organization
const QUERY_KEYS = {
  platforms: 'platforms',
  platformById: 'platformById',
  platformStatus: 'platformStatus',
};

/**
 * Hook to fetch all platform connections for the current user
 * @param {Object} options - React Query options
 * @returns {Object} React Query result object
 */
export const usePlatformConnections = (options = {}) => {
  return useQuery({
    queryKey: [QUERY_KEYS.platforms],
    queryFn: () => platformService.getPlatformConnections(),
    ...options
  });
};

/**
 * Hook to fetch a specific platform connection by ID
 * @param {string} platformId - Platform connection ID
 * @param {Object} options - React Query options
 * @returns {Object} React Query result object
 */
export const usePlatformConnection = (platformId, options = {}) => {
  return useQuery({
    queryKey: [QUERY_KEYS.platformById, platformId],
    queryFn: () => platformService.getPlatformConnection(platformId),
    enabled: !!platformId,
    ...options
  });
};

/**
 * Hook to check the connection status of a specific platform
 * @param {string} platformId - Platform connection ID
 * @param {Object} options - React Query options
 * @returns {Object} React Query result object
 */
export const usePlatformStatus = (platformId, options = {}) => {
  return useQuery({
    queryKey: [QUERY_KEYS.platformStatus, platformId],
    queryFn: () => platformService.checkPlatformStatus(platformId),
    enabled: !!platformId,
    // Default shorter stale time for status checks
    staleTime: 1000 * 60, // 1 minute
    ...options
  });
};

/**
 * Hook to add a new platform connection
 * @returns {Object} React Query mutation result
 */
export const useAddPlatformConnection = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (connectionData) => platformService.addPlatformConnection(connectionData),
    onSuccess: () => {
      // Invalidate platforms list to refetch with new data
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.platforms] });
    }
  });
};

/**
 * Hook to update an existing platform connection
 * @returns {Object} React Query mutation result
 */
export const useUpdatePlatformConnection = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ platformId, connectionData }) => 
      platformService.updatePlatformConnection(platformId, connectionData),
    onSuccess: (_, variables) => {
      // Invalidate the specific platform and the list
      queryClient.invalidateQueries({ 
        queryKey: [QUERY_KEYS.platformById, variables.platformId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: [QUERY_KEYS.platforms] 
      });
    }
  });
};

/**
 * Hook to delete a platform connection
 * @returns {Object} React Query mutation result
 */
export const useDeletePlatformConnection = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (platformId) => platformService.deletePlatformConnection(platformId),
    onSuccess: (_, platformId) => {
      // Remove from cache and invalidate the list
      queryClient.removeQueries({ 
        queryKey: [QUERY_KEYS.platformById, platformId] 
      });
      queryClient.removeQueries({
        queryKey: [QUERY_KEYS.platformStatus, platformId]
      });
      queryClient.invalidateQueries({ 
        queryKey: [QUERY_KEYS.platforms] 
      });
    }
  });
};

/**
 * Hook to trigger a sync for a platform connection
 * @returns {Object} React Query mutation result
 */
export const useSyncPlatform = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (platformId) => platformService.syncPlatformData(platformId),
    onSuccess: (_, platformId) => {
      // Refresh platform status
      queryClient.invalidateQueries({ 
        queryKey: [QUERY_KEYS.platformStatus, platformId] 
      });
    }
  });
};