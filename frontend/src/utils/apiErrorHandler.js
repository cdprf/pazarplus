// This file handles API errors in a consistent way
// axios is not used directly in this file

export class ApiError extends Error {
  constructor(message, statusCode, errors = []) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

export const handleApiError = (error) => {
  console.error('API Error:', error);
  
  // Handle axios error response
  if (error.response) {
    const { data, status } = error.response;
    
    // Handle validation errors
    if (status === 400 && data.errors) {
      return new ApiError(
        data.message || 'Validation error',
        status,
        data.errors
      );
    }
    
    // Handle unauthorized errors
    if (status === 401) {
      return new ApiError(
        data.message || 'Unauthorized access',
        status
      );
    }
    
    // Handle forbidden errors
    if (status === 403) {
      return new ApiError(
        data.message || 'Access forbidden',
        status
      );
    }
    
    // Handle not found errors
    if (status === 404) {
      return new ApiError(
        data.message || 'Resource not found',
        status
      );
    }
    
    // Handle rate limit errors
    if (status === 429) {
      return new ApiError(
        data.message || 'Too many requests. Please try again later.',
        status
      );
    }
    
    // Handle server errors
    if (status >= 500) {
      return new ApiError(
        data.message || 'Server error. Please try again later.',
        status
      );
    }
    
    // Handle other API errors
    return new ApiError(
      data.message || 'API request failed',
      status,
      data.errors
    );
  }
  
  // Handle network errors
  if (error.request) {
    return new ApiError(
      'Unable to connect to server. Please check your internet connection.',
      0
    );
  }
  
  // Handle other errors
  return new ApiError(
    error.message || 'An unexpected error occurred',
    500
  );
};