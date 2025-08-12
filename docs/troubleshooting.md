# Troubleshooting Guide

![Status](https://img.shields.io/badge/diagnostics-comprehensive-blue.svg)
![Support](https://img.shields.io/badge/support-24%2F7-success.svg)
![Response](https://img.shields.io/badge/response%20time-%3C%205min-brightgreen.svg)

Comprehensive troubleshooting guide for resolving common issues in the Pazar+ Platform.

## Quick Diagnostic Checklist

Before diving into specific issues, run through this quick checklist:

### System Health Check
```bash
# Check system status
curl -s http://localhost:3000/api/health | jq '.'

# Expected response:
{
  "status": "healthy",
  "database": "connected",
  "redis": "connected",
  "uptime": "2h 15m 30s",
  "memory_usage": "45%",
  "cpu_usage": "23%"
}
```

### Authentication Test
```javascript
// Test authentication
const testAuth = async () => {
  try {
    const response = await fetch('/api/auth/verify', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    
    if (response.ok) {
      console.log('Authentication working');
    } else {
      console.log('Authentication failed');
    }
  } catch (error) {
    console.log('Network error:', error.message);
  }
};
```

### Platform Connectivity Test
```javascript
// Test platform connections
const testPlatforms = async () => {
  const platforms = ['trendyol', 'hepsiburada', 'n11'];
  
  for (const platform of platforms) {
    try {
      const response = await fetch(`/api/platforms/${platform}/test`);
      const result = await response.json();
      console.log(`${platform}: ${result.status}`);
    } catch (error) {
      console.log(`${platform}: Error - ${error.message}`);
    }
  }
};
```

## Authentication Issues

### Problem: Login Fails with Valid Credentials

#### Symptoms
- Error message: "Invalid email or password"
- Account locks after multiple attempts
- Login form doesn't respond

#### Causes & Solutions

**1. Password Issues**
```javascript
// Check password requirements
const validatePassword = (password) => {
  const requirements = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumbers: /\d/.test(password),
    hasSpecialChars: /[!@#$%^&*]/.test(password)
  };
  
  return Object.entries(requirements).filter(([key, valid]) => !valid);
};

// Usage
const failedRequirements = validatePassword('yourpassword');
if (failedRequirements.length > 0) {
  console.log('Password fails requirements:', failedRequirements);
}
```

**2. Account Status Issues**
- Check if account is active
- Verify email address is confirmed
- Contact admin if account is suspended

**3. Browser/Cache Issues**
```javascript
// Clear authentication data
localStorage.removeItem('token');
sessionStorage.clear();

// Clear browser cache
// Chrome: Ctrl+Shift+Delete
// Firefox: Ctrl+Shift+Delete
// Safari: Cmd+Option+E
```

### Problem: Token Expiration Issues

#### Symptoms
- Frequent logouts
- "Unauthorized" errors during API calls
- Session timeouts

#### Solutions

**1. Implement Token Refresh**
```javascript
class AuthManager {
  constructor() {
    this.token = localStorage.getItem('token');
    this.refreshToken = localStorage.getItem('refreshToken');
  }
  
  async refreshAuthToken() {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshToken })
      });
      
      if (response.ok) {
        const { token, refreshToken } = await response.json();
        localStorage.setItem('token', token);
        localStorage.setItem('refreshToken', refreshToken);
        return token;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.logout();
    }
  }
  
  async makeAuthenticatedRequest(url, options = {}) {
    let response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${this.token}`
      }
    });
    
    if (response.status === 401) {
      // Try to refresh token
      const newToken = await this.refreshAuthToken();
      if (newToken) {
        // Retry request with new token
        response = await fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            'Authorization': `Bearer ${newToken}`
          }
        });
      }
    }
    
    return response;
  }
}
```

**2. Monitor Token Status**
```javascript
// Check token validity
const checkTokenValidity = async () => {
  try {
    const response = await fetch('/api/auth/verify', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    
    if (!response.ok) {
      console.log('Token invalid, redirecting to login');
      window.location.href = '/login';
    }
  } catch (error) {
    console.error('Token verification failed:', error);
  }
};

// Check every 5 minutes
setInterval(checkTokenValidity, 5 * 60 * 1000);
```

## Platform Connection Issues

### Problem: Platform API Connection Failures

#### Symptoms
- "Connection timeout" errors
- "Invalid credentials" messages
- Sync processes fail to start

#### Diagnostic Steps

**1. Test Network Connectivity**
```bash
# Test platform endpoints
curl -v https://api.trendyol.com/health
curl -v https://api.hepsiburada.com/status
curl -v https://api.n11.com/ping

# Check DNS resolution
nslookup api.trendyol.com
nslookup api.hepsiburada.com
```

**2. Verify API Credentials**
```javascript
// Test platform credentials
const testPlatformCredentials = async (platform, credentials) => {
  const endpoints = {
    trendyol: 'https://api.trendyol.com/sapigw/suppliers/check-credentials',
    hepsiburada: 'https://api.hepsiburada.com/auth/validate',
    n11: 'https://api.n11.com/authenticate'
  };
  
  try {
    const response = await fetch(endpoints[platform], {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${credentials.apiKey}`
      },
      body: JSON.stringify(credentials)
    });
    
    return {
      platform,
      status: response.ok ? 'valid' : 'invalid',
      statusCode: response.status
    };
  } catch (error) {
    return {
      platform,
      status: 'error',
      error: error.message
    };
  }
};
```

**3. Check Rate Limiting**
```javascript
// Monitor rate limit headers
const checkRateLimit = (response) => {
  const headers = {
    limit: response.headers.get('X-RateLimit-Limit'),
    remaining: response.headers.get('X-RateLimit-Remaining'),
    reset: response.headers.get('X-RateLimit-Reset')
  };
  
  if (headers.remaining < 10) {
    console.warn('⚠️  Rate limit approaching:', headers);
  }
  
  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After');
    console.error('🚫 Rate limited. Retry after:', retryAfter, 'seconds');
  }
  
  return headers;
};
```

#### Solutions

**1. Credential Issues**
- Verify API keys haven't expired
- Check seller/merchant ID accuracy
- Regenerate credentials if necessary
- Ensure proper permissions are granted

**2. Network Issues**
```javascript
// Implement retry logic with exponential backoff
class RetryHandler {
  static async withRetry(fn, maxRetries = 3, baseDelay = 1000) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        
        const delay = baseDelay * Math.pow(2, i);
        console.log(`Retry ${i + 1}/${maxRetries} in ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
}

// Usage
const fetchWithRetry = () => 
  RetryHandler.withRetry(() => fetch('/api/platform-data'));
```

**3. Proxy/Firewall Issues**
```bash
# Check if proxy is required
echo $HTTP_PROXY
echo $HTTPS_PROXY

# Test direct connection vs proxy
curl --noproxy "*" https://api.trendyol.com
curl https://api.trendyol.com
```

### Problem: Sync Process Failures

#### Symptoms
- Sync gets stuck at specific percentage
- "No data received" errors
- Partial data synchronization

#### Diagnostic Tools

**1. Sync Progress Monitor**
```javascript
// Monitor sync progress
const monitorSync = (connectionId) => {
  const eventSource = new EventSource(`/api/sync/${connectionId}/progress`);
  
  eventSource.onmessage = (event) => {
    const progress = JSON.parse(event.data);
    console.log(`Progress: ${progress.percentage}%`);
    console.log(`Current: ${progress.current_operation}`);
    console.log(`Errors: ${progress.error_count}`);
    
    if (progress.status === 'stalled') {
      console.error('⚠️  Sync appears to be stalled');
      eventSource.close();
    }
  };
  
  eventSource.onerror = (error) => {
    console.error('❌ Sync monitoring error:', error);
    eventSource.close();
  };
};
```

**2. Error Analysis**
```javascript
// Analyze sync errors
const analyzeSyncErrors = async (syncId) => {
  const response = await fetch(`/api/sync/${syncId}/errors`);
  const errors = await response.json();
  
  const errorTypes = errors.reduce((acc, error) => {
    acc[error.type] = (acc[error.type] || 0) + 1;
    return acc;
  }, {});
  
  console.log('Error distribution:', errorTypes);
  
  // Most common errors
  const topErrors = Object.entries(errorTypes)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);
    
  console.log('Top 5 errors:', topErrors);
};
```

#### Solutions

**1. Memory Issues**
```javascript
// Process in smaller batches
const processInBatches = async (items, batchSize = 50) => {
  const batches = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }
  
  for (const [index, batch] of batches.entries()) {
    console.log(`Processing batch ${index + 1}/${batches.length}`);
    await processBatch(batch);
    
    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 100));
  }
};
```

**2. Timeout Issues**
```javascript
// Increase timeout for large datasets
const fetchWithTimeout = (url, timeout = 30000) => {
  return Promise.race([
    fetch(url),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), timeout)
    )
  ]);
};
```

## Product Classification Issues

### Problem: Incorrect SKU/Barcode Classification

#### Symptoms
- Products classified as wrong type
- Low confidence scores
- Inconsistent classifications

#### Diagnostic Steps

**1. Analyze Classification Results**
```javascript
// Review classification confidence
const analyzeClassifications = (classifications) => {
  const stats = {
    total: classifications.length,
    sku: 0,
    barcode: 0,
    lowConfidence: 0,
    avgConfidence: 0
  };
  
  let totalConfidence = 0;
  
  classifications.forEach(item => {
    if (item.type === 'sku') stats.sku++;
    if (item.type === 'barcode') stats.barcode++;
    if (item.confidence < 0.7) stats.lowConfidence++;
    totalConfidence += item.confidence;
  });
  
  stats.avgConfidence = totalConfidence / stats.total;
  
  console.log('Classification Stats:', stats);
  return stats;
};
```

**2. Test Specific Patterns**
```javascript
// Test problematic patterns
const testClassification = async (identifier) => {
  const response = await fetch('/api/products/classify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      products: [{
        id: 'test',
        sku: identifier,
        name: 'Test Product'
      }]
    })
  });
  
  const result = await response.json();
  console.log(`"${identifier}" classified as:`, result.classifications.test);
};

