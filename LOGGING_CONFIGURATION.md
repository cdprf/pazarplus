# Logging Configuration for Pazar+

## Overview
The logging system has been optimized to reduce verbose output in development mode while maintaining detailed error logging and providing optional debug modes.

## Changes Made

### 1. Database Query Logging
- **Before**: All SQL queries were logged at `info` level in development
- **After**: SQL queries are only logged when `DEBUG_DB=true` and at `debug` level
- **Configuration**: Set `DEBUG_DB=true` in your environment to enable

### 2. HTTP Request Logging
- **Before**: Every HTTP request was logged at `info` level with full details
- **After**: 
  - Successful requests (200-399) are logged at `debug` level
  - Error requests (400+) are still logged at `warn/error` level
  - Slow requests (>1000ms) are logged at `warn` level

### 3. Authentication Logging
- **Before**: Every auth middleware call and token verification was logged at `info` level
- **After**: Auth logs are only shown when `DEBUG_AUTH=true` and at `debug` level
- **Configuration**: Set `DEBUG_AUTH=true` in your environment to enable

### 4. API Versioning Logging
- **Before**: Every API version resolution was logged at `info` level
- **After**: Version logs are only shown when `DEBUG_API_VERSIONING=true` and at `debug` level
- **Configuration**: Set `DEBUG_API_VERSIONING=true` in your environment to enable

## Environment Variables

Add these to your `.env` file to control debug logging:

```bash
# ===========================================
# LOGGING & DEBUG CONFIGURATION
# ===========================================
# Set to 'true' to enable verbose logging (not recommended for production)
DEBUG_DB=false
DEBUG_AUTH=false
DEBUG_API_VERSIONING=false
```

## Log Levels

The application now uses these log levels more appropriately:

- **error**: System errors, failures, exceptions
- **warn**: Client errors (4xx), slow requests, important warnings
- **info**: Business events, important operations, server startup
- **debug**: Verbose technical details (DB queries, auth flows, etc.)

## Enabling Debug Mode

### For Database Queries
```bash
DEBUG_DB=true npm run dev
```

### For Authentication Flow
```bash
DEBUG_AUTH=true npm run dev
```

### For API Versioning
```bash
DEBUG_API_VERSIONING=true npm run dev
```

### For All Debug Logs
```bash
DEBUG_DB=true DEBUG_AUTH=true DEBUG_API_VERSIONING=true npm run dev
```

## Production Considerations

- In production, ensure all DEBUG_* variables are set to `false` or omitted
- The logging system automatically disables verbose logging in production mode
- Only errors, warnings, and important business events are logged in production

## What You'll See Now

### Normal Development Mode (Clean Logs)
```
[info] Server starting on port 5001
[info] Database connected successfully
[warn] Slow HTTP Response: GET /api/products (1250ms)
[error] Product sync failed: Connection timeout
```

### With Debug Mode Enabled
```
[info] Server starting on port 5001
[debug] DB Query: SELECT * FROM products WHERE userId = $1
[debug] Auth middleware called for /api/products
[debug] HTTP Request: GET /api/products (200, 150ms)
```

## Troubleshooting

If you need to see detailed logs for debugging:

1. **Database Issues**: Enable `DEBUG_DB=true`
2. **Authentication Issues**: Enable `DEBUG_AUTH=true`
3. **API Problems**: Enable `DEBUG_API_VERSIONING=true`
4. **General HTTP Issues**: Check the warn/error logs that are always visible

This approach gives you clean logs by default but full visibility when you need it for debugging.
