/**
 * Client-side performance monitoring service
 */
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      pageLoads: new Map(),
      componentLoads: new Map(),
      apiCalls: new Map(),
    };
    this.initializeWebVitals();
  }

  // Initialize Web Vitals monitoring
  initializeWebVitals() {
    if (typeof window !== "undefined" && "PerformanceObserver" in window) {
      // Monitor Largest Contentful Paint (LCP)
      this.observeMetric("largest-contentful-paint", (entry) => {
        console.log("LCP:", entry.value);
      });

      // Monitor First Input Delay (FID)
      this.observeMetric("first-input-delay", (entry) => {
        console.log("FID:", entry.value);
      });

      // Monitor Cumulative Layout Shift (CLS)
      this.observeMetric("layout-shift", (entry) => {
        if (!entry.hadRecentInput) {
          console.log("CLS:", entry.value);
        }
      });
    }
  }

  observeMetric(type, callback) {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          callback(entry);
        }
      });
      observer.observe({ type, buffered: true });
    } catch (error) {
      console.warn(`Failed to observe ${type}:`, error);
    }
  }

  // Track component load time
  trackComponentLoad(componentName, startTime) {
    const endTime = performance.now();
    const duration = endTime - startTime;

    this.metrics.componentLoads.set(componentName, {
      duration,
      timestamp: Date.now(),
    });

    if (duration > 1000) {
      console.warn(
        `Slow component load: ${componentName} took ${duration.toFixed(2)}ms`
      );
    }
  }

  // Track page navigation
  trackPageLoad(pageName, startTime) {
    const endTime = performance.now();
    const duration = endTime - startTime;

    this.metrics.pageLoads.set(pageName, {
      duration,
      timestamp: Date.now(),
    });

    console.log(`Page load: ${pageName} in ${duration.toFixed(2)}ms`);
  }

  // Track API call performance
  trackApiCall(endpoint, duration, success = true) {
    const existing = this.metrics.apiCalls.get(endpoint) || {
      calls: 0,
      totalDuration: 0,
      errors: 0,
    };

    this.metrics.apiCalls.set(endpoint, {
      calls: existing.calls + 1,
      totalDuration: existing.totalDuration + duration,
      errors: existing.errors + (success ? 0 : 1),
      avgDuration: (existing.totalDuration + duration) / (existing.calls + 1),
    });

    if (duration > 2000) {
      console.warn(`Slow API call: ${endpoint} took ${duration.toFixed(2)}ms`);
    }
  }

  // Get performance summary
  getSummary() {
    return {
      componentLoads: Object.fromEntries(this.metrics.componentLoads),
      pageLoads: Object.fromEntries(this.metrics.pageLoads),
      apiCalls: Object.fromEntries(this.metrics.apiCalls),
    };
  }

  // Clear metrics
  clear() {
    this.metrics.pageLoads.clear();
    this.metrics.componentLoads.clear();
    this.metrics.apiCalls.clear();
  }

  // Print performance summary to console
  printSummary() {
    const summary = this.getSummary();

    console.group("🚀 Performance Summary");

    // Page loads
    if (Object.keys(summary.pageLoads).length > 0) {
      console.group("📄 Page Loads");
      Object.entries(summary.pageLoads).forEach(([page, data]) => {
        const status =
          data.duration > 3000 ? "🐌" : data.duration > 1000 ? "⚡" : "🚀";
        console.log(`${status} ${page}: ${data.duration.toFixed(2)}ms`);
      });
      console.groupEnd();
    }

    // Component loads
    if (Object.keys(summary.componentLoads).length > 0) {
      console.group("🧩 Component Loads");
      Object.entries(summary.componentLoads).forEach(([component, data]) => {
        const status =
          data.duration > 1000 ? "🐌" : data.duration > 500 ? "⚡" : "🚀";
        console.log(`${status} ${component}: ${data.duration.toFixed(2)}ms`);
      });
      console.groupEnd();
    }

    // API performance
    if (Object.keys(summary.apiCalls).length > 0) {
      console.group("🌐 API Performance");
      Object.entries(summary.apiCalls).forEach(([endpoint, data]) => {
        const status =
          data.avgDuration > 2000
            ? "🐌"
            : data.avgDuration > 1000
            ? "⚡"
            : "🚀";
        const errorRate = ((data.errors / data.calls) * 100).toFixed(1);
        console.log(
          `${status} ${endpoint}: ${data.avgDuration.toFixed(2)}ms avg (${
            data.calls
          } calls, ${errorRate}% errors)`
        );
      });
      console.groupEnd();
    }

    console.groupEnd();
  }
}

// Export singleton instance
const performanceMonitor = new PerformanceMonitor();
export default performanceMonitor;