// Test various patterns
testClassification('ABC123');           // Should be SKU
testClassification('1234567890123');    // Should be barcode
testClassification('nwadas003orj');     // Should be SKU
```

#### Solutions

**1. Manual Corrections**
```javascript
// Correct classification
const correctClassification = async (productId, correctType, reasoning) => {
  const response = await fetch(`/api/products/${productId}/classification`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      type: correctType,
      reasoning: reasoning,
      user_feedback: true
    })
  });
  
  return await response.json();
};

// Batch corrections
const batchCorrectClassifications = async (corrections) => {
  const results = [];
  for (const correction of corrections) {
    const result = await correctClassification(
      correction.productId,
      correction.type,
      correction.reasoning
    );
    results.push(result);
  }
  return results;
};
```

**2. Improve Training Data**
```javascript
// Add training examples
const addTrainingExample = async (identifier, correctType, attributes) => {
  await fetch('/api/classifier/training', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      identifier,
      correct_type: correctType,
      attributes,
      source: 'user_correction'
    })
  });
};
```

### Problem: Variant Detection Issues

#### Symptoms
- Related products not grouped
- Incorrect variant groupings
- Missing variant relationships

#### Solutions

**1. Manual Variant Grouping**
```javascript
// Create variant group
const createVariantGroup = async (products, baseProduct) => {
  const response = await fetch('/api/products/variants/create-group', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      base_product_id: baseProduct.id,
      variant_products: products.map(p => p.id),
      attributes: extractVariantAttributes(products)
    })
  });
  
  return await response.json();
};

