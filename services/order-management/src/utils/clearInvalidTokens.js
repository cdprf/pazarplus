// Utility to handle invalid token cleanup on client side
const clearInvalidTokens = () => {
  if (typeof window !== 'undefined') {
    // Clear localStorage tokens
    localStorage.removeItem('token');
    localStorage.removeItem('authToken');
    localStorage.removeItem('jwt');
    
    // Clear cookies
    document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'authToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    
    // Redirect to login
    window.location.href = '/login';
  }
};

module.exports = { clearInvalidTokens };
