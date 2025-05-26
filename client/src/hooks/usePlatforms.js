import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export const usePlatforms = () => {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPlatforms = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🔍 Fetching platforms...');
      
      // Use the new platform-specific API method
      const response = await api.platforms.getConnections();
      
      console.log('✅ Platforms fetched successfully:', response);
      
      // Handle the response structure from the backend
      const platforms = response.success ? response.data : response;
      
      // Ensure we have an array and validate the data structure
      const validatedPlatforms = Array.isArray(platforms) ? platforms.map(platform => ({
        ...platform,
        // Ensure required fields have defaults
        id: platform.id || null,
        name: platform.name || 'Unnamed Connection',
        platformType: platform.platformType || 'unknown',
        status: platform.status || 'unknown',
        environment: platform.environment || 'production',
        isActive: platform.isActive !== false,
        createdAt: platform.createdAt || new Date().toISOString(),
        updatedAt: platform.updatedAt || platform.createdAt || new Date().toISOString(),
        lastSyncAt: platform.lastSyncAt || null,
        lastTestedAt: platform.lastTestedAt || null,
        errorCount: platform.errorCount || 0,
        credentials: platform.credentials || {}
      })) : [];
      
      setData(validatedPlatforms);
      
    } catch (err) {
      console.error('❌ Failed to fetch platforms:', err);
      setError(err);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlatforms();
  }, [fetchPlatforms]);

  const refetch = useCallback(() => {
    console.log('🔄 Refetching platforms...');
    fetchPlatforms();
  }, [fetchPlatforms]);

  // Additional helper methods
  const createConnection = useCallback(async (connectionData) => {
    try {
      const response = await api.platforms.createConnection(connectionData);
      await refetch(); // Refresh the list
      return response;
    } catch (error) {
      console.error('❌ Failed to create platform connection:', error);
      throw error;
    }
  }, [refetch]);

  const updateConnection = useCallback(async (id, updates) => {
    try {
      const response = await api.platforms.updateConnection(id, updates);
      await refetch(); // Refresh the list
      return response;
    } catch (error) {
      console.error('❌ Failed to update platform connection:', error);
      throw error;
    }
  }, [refetch]);

  const deleteConnection = useCallback(async (id) => {
    try {
      const response = await api.platforms.deleteConnection(id);
      await refetch(); // Refresh the list
      return response;
    } catch (error) {
      console.error('❌ Failed to delete platform connection:', error);
      throw error;
    }
  }, [refetch]);

  const testConnection = useCallback(async (id) => {
    try {
      const response = await api.platforms.testConnection(id);
      await refetch(); // Refresh to get updated status
      return response;
    } catch (error) {
      console.error('❌ Failed to test platform connection:', error);
      throw error;
    }
  }, [refetch]);

  return { 
    data, 
    isLoading, 
    error, 
    refetch,
    createConnection,
    updateConnection,
    deleteConnection,
    testConnection
  };
};

export default usePlatforms;
