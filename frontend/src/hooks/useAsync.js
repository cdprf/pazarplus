import { useState, useCallback } from 'react';
import { ApiError } from '../utils/apiErrorHandler';

export const useAsync = (asyncFunction, options = {}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const execute = useCallback(async (...args) => {
    try {
      if (options.showLoading !== false) {
        setLoading(true);
      }
      setError(null);
      
      const result = await asyncFunction(...args);
      setData(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof ApiError 
        ? err.message 
        : 'An unexpected error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      if (options.showLoading !== false) {
        setLoading(false);
      }
    }
  }, [asyncFunction, options.showLoading]);

  return {
    loading,
    error,
    data,
    execute,
    setError,
    setData
  };
};