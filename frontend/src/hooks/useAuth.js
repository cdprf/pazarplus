import { useContext, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AuthContext } from '../context/AuthContext';

export const useAuth = () => {
  const authContext = useContext(AuthContext);
  const queryClient = useQueryClient();

  const logout = useCallback(() => {
    // Clear all query cache when logging out
    queryClient.clear();
    authContext.logout();
  }, [authContext, queryClient]);

  return {
    ...authContext,
    logout
  };
};