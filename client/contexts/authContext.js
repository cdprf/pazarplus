import { createContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const router = useRouter();

  // Check if user is logged in
  useEffect(() => {
    checkUserLoggedIn();
  }, []);

  // Register user
  const register = async (userData) => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await axios.post('/api/v1/auth/register', userData);
      
      if (res.data.success) {
        router.push('/verify-email');
      }
      
      return res.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong with registration');
    } finally {
      setLoading(false);
    }
  };

  // Login user
  const login = async ({ email, password }) => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await axios.post('/api/v1/auth/login', { email, password });
      
      if (res.data.success) {
        await checkUserLoggedIn();
        router.push('/dashboard');
      }
      
      return res.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  // Logout user
  const logout = async () => {
    try {
      await axios.get('/api/v1/auth/logout');
      setUser(null);
      setIsAuthenticated(false);
      router.push('/');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Check if user is logged in
  const checkUserLoggedIn = async () => {
    try {
      const res = await axios.get('/api/v1/auth/me');
      if (res.data.success) {
        setUser(res.data.data);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (err) {
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };
  
  // Forgot password
  const forgotPassword = async (email) => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await axios.post('/api/v1/auth/forgot-password', { email });
      return res.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Error processing your request');
    } finally {
      setLoading(false);
    }
  };
  
  // Reset password
  const resetPassword = async (resetToken, password) => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await axios.put(`/api/v1/auth/reset-password/${resetToken}`, {
        password
      });
      
      return res.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Error resetting password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        loading,
        error,
        register,
        login,
        logout,
        forgotPassword,
        resetPassword
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