// Extract variant attributes
const extractVariantAttributes = (products) => {
  const attributes = new Set();
  
  products.forEach(product => {
    // Extract from SKU pattern
    const skuParts = product.sku.split('-');
    if (skuParts.length > 1) {
      skuParts.slice(1).forEach(part => attributes.add(part));
    }
    
    // Extract from product name
    const nameWords = product.name.toLowerCase().split(' ');
    ['red', 'blue', 'green', 'small', 'medium', 'large'].forEach(attr => {
      if (nameWords.includes(attr)) attributes.add(attr);
    });
  });
  
  return Array.from(attributes);
};
```

**2. Improve Variant Detection Rules**
```javascript
// Custom variant detection rules
const customVariantRules = {
  sku_patterns: [
    /^([A-Z0-9]+)-([A-Z]+)-([A-Z]+)$/,  // ABC123-RED-L
    /^([A-Z0-9]+)_([A-Z0-9]+)$/,        // ABC123_001
    /^([A-Z0-9]+)\.([A-Z0-9]+)$/        // ABC123.RED
  ],
  
  name_patterns: [
    /\b(red|blue|green|black|white)\b/i,
    /\b(small|medium|large|xl|xxl)\b/i,
    /\b(\d+gb|\d+ml|\d+kg)\b/i
  ]
};

