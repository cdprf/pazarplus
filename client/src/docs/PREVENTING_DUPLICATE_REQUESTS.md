# Preventing Duplicate Requests

We've noticed duplicate requests in our application, particularly for `/api/auth/me` endpoints. Here are guidelines to prevent these issues:

## React Query Configuration

Ensure your `QueryClient` is properly configured:

```javascript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000, // 30 seconds before data is considered stale
      cacheTime: 300000, // Cache persists for 5 minutes
      refetchOnWindowFocus: false, // Prevent refetch on window focus
      retry: 1, // Limit retry attempts
    },
  },
});
```

## Centralized Authentication State

Create a single source of truth for auth state:

```javascript
// src/hooks/useAuth.js
import { useQuery } from 'react-query';
import api from '../services/api';

export function useAuth() {
  const { data: user, isLoading, error, refetch } = useQuery(
    ['auth', 'currentUser'], 
    async () => {
      const res = await api.get('/api/auth/me');
      return res.data.data || res.data.user;
    },
    {
      staleTime: 60000, // 1 minute
      cacheTime: 600000, // 10 minutes
      retry: false,
    }
  );

  const isAuthenticated = !!user;
  
  return {
    user,
    isAuthenticated,
    isLoading,
    // ...other auth methods
  };
}
```

## Component Best Practices

1. **Use Context for Auth State**: Wrap your app in an AuthContext that uses the hook above
2. **Avoid Direct API Calls**: Always use the centralized hook instead of direct API calls
3. **Check Component Re-rendering**: Use React DevTools to identify components that re-render excessively
4. **Use React.memo**: Memoize components to prevent unnecessary re-renders
