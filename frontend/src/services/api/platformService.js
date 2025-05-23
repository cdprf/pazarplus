import axios from 'axios';
import { handleApiError } from '../../utils/apiErrorHandler';

// Use environment variable or fall back to the correct backend URL (port 3001)
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
const BASE_URL = `${API_URL}/platforms`;

// Add development mode headers when in development environment
const getHeaders = () => {
  // Start with default headers
  const headers = {};
  
  // Add authentication token from localStorage if available
  const token = localStorage.getItem('token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return { headers };
};

/**
 * Service for platform connection operations
 */
const platformService = {
  /**
   * Get all platform connections for the current user
   * @returns {Promise} Promise with platform connections data
   */
  getPlatformConnections: async () => {
    try {
      const response = await axios.get(BASE_URL, getHeaders());
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Get a specific platform connection by ID
   * @param {string} platformId - Platform connection ID
   * @returns {Promise} Promise with platform connection data
   */
  getPlatformConnection: async (platformId) => {
    try {
      const response = await axios.get(`${BASE_URL}/${platformId}`, getHeaders());
      return response.data;
    } catch (error) {
      throw handleApiError(error, 'Failed to fetch platform connection details');
    }
  },

  /**
   * Check the connection status of a specific platform
   * @param {string} platformId - Platform connection ID
   * @returns {Promise} Promise with platform status data
   */
  checkPlatformStatus: async (platformId) => {
    try {
      const response = await axios.get(`${BASE_URL}/${platformId}/status`, getHeaders());
      return response.data;
    } catch (error) {
      throw handleApiError(error, 'Failed to check platform status');
    }
  },

  /**
   * Add a new platform connection
   * @param {Object} connectionData - Platform connection details
   * @returns {Promise} Promise with created platform connection
   */
  addPlatformConnection: async (connectionData) => {
    try {
      const response = await axios.post(BASE_URL, connectionData, getHeaders());
      return response.data;
    } catch (error) {
      throw handleApiError(error, 'Failed to add platform connection');
    }
  },

  /**
   * Update an existing platform connection
   * @param {string} platformId - Platform connection ID
   * @param {Object} connectionData - Updated platform connection details
   * @returns {Promise} Promise with updated platform connection
   */
  updatePlatformConnection: async (platformId, connectionData) => {
    try {
      const response = await axios.put(`${BASE_URL}/${platformId}`, connectionData, getHeaders());
      return response.data;
    } catch (error) {
      throw handleApiError(error, 'Failed to update platform connection');
    }
  },

  /**
   * Delete a platform connection
   * @param {string} platformId - Platform connection ID
   * @returns {Promise} Promise with deletion result
   */
  deletePlatformConnection: async (platformId) => {
    try {
      const response = await axios.delete(`${BASE_URL}/${platformId}`, getHeaders());
      return response.data;
    } catch (error) {
      throw handleApiError(error, 'Failed to delete platform connection');
    }
  },

  /**
   * Trigger a manual sync for a platform
   * @param {string} platformId - Platform connection ID
   * @returns {Promise} Promise with sync result
   */
  syncPlatformData: async (platformId) => {
    try {
      const response = await axios.post(`${BASE_URL}/${platformId}/sync`, null, getHeaders());
      return response.data;
    } catch (error) {
      throw handleApiError(error, 'Failed to sync platform data');
    }
  },

  /**
   * Get available platform integration options
   * @returns {Promise} Promise with available platforms data
   */
  getAvailablePlatforms: async () => {
    try {
      const response = await axios.get(`${BASE_URL}/available`, getHeaders());
      return response.data;
    } catch (error) {
      throw handleApiError(error, 'Failed to fetch available platforms');
    }
  },
};

export default platformService;
export { platformService };