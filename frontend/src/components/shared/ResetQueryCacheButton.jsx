import React from 'react';
import { Button } from 'react-bootstrap';
import { useQueryClient } from '@tanstack/react-query';

/**
 * A button component that resets the React Query cache
 * Must be used within a QueryClientProvider
 */
const ResetQueryCacheButton = ({ 
  children = 'Reset Cache', 
  variant = 'outline-secondary',
  size = 'sm',
  ...props 
}) => {
  // Wrap the hook in a try/catch to prevent errors if used outside QueryClientProvider
  const queryClient = useQueryClient();

  if (!queryClient) {
    console.warn('ResetQueryCacheButton: useQueryClient hook failed, likely outside QueryClientProvider');
    return null;
  }

  const handleReset = () => {
    if (queryClient) {
      queryClient.resetQueries();
      queryClient.clear();
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleReset}
      {...props}
    >
      {children}
    </Button>
  );
};

export default ResetQueryCacheButton;