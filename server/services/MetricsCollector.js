/**
 * MetricsCollector Service
 * Collects and aggregates application metrics for monitoring and analytics
 */

const logger = require('../utils/logger');

class MetricsCollector {
  constructor() {
    this.metrics = new Map();
    this.timers = new Map();
    this.counters = new Map();
    this.histograms = new Map();
    this.startTime = Date.now();
  }

  /**
   * Start a timer for measuring duration
   */
  startTimer(name, labels = {}) {
    const key = this.createKey(name, labels);
    this.timers.set(key, {
      start: Date.now(),
      name,
      labels
    });
    return key;
  }

  /**
   * End a timer and record the duration
   */
  endTimer(key) {
    const timer = this.timers.get(key);
    if (!timer) {
      logger.warn(`Timer not found: ${key}`);
      return 0;
    }

    const duration = Date.now() - timer.start;
    this.recordHistogram(`${timer.name}_duration`, duration, timer.labels);
    this.timers.delete(key);
    return duration;
  }

  /**
   * Increment a counter
   */
  incrementCounter(name, value = 1, labels = {}) {
    const key = this.createKey(name, labels);
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + value);
  }

  /**
   * Record a histogram value
   */
  recordHistogram(name, value, labels = {}) {
    const key = this.createKey(name, labels);
    if (!this.histograms.has(key)) {
      this.histograms.set(key, {
        name,
        labels,
        values: [],
        count: 0,
        sum: 0,
        min: null,
        max: null
      });
    }

    const histogram = this.histograms.get(key);
    histogram.values.push({ value, timestamp: Date.now() });
    histogram.count++;
    histogram.sum += value;
    histogram.min =
      histogram.min === null ? value : Math.min(histogram.min, value);
    histogram.max =
      histogram.max === null ? value : Math.max(histogram.max, value);

    // Keep only last 1000 values to prevent memory issues
    if (histogram.values.length > 1000) {
      histogram.values = histogram.values.slice(-1000);
    }
  }

  /**
   * Set a gauge value
   */
  setGauge(name, value, labels = {}) {
    const key = this.createKey(name, labels);
    this.metrics.set(key, {
      name,
      labels,
      value,
      timestamp: Date.now(),
      type: 'gauge'
    });
  }

  /**
   * Get current metrics snapshot
   */
  getMetrics() {
    const snapshot = {
      timestamp: Date.now(),
      uptime: Date.now() - this.startTime,
      counters: this.serializeCounters(),
      histograms: this.serializeHistograms(),
      gauges: this.serializeGauges()
    };

    return snapshot;
  }

  /**
   * Get specific metric by name
   */
  getMetric(name, labels = {}) {
    const key = this.createKey(name, labels);

    // Check counters
    if (this.counters.has(key)) {
      return { type: 'counter', value: this.counters.get(key) };
    }

    // Check histograms
    if (this.histograms.has(key)) {
      return { type: 'histogram', ...this.histograms.get(key) };
    }

    // Check gauges
    if (this.metrics.has(key)) {
      return { type: 'gauge', ...this.metrics.get(key) };
    }

    return null;
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.metrics.clear();
    this.timers.clear();
    this.counters.clear();
    this.histograms.clear();
    this.startTime = Date.now();
  }

  /**
   * Get system metrics
   */
  getSystemMetrics() {
    const process = require('process');
    const os = require('os');

    return {
      memory: {
        used: process.memoryUsage().heapUsed,
        total: process.memoryUsage().heapTotal,
        rss: process.memoryUsage().rss,
        external: process.memoryUsage().external
      },
      cpu: {
        usage: process.cpuUsage(),
        loadAverage: os.loadavg()
      },
      system: {
        uptime: os.uptime(),
        freeMem: os.freemem(),
        totalMem: os.totalmem(),
        platform: os.platform(),
        arch: os.arch()
      },
      process: {
        pid: process.pid,
        uptime: process.uptime(),
        version: process.version
      }
    };
  }

  /**
   * Export metrics in Prometheus format
   */
  exportPrometheus() {
    let output = '';

    // Export counters
    for (const [key, value] of this.counters) {
      const { name, labels } = this.parseKey(key);
      const labelsStr = this.formatLabels(labels);
      output += `# TYPE ${name} counter\n`;
      output += `${name}${labelsStr} ${value}\n`;
    }

    // Export histograms
    for (const [key, histogram] of this.histograms) {
      const labelsStr = this.formatLabels(histogram.labels);
      output += `# TYPE ${histogram.name} histogram\n`;
      output += `${histogram.name}_count${labelsStr} ${histogram.count}\n`;
      output += `${histogram.name}_sum${labelsStr} ${histogram.sum}\n`;

      if (histogram.count > 0) {
        output += `${histogram.name}_min${labelsStr} ${histogram.min}\n`;
        output += `${histogram.name}_max${labelsStr} ${histogram.max}\n`;
        output += `${histogram.name}_avg${labelsStr} ${
          histogram.sum / histogram.count
        }\n`;
      }
    }

    // Export gauges
    for (const [key, metric] of this.metrics) {
      if (metric.type === 'gauge') {
        const labelsStr = this.formatLabels(metric.labels);
        output += `# TYPE ${metric.name} gauge\n`;
        output += `${metric.name}${labelsStr} ${metric.value}\n`;
      }
    }

    return output;
  }

  // Helper methods
  createKey(name, labels) {
    const labelStr = Object.keys(labels)
      .sort()
      .map((key) => `${key}="${labels[key]}"`)
      .join(',');
    return labelStr ? `${name}{${labelStr}}` : name;
  }

  parseKey(key) {
    const match = key.match(/^([^{]+)(?:\{(.+)\})?$/);
    if (!match) {return { name: key, labels: {} };}

    const name = match[1];
    const labelsStr = match[2];
    const labels = {};

    if (labelsStr) {
      labelsStr.split(',').forEach((pair) => {
        const [key, value] = pair.split('=');
        labels[key] = value.replace(/"/g, '');
      });
    }

    return { name, labels };
  }

  formatLabels(labels) {
    const labelPairs = Object.keys(labels)
      .sort()
      .map((key) => `${key}="${labels[key]}"`)
      .join(',');
    return labelPairs ? `{${labelPairs}}` : '';
  }

  serializeCounters() {
    const result = {};
    for (const [key, value] of this.counters) {
      const { name, labels } = this.parseKey(key);
      if (!result[name]) {result[name] = [];}
      result[name].push({ labels, value });
    }
    return result;
  }

  serializeHistograms() {
    const result = {};
    for (const [key, histogram] of this.histograms) {
      if (!result[histogram.name]) {result[histogram.name] = [];}

      const summary = {
        labels: histogram.labels,
        count: histogram.count,
        sum: histogram.sum,
        min: histogram.min,
        max: histogram.max,
        avg: histogram.count > 0 ? histogram.sum / histogram.count : 0,
        percentiles: this.calculatePercentiles(
          histogram.values.map((v) => v.value)
        )
      };

      result[histogram.name].push(summary);
    }
    return result;
  }

  serializeGauges() {
    const result = {};
    for (const [key, metric] of this.metrics) {
      if (metric.type === 'gauge') {
        if (!result[metric.name]) {result[metric.name] = [];}
        result[metric.name].push({
          labels: metric.labels,
          value: metric.value,
          timestamp: metric.timestamp
        });
      }
    }
    return result;
  }

  calculatePercentiles(values) {
    if (values.length === 0) {return {};}

    const sorted = [...values].sort((a, b) => a - b);
    const percentiles = [50, 90, 95, 99];
    const result = {};

    percentiles.forEach((p) => {
      const index = Math.ceil((p / 100) * sorted.length) - 1;
      result[`p${p}`] = sorted[Math.max(0, index)];
    });

    return result;
  }
}

module.exports = MetricsCollector;
