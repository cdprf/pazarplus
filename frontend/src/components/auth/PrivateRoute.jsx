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
  
  // Simplified dev mode check - if we're in dev mode and user has devMode flag set
  const isDevUser = user?.devMode === true;
  const bypassAuth = isDev && isDevMode && isDevUser;

  // Generate state parameter for dev mode authentication
  useEffect(() => {
    if (isDev && isDevMode && !isAuthenticated) {
      // Store the current path to redirect back after auth
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

  // We no longer need to verify specific permissions in dev mode
  // Just accept any authenticated dev user
  
  return children;
};

export default PrivateRoute;