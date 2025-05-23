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

  useEffect(() => {
    checkUserLoggedIn();
  }, []);

  // Register user
  const register = async (userData) => {
    try {
      setError(null);
      const res = await axios.post('/api/v1/auth/register', userData);
      
      if (res.data.success) {
        setIsAuthenticated(true);
        setUser(res.data.user);
        router.push('/verification-sent');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Login user
  const login = async ({ email, password }) => {
    try {
      setError(null);
      const res = await axios.post('/api/v1/auth/login', { email, password });
      
      if (res.data.success) {
        setIsAuthenticated(true);
        checkUserLoggedIn();
        router.push('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials');
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Logout user
  const logout = async () => {
    try {
      await axios.get('/api/v1/auth/logout');
      setIsAuthenticated(false);
      setUser(null);
      router.push('/');
    } catch (err) {
      console.error(err);
    }
  };

  // Check if user is logged in
  const checkUserLoggedIn = async () => {
    try {
      const res = await axios.get('/api/v1/auth/me');
      if (res.data.success) {
        setIsAuthenticated(true);
        setUser(res.data.data);
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (err) {
      setIsAuthenticated(false);
      setUser(null);
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
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
