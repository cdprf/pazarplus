/**
 * Analytics Performance Monitor
 * Tracks and reports performance metrics for analytics operations
 */
class AnalyticsPerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.thresholds = {
      api_response_time: 2000, // 2 seconds
      dashboard_load_time: 3000, // 3 seconds
      chart_render_time: 1000, // 1 second
      cache_hit_rate: 0.8, // 80%
      error_rate: 0.05, // 5%
    };
    this.isEnabled =
      process.env.NODE_ENV !== "production" ||
      localStorage.getItem("analytics_monitoring") === "true";
  }

  /**
   * Start timing an operation
   */
  startTimer(operationId) {
    if (!this.isEnabled) return null;

    const timer = {
      id: operationId,
      startTime: performance.now(),
      startMemory: this.getMemoryUsage(),
    };

    this.metrics.set(`timer_${operationId}`, timer);
    return timer;
  }

  /**
   * End timing and record metrics
   */
  endTimer(operationId, metadata = {}) {
    if (!this.isEnabled) return null;

    const timer = this.metrics.get(`timer_${operationId}`);
    if (!timer) return null;

    const endTime = performance.now();
    const duration = endTime - timer.startTime;
    const endMemory = this.getMemoryUsage();
    const memoryDelta = endMemory - timer.startMemory;

    const metric = {
      operationId,
      duration,
      memoryDelta,
      timestamp: new Date(),
      ...metadata,
    };

    this.recordMetric("operation_time", metric);
    this.metrics.delete(`timer_${operationId}`);

    // Check if duration exceeds threshold
    this.checkThreshold("api_response_time", duration, operationId);

    return metric;
  }

  /**
   * Record a performance metric
   */
  recordMetric(type, data) {
    if (!this.isEnabled) return;

    const key = `${type}_${Date.now()}`;
    this.metrics.set(key, {
      type,
      data,
      timestamp: new Date(),
    });

    // Keep only last 1000 metrics
    if (this.metrics.size > 1000) {
      const oldestKey = this.metrics.keys().next().value;
      this.metrics.delete(oldestKey);
    }

    // Log significant events
    if (data.duration > this.thresholds.api_response_time) {
      console.warn(
        `🐌 Slow analytics operation: ${
          data.operationId
        } took ${data.duration.toFixed(2)}ms`
      );
    }
  }

  /**
   * Track API request performance
   */
  trackAPIRequest(endpoint, startTime, endTime, success = true, error = null) {
    if (!this.isEnabled) return;

    const duration = endTime - startTime;
    const metric = {
      endpoint,
      duration,
      success,
      error: error?.message,
      timestamp: new Date(),
    };

    this.recordMetric("api_request", metric);
    this.updateAPIStats(endpoint, duration, success);
  }

  /**
   * Track component render performance
   */
  trackComponentRender(componentName, renderTime, propsSize = 0) {
    if (!this.isEnabled) return;

    const metric = {
      componentName,
      renderTime,
      propsSize,
      timestamp: new Date(),
    };

    this.recordMetric("component_render", metric);
  }

  /**
   * Track cache performance
   */
  trackCacheOperation(operation, hit = false, key = "") {
    if (!this.isEnabled) return;

    const metric = {
      operation, // 'get', 'set', 'delete'
      hit,
      key,
      timestamp: new Date(),
    };

    this.recordMetric("cache_operation", metric);
    this.updateCacheStats(hit);
  }

  /**
   * Track error occurrences
   */
  trackError(error, context = "", severity = "error") {
    if (!this.isEnabled) return;

    const metric = {
      message: error.message,
      stack: error.stack,
      context,
      severity,
      timestamp: new Date(),
    };

    this.recordMetric("error", metric);
    this.updateErrorStats();
  }

  /**
   * Update API statistics
   */
  updateAPIStats(endpoint, duration, success) {
    const statsKey = `api_stats_${endpoint}`;
    const existing = this.metrics.get(statsKey) || {
      endpoint,
      totalRequests: 0,
      successfulRequests: 0,
      totalDuration: 0,
      minDuration: Infinity,
      maxDuration: 0,
    };

    existing.totalRequests++;
    if (success) existing.successfulRequests++;
    existing.totalDuration += duration;
    existing.minDuration = Math.min(existing.minDuration, duration);
    existing.maxDuration = Math.max(existing.maxDuration, duration);
    existing.avgDuration = existing.totalDuration / existing.totalRequests;
    existing.successRate = existing.successfulRequests / existing.totalRequests;

    this.metrics.set(statsKey, existing);
  }

  /**
   * Update cache statistics
   */
  updateCacheStats(hit) {
    const statsKey = "cache_stats";
    const existing = this.metrics.get(statsKey) || {
      totalOperations: 0,
      hits: 0,
    };

    existing.totalOperations++;
    if (hit) existing.hits++;
    existing.hitRate = existing.hits / existing.totalOperations;

    this.metrics.set(statsKey, existing);
    this.checkThreshold("cache_hit_rate", existing.hitRate);
  }

  /**
   * Update error statistics
   */
  updateErrorStats() {
    const statsKey = "error_stats";
    const existing = this.metrics.get(statsKey) || {
      totalErrors: 0,
      errorsByType: new Map(),
    };

    existing.totalErrors++;
    this.metrics.set(statsKey, existing);
  }

  /**
   * Check if metric exceeds threshold
   */
  checkThreshold(metric, value, context = "") {
    const threshold = this.thresholds[metric];
    if (threshold && value > threshold) {
      const message = `⚠️ Analytics threshold exceeded: ${metric} = ${value} (threshold: ${threshold})`;
      console.warn(message, context);

      // Could trigger alerts here
      this.triggerAlert(metric, value, threshold, context);
    }
  }

  /**
   * Trigger performance alert
   */
  triggerAlert(metric, value, threshold, context) {
    const alert = {
      type: "performance_threshold_exceeded",
      metric,
      value,
      threshold,
      context,
      timestamp: new Date(),
    };

    // Store alert
    this.recordMetric("alert", alert);

    // Could send to monitoring service
    if (window.analyticsConfig?.monitoring?.enabled) {
      this.sendToMonitoringService(alert);
    }
  }

  /**
   * Get memory usage (if available)
   */
  getMemoryUsage() {
    if (performance.memory) {
      return performance.memory.usedJSHeapSize;
    }
    return 0;
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary() {
    if (!this.isEnabled) return null;

    const summary = {
      timestamp: new Date(),
      metrics: {
        totalOperations: 0,
        avgResponseTime: 0,
        errorRate: 0,
        cacheHitRate: 0,
      },
      topSlowOperations: [],
      recentErrors: [],
      memoryUsage: this.getMemoryUsage(),
    };

    // Calculate summary from stored metrics
    const operations = Array.from(this.metrics.values())
      .filter((m) => m.type === "operation_time")
      .map((m) => m.data);

    if (operations.length > 0) {
      summary.metrics.totalOperations = operations.length;
      summary.metrics.avgResponseTime =
        operations.reduce((sum, op) => sum + op.duration, 0) /
        operations.length;

      // Top 5 slowest operations
      summary.topSlowOperations = operations
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 5);
    }

    // Get cache stats
    const cacheStats = this.metrics.get("cache_stats");
    if (cacheStats) {
      summary.metrics.cacheHitRate = cacheStats.hitRate || 0;
    }

    // Get recent errors
    summary.recentErrors = Array.from(this.metrics.values())
      .filter((m) => m.type === "error")
      .map((m) => m.data)
      .slice(-10);

    summary.metrics.errorRate =
      summary.recentErrors.length / Math.max(operations.length, 1);

    return summary;
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics() {
    if (!this.isEnabled) return null;

    const export_data = {
      timestamp: new Date(),
      thresholds: this.thresholds,
      metrics: Array.from(this.metrics.entries()).map(([key, value]) => ({
        key,
        ...value,
      })),
      summary: this.getPerformanceSummary(),
    };

    return export_data;
  }

  /**
   * Send metrics to monitoring service
   */
  async sendToMonitoringService(data) {
    try {
      // This would send to your monitoring service
      // fetch('/api/monitoring/analytics', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(data)
      // });
      console.log("📊 Monitoring data:", data);
    } catch (error) {
      console.error("Failed to send monitoring data:", error);
    }
  }

  /**
   * Clear all metrics
   */
  clear() {
    this.metrics.clear();
  }

  /**
   * Enable/disable monitoring
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
    localStorage.setItem("analytics_monitoring", enabled.toString());
  }
}

// Create singleton instance
const performanceMonitor = new AnalyticsPerformanceMonitor();

// Export utility functions for easy use
export const trackAPIRequest = (endpoint, startTime, endTime, success, error) =>
  performanceMonitor.trackAPIRequest(
    endpoint,
    startTime,
    endTime,
    success,
    error
  );

export const trackComponentRender = (componentName, renderTime, propsSize) =>
  performanceMonitor.trackComponentRender(componentName, renderTime, propsSize);

export const trackCacheOperation = (operation, hit, key) =>
  performanceMonitor.trackCacheOperation(operation, hit, key);

export const trackError = (error, context, severity) =>
  performanceMonitor.trackError(error, context, severity);

export const startTimer = (operationId) =>
  performanceMonitor.startTimer(operationId);

export const endTimer = (operationId, metadata) =>
  performanceMonitor.endTimer(operationId, metadata);

export const getPerformanceSummary = () =>
  performanceMonitor.getPerformanceSummary();

export const exportMetrics = () => performanceMonitor.exportMetrics();

export default performanceMonitor;