// Apply custom rules
const applyCustomVariantRules = (products) => {
  return products.map(product => {
    const variants = [];
    
    customVariantRules.sku_patterns.forEach(pattern => {
      const match = product.sku.match(pattern);
      if (match) {
        variants.push({
          base: match[1],
          attributes: match.slice(2)
        });
      }
    });
    
    return { ...product, detected_variants: variants };
  });
};
```

## Order Processing Issues

### Problem: Orders Not Importing

#### Symptoms
- Sync completes but no new orders
- "No orders found" messages
- Date range issues

#### Diagnostic Steps

**1. Check Date Ranges**
```javascript
// Verify date range calculation
const checkDateRange = (platform, dateRange) => {
  const now = new Date();
  const start = new Date(dateRange.start);
  const end = new Date(dateRange.end);
  
  console.log('Current time:', now.toISOString());
  console.log('Start date:', start.toISOString());
  console.log('End date:', end.toISOString());
  
  // Check if dates are in future
  if (start > now) {
    console.error('❌ Start date is in the future');
  }
  
  // Check date range size
  const rangeDays = (end - start) / (1000 * 60 * 60 * 24);
  if (rangeDays > 365) {
    console.warn('⚠️  Date range is very large:', rangeDays, 'days');
  }
  
  // Platform-specific limitations
  const platformLimits = {
    trendyol: 90,   // days
    hepsiburada: 60,
    n11: 30
  };
  
  if (rangeDays > platformLimits[platform]) {
    console.warn(`⚠️  ${platform} limit is ${platformLimits[platform]} days`);
  }
};
```

**2. Test Order Endpoint**
```javascript
// Direct API test
const testOrderEndpoint = async (platform, credentials) => {
  const endpoints = {
    trendyol: `https://api.trendyol.com/sapigw/suppliers/${credentials.sellerId}/orders`,
    hepsiburada: 'https://api.hepsiburada.com/orders',
    n11: 'https://api.n11.com/orders'
  };
  
  try {
    const response = await fetch(endpoints[platform], {
      headers: {
        'Authorization': `Bearer ${credentials.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    console.log(`${platform} orders:`, data.content?.length || 0);
    return data;
  } catch (error) {
    console.error(`${platform} API error:`, error);
  }
};
```

#### Solutions

**1. Adjust Date Ranges**
```javascript
// Smart date range adjustment
const adjustDateRange = (platform, requestedDays) => {
  const limits = {
    trendyol: 90,
    hepsiburada: 60,
    n11: 30
  };
  
  const maxDays = limits[platform] || 30;
  const actualDays = Math.min(requestedDays, maxDays);
  
  const end = new Date();
  const start = new Date(end.getTime() - (actualDays * 24 * 60 * 60 * 1000));
  
  return {
    start: start.toISOString(),
    end: end.toISOString(),
    adjusted: actualDays !== requestedDays
  };
};
```

**2. Pagination Handling**
```javascript
// Handle paginated responses
const fetchAllOrders = async (platform, dateRange) => {
  let allOrders = [];
  let page = 1;
  let hasMore = true;
  
  while (hasMore) {
    const response = await fetch(`/api/platforms/${platform}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        ...dateRange,
        page,
        size: 100
      })
    });
    
    const data = await response.json();
    allOrders = allOrders.concat(data.orders || []);
    
    hasMore = data.hasMore && data.orders?.length > 0;
    page++;
    
    console.log(`Page ${page - 1}: ${data.orders?.length || 0} orders`);
    
    // Prevent infinite loops
    if (page > 100) {
      console.warn('⚠️  Too many pages, stopping');
      break;
    }
  }
  
  return allOrders;
};
```

### Problem: Order Status Updates Failing

#### Symptoms
- Status changes don't sync to platforms
- "Update failed" errors
- Orders stuck in pending status

#### Solutions

**1. Batch Status Updates**
```javascript
// Process status updates in batches
const batchUpdateStatus = async (orders, newStatus) => {
  const batchSize = 10;
  const results = [];
  
  for (let i = 0; i < orders.length; i += batchSize) {
    const batch = orders.slice(i, i + batchSize);
    
    try {
      const response = await fetch('/api/orders/batch-status', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          order_ids: batch.map(o => o.id),
          status: newStatus
        })
      });
      
      const result = await response.json();
      results.push(...result.results);
      
    } catch (error) {
      console.error(`Batch ${Math.floor(i/batchSize) + 1} failed:`, error);
    }
    
    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return results;
};
```

**2. Retry Failed Updates**
```javascript
// Retry failed status updates
const retryFailedUpdates = async (failedOrders) => {
  const retryResults = [];
  
  for (const order of failedOrders) {
    try {
      const response = await fetch(`/api/orders/${order.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: order.targetStatus,
          retry: true
        })
      });
      
      const result = await response.json();
      retryResults.push({ orderId: order.id, success: result.success });
      
    } catch (error) {
      retryResults.push({ 
        orderId: order.id, 
        success: false, 
        error: error.message 
      });
    }
  }
  
  return retryResults;
};
```

## Performance Issues

### Problem: Slow Page Loading

#### Symptoms
- Pages take longer than 3 seconds to load
- Timeouts on large datasets
- Browser becomes unresponsive

#### Diagnostic Steps

**1. Performance Monitoring**
```javascript
// Measure page load times
const measurePageLoad = () => {
  const loadTime = performance.now();
  
  window.addEventListener('load', () => {
    const fullLoadTime = performance.now() - loadTime;
    console.log(`Page loaded in ${fullLoadTime.toFixed(2)}ms`);
    
    if (fullLoadTime > 3000) {
      console.warn('⚠️  Slow page load detected');
    }
  });
};

// Measure API response times
const measureApiCall = async (url, options) => {
  const start = performance.now();
  
  try {
    const response = await fetch(url, options);
    const end = performance.now();
    const duration = end - start;
    
    console.log(`API call to ${url}: ${duration.toFixed(2)}ms`);
    
    if (duration > 2000) {
      console.warn('⚠️  Slow API response:', url);
    }
    
    return response;
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
};
```

**2. Memory Usage Analysis**
```javascript
// Monitor memory usage
const monitorMemory = () => {
  if (performance.memory) {
    const memory = performance.memory;
    console.log('Memory usage:', {
      used: (memory.usedJSHeapSize / 1024 / 1024).toFixed(2) + ' MB',
      total: (memory.totalJSHeapSize / 1024 / 1024).toFixed(2) + ' MB',
      limit: (memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2) + ' MB'
    });
    
    if (memory.usedJSHeapSize / memory.jsHeapSizeLimit > 0.8) {
      console.warn('⚠️  High memory usage detected');
    }
  }
};

// Monitor every 30 seconds
setInterval(monitorMemory, 30000);
```

#### Solutions

**1. Implement Pagination**
```javascript
// Efficient pagination component
class PaginatedList {
  constructor(container, itemsPerPage = 20) {
    this.container = container;
    this.itemsPerPage = itemsPerPage;
    this.currentPage = 1;
    this.data = [];
  }
  
  async loadPage(page) {
    const start = (page - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    
    // Only fetch if not already cached
    if (!this.data[page]) {
      const response = await fetch(`/api/orders?page=${page}&limit=${this.itemsPerPage}`);
      this.data[page] = await response.json();
    }
    
    this.renderPage(this.data[page]);
  }
  
  renderPage(pageData) {
    this.container.innerHTML = '';
    pageData.items.forEach(item => {
      const element = this.createItemElement(item);
      this.container.appendChild(element);
    });
  }
}
```

**2. Lazy Loading**
```javascript
// Lazy load images and heavy content
const lazyLoadImages = () => {
  const images = document.querySelectorAll('img[data-src]');
  
  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
        observer.unobserve(img);
      }
    });
  });
  
  images.forEach(img => imageObserver.observe(img));
};
```

**3. Optimize API Calls**
```javascript
// Debounce search input
const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
};

// Usage for search
const searchOrders = debounce(async (query) => {
  const response = await fetch(`/api/orders/search?q=${encodeURIComponent(query)}`);
  const results = await response.json();
  displaySearchResults(results);
}, 300);
```

### Problem: High Memory Usage

#### Solutions

**1. Cleanup Event Listeners**
```javascript
// Proper cleanup of event listeners
class ComponentManager {
  constructor() {
    this.eventListeners = [];
    this.intervals = [];
    this.observers = [];
  }
  
  addEventListener(element, event, handler) {
    element.addEventListener(event, handler);
    this.eventListeners.push({ element, event, handler });
  }
  
  setInterval(callback, delay) {
    const intervalId = setInterval(callback, delay);
    this.intervals.push(intervalId);
    return intervalId;
  }
  
  createObserver(callback, options) {
    const observer = new IntersectionObserver(callback, options);
    this.observers.push(observer);
    return observer;
  }
  
  cleanup() {
    // Remove event listeners
    this.eventListeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    
    // Clear intervals
    this.intervals.forEach(intervalId => {
      clearInterval(intervalId);
    });
    
    // Disconnect observers
    this.observers.forEach(observer => {
      observer.disconnect();
    });
    
    // Clear arrays
    this.eventListeners = [];
    this.intervals = [];
    this.observers = [];
  }
}
```

**2. Data Cleanup**
```javascript
// Regular data cleanup
const cleanupOldData = () => {
  // Remove old cached data
  const cacheKeys = Object.keys(localStorage);
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours
  
  cacheKeys.forEach(key => {
    if (key.startsWith('cache_')) {
      try {
        const data = JSON.parse(localStorage.getItem(key));
        if (data.timestamp && (now - data.timestamp) > maxAge) {
          localStorage.removeItem(key);
        }
      } catch (error) {
        // Remove invalid cache entries
        localStorage.removeItem(key);
      }
    }
  });
};

// Run cleanup every hour
setInterval(cleanupOldData, 60 * 60 * 1000);
```

## System Monitoring

### Health Check Endpoints

**1. Application Health**
```bash
# Check application status
curl http://localhost:3000/api/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2025-08-12T10:30:00Z",
  "uptime": "2h 15m 30s",
  "version": "1.0.0"
}
```

**2. Database Health**
```bash
# Check database connectivity
curl http://localhost:3000/api/health/database

# Expected response:
{
  "status": "connected",
  "response_time": "15ms",
  "active_connections": 5,
  "max_connections": 100
}
```

**3. Platform Health**
```bash
# Check platform connectivity
curl http://localhost:3000/api/health/platforms

# Expected response:
{
  "trendyol": {
    "status": "healthy",
    "response_time": "234ms",
    "last_sync": "2025-08-12T10:25:00Z"
  },
  "hepsiburada": {
    "status": "healthy",
    "response_time": "187ms",
    "last_sync": "2025-08-12T10:24:00Z"
  }
}
```

### Log Analysis

**1. Error Log Monitoring**
```bash
# Watch error logs
tail -f /var/log/pazar/error.log

# Search for specific errors
grep "Classification failed" /var/log/pazar/error.log | tail -20

# Count error types
awk '{print $5}' /var/log/pazar/error.log | sort | uniq -c | sort -nr
```

**2. Performance Log Analysis**
```bash
# Find slow API calls
grep "response_time" /var/log/pazar/access.log | awk '$NF > 2000' | tail -10

# Monitor sync performance
grep "sync_complete" /var/log/pazar/sync.log | tail -5
```

## Emergency Procedures

### System Recovery

**1. Database Recovery**
```bash
# Backup current database
pg_dump pazar_plus_prod > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
psql pazar_plus_prod < backup_20250812_103000.sql

# Check database integrity
psql pazar_plus_prod -c "SELECT pg_database_size('pazar_plus_prod');"
```

**2. Application Recovery**
```bash
# Restart application
pm2 restart pazar-plus

# Check application status
pm2 status pazar-plus

# View logs
pm2 logs pazar-plus --lines 50
```

**3. Platform Connection Recovery**
```javascript
// Reset all platform connections
const resetPlatformConnections = async () => {
  const connections = await fetch('/api/platform-connections');
  const connectionList = await connections.json();
  
  for (const connection of connectionList.connections) {
    try {
      await fetch(`/api/platform-connections/${connection.id}/reset`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log(`✅ Reset connection: ${connection.name}`);
    } catch (error) {
      console.error(`❌ Failed to reset: ${connection.name}`, error);
    }
  }
};
```

---

Keep this guide bookmarked for quick reference during troubleshooting. Regular monitoring and preventive maintenance can help avoid many common issues.
