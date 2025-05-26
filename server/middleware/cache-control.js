const setCacheControl = (req, res, next) => {
  // For auth/me endpoint - use longer cache with revalidation
  if (req.path.includes('/auth/me')) {
    // Increase to 60 seconds with 5 minute stale time to prevent frequent refetches
    res.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=300');
    // Add Vary header to ensure proper caching with auth headers
    res.set('Vary', 'Authorization');
  } 
  else if (req.path.includes('/platforms') || req.path.includes('/orders/stats')) {
    // Slightly longer cache for semi-static data
    res.set('Cache-Control', 'private, max-age=120, stale-while-revalidate=600');
  } 
  else if (req.method === 'GET') {
    // Default cache for GET requests
    res.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');
  } 
  else {
    // No cache for mutations
    res.set('Cache-Control', 'no-store');
  }
  
  // Add strong ETag support
  res.set('ETag', true);
  
  next();
};

module.exports = { setCacheControl };
