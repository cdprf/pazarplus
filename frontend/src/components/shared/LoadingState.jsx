import React, { useState, useEffect } from 'react';
import { Spinner, Alert } from 'react-bootstrap';
import PropTypes from 'prop-types';

const LoadingState = ({ 
  loading, 
  error, 
  children, 
  loadingMessage = 'Loading...', 
  errorFallback,
  spinnerVariant = 'primary',
  center = true,
  delay = 300 // Delay before showing spinner to prevent flickering
}) => {
  const [showSpinner, setShowSpinner] = useState(false);
  
  // Show spinner after delay to prevent flickering for fast operations
  useEffect(() => {
    let timer;
    if (loading) {
      timer = setTimeout(() => setShowSpinner(true), delay);
    } else {
      setShowSpinner(false);
    }
    
    return () => {
      clearTimeout(timer);
    };
  }, [loading, delay]);
  
  if (loading) {
    return (
      <div 
        className={`loading-container p-4 ${center ? 'text-center' : ''}`}
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        {showSpinner && (
          <>
            <Spinner animation="border" variant={spinnerVariant}>
              <span className="visually-hidden">{loadingMessage}</span>
            </Spinner>
            {loadingMessage && <p className="mt-2 loading-text">{loadingMessage}</p>}
          </>
        )}
      </div>
    );
  }

  if (error) {
    // Convert error object to string if necessary
    const errorMessage = typeof error === 'object' 
      ? (error instanceof Error ? error.message : JSON.stringify(error)) 
      : error;
      
    return errorFallback || (
      <Alert 
        variant="danger" 
        className={`${center ? 'text-center' : ''}`}
        role="alert"
        aria-live="assertive"
      >
        <p className="mb-0">{errorMessage}</p>
      </Alert>
    );
  }

  return children;
};

LoadingState.propTypes = {
  loading: PropTypes.bool.isRequired,
  error: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  children: PropTypes.node.isRequired,
  loadingMessage: PropTypes.string,
  errorFallback: PropTypes.node,
  spinnerVariant: PropTypes.string,
  center: PropTypes.bool,
  delay: PropTypes.number
};

export default LoadingState;