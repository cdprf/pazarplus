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
  const queryClient = useQueryClient();

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