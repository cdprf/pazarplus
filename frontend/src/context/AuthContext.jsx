import React, { createContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { useNavigate } from 'react-router-dom';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshPromise = React.useRef(null);
  const navigate = useNavigate();

  const refreshAccessToken = useCallback(async () => {
    // Ensure we only make one refresh request at a time
    if (refreshPromise.current) {
      return refreshPromise.current;
    }

    try {
      setIsRefreshing(true);
      const refreshToken = localStorage.getItem('refreshToken');
      
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      refreshPromise.current = axios.post('/auth/refresh-token', { refreshToken });
      const response = await refreshPromise.current;

      if (response.data.success) {
        const { token, refreshToken: newRefreshToken } = response.data;
        localStorage.setItem('token', token);
        localStorage.setItem('refreshToken', newRefreshToken);
        
        // Update axios default header
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        // Update user state
        setCurrentUser(jwtDecode(token));
        setError(null);
        return token;
      } else {
        throw new Error(response.data.message || 'Failed to refresh token');
      }
    } catch (err) {
      // If refresh fails, log the user out
      console.error('Failed to refresh token:', err);
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      setCurrentUser(null);
      setError('Session expired. Please login again.');
      navigate('/login');
      throw err;
    } finally {
      setIsRefreshing(false);
      refreshPromise.current = null;
    }
  }, [navigate]);

  // Setup axios interceptor for token refresh
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        // If error is 401 and not from the auth endpoints and not already retried
        if (
          error.response?.status === 401 &&
          !originalRequest._retry &&
          !originalRequest.url?.includes('/auth/login') &&
          !originalRequest.url?.includes('/auth/refresh-token')
        ) {
          originalRequest._retry = true;
          
          try {
            const token = await refreshAccessToken();
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            return axios(originalRequest);
          } catch (refreshError) {
            // Let the error propagate after failed refresh
            return Promise.reject(refreshError);
          }
        }
        
        return Promise.reject(error);
      }
    );

    return () => {
      // Clean up interceptor on unmount
      axios.interceptors.response.eject(interceptor);
    };
  }, [refreshAccessToken]);

  // Check for existing token on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        if (token) {
          // Verify token has the correct format before decoding
          if (token === 'dev-admin-token' || token === 'dev-mode-token') {
            // Handle dev tokens differently
            const devUser = {
              id: 'dev-user-id',
              email: 'dev@example.com',
              fullName: 'Development User',
              devMode: true,
              permissions: ['view_dashboard', 'admin', 'edit_orders', 'view_orders'],
              exp: Math.floor(Date.now() / 1000) + 86400 // Expires in 24 hours
            };
            setCurrentUser(devUser);
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          } else if (token.split('.').length === 3) {
            // Only attempt to decode valid JWT tokens (should have 3 parts)
            const decodedToken = jwtDecode(token);
            const currentTime = Date.now() / 1000;
            
            if (decodedToken.exp < currentTime) {
              // Token is expired, try to refresh
              await refreshAccessToken();
            } else {
              // Token is valid
              setCurrentUser(decodedToken);
              axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            }
          } else {
            // Invalid token format
            throw new Error('Invalid token format');
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        // Clear invalid auth state
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        setCurrentUser(null);
        setError('Authentication failed. Please login again.');
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, [refreshAccessToken]);

  const login = useCallback(async (credentials) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.post('/auth/login', credentials);
      
      if (response.data.success) {
        const { token, refreshToken } = response.data;
        localStorage.setItem('token', token);
        localStorage.setItem('refreshToken', refreshToken);
        
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        const user = jwtDecode(token);
        setCurrentUser(user);
        navigate('/dashboard');
        return true;
      } else {
        setError(response.data.message || 'Login failed');
        return false;
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Login failed';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const register = useCallback(async (userData) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.post('/auth/register', userData);
      
      if (response.data.success) {
        // Automatically log in after registration
        await login({
          email: userData.email,
          password: userData.password
        });
        return true;
      } else {
        setError(response.data.message || 'Registration failed');
        return false;
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Registration failed';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [login]);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    delete axios.defaults.headers.common['Authorization'];
    setCurrentUser(null);
    navigate('/login');
  }, [navigate]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);
  
  // Development mode bypass login
  const bypassLogin = useCallback(async () => {
    // Only allow in development mode
    if (process.env.NODE_ENV !== 'development' || process.env.REACT_APP_DEV_MODE !== 'true') {
      setError('Development mode access denied');
      return false;
    }
    
    try {
      setLoading(true);
      
      // Create a fake development user with necessary permissions
      const devUser = {
        id: 'dev-user-id',
        email: 'dev@example.com',
        fullName: 'Development User',
        devMode: true,
        permissions: ['view_dashboard', 'admin', 'edit_orders', 'view_orders'],
        exp: Math.floor(Date.now() / 1000) + 86400 // Expires in 24 hours
      };
      
      // Store fake token in localStorage
      const fakeToken = 'dev-mode-token';
      localStorage.setItem('token', fakeToken);
      localStorage.setItem('refreshToken', 'dev-mode-refresh-token');
      
      // Set axios headers for API calls
      axios.defaults.headers.common['Authorization'] = `Bearer ${fakeToken}`;
      // Add development mode header
      axios.defaults.headers.common['x-dev-mode'] = 'true';
      
      // Set current user
      setCurrentUser(devUser);
      
      return true;
    } catch (err) {
      console.error('Development bypass login failed:', err);
      setError('Development mode login failed');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const value = {
    currentUser,
    isAuthenticated: !!currentUser,
    loading,
    error,
    login,
    register,
    logout,
    clearError,
    refreshToken: refreshAccessToken,
    bypassLogin
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};