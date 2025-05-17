import React, { useEffect, useContext, useCallback, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Spinner } from 'react-bootstrap';
import { AuthContext } from '../../context/AuthContext';

const DevAdmin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { bypassLogin, isAuthenticated } = useContext(AuthContext);
  const [error, setError] = useState(null);
  const [isSettingUp, setIsSettingUp] = useState(true);

  const setupDevMode = useCallback(async () => {
    if (!isSettingUp) return;
    
    try {
      // Check if we're actually in development mode
      if (process.env.NODE_ENV !== 'development') {
        throw new Error('Development mode access denied');
      }

      // Check if dev mode is explicitly enabled
      if (process.env.REACT_APP_DEV_MODE !== 'true') {
        throw new Error('Development mode is not enabled');
      }

      // Verify state parameter to prevent CSRF
      const params = new URLSearchParams(location.search);
      const state = params.get('state');
      const storedState = sessionStorage.getItem('devModeState');
      
      if (!state || state !== storedState) {
        throw new Error('Invalid state parameter');
      }

      await bypassLogin();
      sessionStorage.removeItem('devModeState'); // Clean up
      setIsSettingUp(false);
      
      // Get return URL from state or default to dashboard
      const returnTo = sessionStorage.getItem('devModeReturnTo') || '/dashboard';
      sessionStorage.removeItem('devModeReturnTo'); // Clean up
      
      // Use replace to prevent back navigation after login
      navigate(returnTo, { replace: true });
    } catch (err) {
      console.error('Development mode setup failed:', err);
      setError(err.message);
      setIsSettingUp(false);
      // Redirect to login on error
      navigate('/login', { replace: true });
    }
  }, [bypassLogin, navigate, location, isSettingUp]);

  useEffect(() => {
    setupDevMode();
  }, [setupDevMode]);

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (isAuthenticated && !isSettingUp) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate, isSettingUp]);

  if (error) {
    return (
      <div className="text-center p-5 text-danger">
        <p>Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="text-center p-5">
      <Spinner animation="border" role="status">
        <span className="visually-hidden">Setting up development mode...</span>
      </Spinner>
      <p className="mt-2">Setting up development mode...</p>
    </div>
  );
};

export default DevAdmin;