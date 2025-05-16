import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Set auth token in axios headers
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Load user data if token exists
  useEffect(() => {
    const loadUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await axios.get('/auth/me');
        if (res.data.success) {
          setUser(res.data.user);
        } else {
          // Invalid token
          localStorage.removeItem('token');
          setToken(null);
          setError('Session expired. Please login again.');
        }
      } catch (err) {
        console.error('Failed to load user', err);
        localStorage.removeItem('token');
        setToken(null);
        setError('Authentication failed. Please login again.');
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [token]);

  // Login user
  const login = async (email, password) => {
    try {
      setError(null);
      const res = await axios.post('/auth/login', { email, password });
      
      if (res.data.success) {
        localStorage.setItem('token', res.data.token);
        setToken(res.data.token);
        setUser(res.data.user);
        return true;
      } else {
        setError(res.data.message || 'Login failed');
        return false;
      }
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred during login');
      return false;
    }
  };

  // Register user
  const register = async (userData) => {
    try {
      setError(null);
      const res = await axios.post('/auth/register', userData);
      
      if (res.data.success) {
        localStorage.setItem('token', res.data.token);
        setToken(res.data.token);
        setUser(res.data.user);
        return true;
      } else {
        setError(res.data.message || 'Registration failed');
        return false;
      }
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred during registration');
      return false;
    }
  };

  // Logout user
  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  // Update user profile
  const updateProfile = async (userData) => {
    try {
      setError(null);
      const res = await axios.put('/auth/profile', userData);
      
      if (res.data.success) {
        setUser(res.data.user);
        return true;
      } else {
        setError(res.data.message || 'Failed to update profile');
        return false;
      }
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred while updating profile');
      return false;
    }
  };

  // Change password
  const changePassword = async (currentPassword, newPassword) => {
    try {
      setError(null);
      const res = await axios.put('/auth/change-password', { currentPassword, newPassword });
      
      if (res.data.success) {
        return true;
      } else {
        setError(res.data.message || 'Failed to change password');
        return false;
      }
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred while changing password');
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        error,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        updateProfile,
        changePassword,
        setError
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};