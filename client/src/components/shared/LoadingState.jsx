import React from 'react';
import { Spinner } from 'react-bootstrap';
import PropTypes from 'prop-types';

const LoadingState = ({ 
  loading, 
  error, 
  children, 
  loadingMessage = 'Loading...', 
  errorFallback,
  spinnerVariant = 'primary',
  center = true 
}) => {
  if (loading) {
    return (
      <div className={`p-4 ${center ? 'text-center' : ''}`}>
        <Spinner animation="border" role="status" variant={spinnerVariant}>
          <span className="visually-hidden">{loadingMessage}</span>
        </Spinner>
        {loadingMessage && <p className="mt-2">{loadingMessage}</p>}
      </div>
    );
  }

  if (error) {
    // Convert error object to string if necessary
    const errorMessage = typeof error === 'object' 
      ? (error instanceof Error ? error.message : JSON.stringify(error)) 
      : error;
      
    return errorFallback || (
      <div className={`p-4 ${center ? 'text-center' : ''}`}>
        <div className="text-danger">
          <p>{errorMessage}</p>
        </div>
      </div>
    );
  }

  return children;
};

LoadingState.propTypes = {
  loading: PropTypes.bool.isRequired,
  error: PropTypes.string,
  children: PropTypes.node.isRequired,
  loadingMessage: PropTypes.string,
  errorFallback: PropTypes.node,
  spinnerVariant: PropTypes.string,
  center: PropTypes.bool
};

export default LoadingState;