/**
 * Request queue utility to prevent overwhelming the server with concurrent requests
 */

class RequestQueue {
  constructor(maxConcurrent = 3, queueTimeout = 10000) {
    this.maxConcurrent = maxConcurrent;
    this.queueTimeout = queueTimeout;
    this.active = 0;
    this.queue = [];
    this.timeouts = new Map();
  }

  async add(requestFn, priority = "normal") {
    return new Promise((resolve, reject) => {
      const request = {
        fn: requestFn,
        resolve,
        reject,
        priority,
        timestamp: Date.now(),
      };

      // Add timeout for queued requests
      const timeoutId = setTimeout(() => {
        this.removeFromQueue(request);
        reject(new Error("Request queue timeout"));
      }, this.queueTimeout);

      this.timeouts.set(request, timeoutId);

      // Insert based on priority (high priority goes first)
      if (priority === "high") {
        this.queue.unshift(request);
      } else {
        this.queue.push(request);
      }

      this.processQueue();
    });
  }

  removeFromQueue(request) {
    const index = this.queue.indexOf(request);
    if (index > -1) {
      this.queue.splice(index, 1);
      const timeoutId = this.timeouts.get(request);
      if (timeoutId) {
        clearTimeout(timeoutId);
        this.timeouts.delete(request);
      }
    }
  }

  async processQueue() {
    if (this.active >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    const request = this.queue.shift();
    if (!request) return;

    // Clear timeout since we're processing the request
    const timeoutId = this.timeouts.get(request);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.timeouts.delete(request);
    }

    this.active++;

    try {
      const result = await request.fn();
      request.resolve(result);
    } catch (error) {
      request.reject(error);
    } finally {
      this.active--;
      // Process next request
      setTimeout(() => this.processQueue(), 100);
    }
  }

  clear() {
    // Clear all queued requests
    this.queue.forEach((request) => {
      const timeoutId = this.timeouts.get(request);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      request.reject(new Error("Request queue cleared"));
    });

    this.queue = [];
    this.timeouts.clear();
  }

  getStats() {
    return {
      active: this.active,
      queued: this.queue.length,
      maxConcurrent: this.maxConcurrent,
    };
  }
}

// Global request queue instance
const globalRequestQueue = new RequestQueue(3, 15000); // Max 3 concurrent, 15s timeout

export default globalRequestQueue;
export { RequestQueue };
