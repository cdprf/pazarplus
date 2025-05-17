// frontend/src/components/auth/PrivateRoute.jsx

import React, { useContext, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Spinner } from 'react-bootstrap';
import { AuthContext } from '../../context/AuthContext';

const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading, user } = useContext(AuthContext);
  const location = useLocation();

  // Check development mode security
  const isDev = process.env.NODE_ENV === 'development';
  const isDevMode = process.env.REACT_APP_DEV_MODE === 'true';
  const isDevUser = user?.devMode === true;
  const hasValidDevPermissions = user?.permissions?.length > 0;
  const bypassAuth = isDev && isDevMode && isDevUser && hasValidDevPermissions;

  // Generate state parameter for dev mode authentication
  useEffect(() => {
    if (isDev && isDevMode && !isAuthenticated) {
      const state = btoa(crypto.getRandomValues(new Uint8Array(16)));
      sessionStorage.setItem('devModeState', state);
      sessionStorage.setItem('devModeReturnTo', location.pathname);
    }
  }, [isDev, isDevMode, isAuthenticated, location]);

  if (loading) {
    return (
      <div className="text-center p-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
        <p className="mt-2">Authenticating...</p>
      </div>
    );
  }

  if (!isAuthenticated && !bypassAuth) {
    // Store the attempted URL for redirecting after login
    sessionStorage.setItem('returnTo', location.pathname);
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // For dev mode, verify required permissions exist
  if (bypassAuth && !user?.permissions?.includes('view_dashboard')) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default PrivateRoute;