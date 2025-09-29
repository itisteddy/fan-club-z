/**
 * Request Manager
 * Handles request cancellation, deduplication, and memory leak prevention
 */

interface RequestConfig {
  url: string;
  options?: RequestInit;
  key?: string; // For deduplication
}

interface PendingRequest {
  controller: AbortController;
  promise: Promise<any>;
  timestamp: number;
}

class RequestManager {
  private pendingRequests = new Map<string, PendingRequest>();
  private requestQueue = new Map<string, Promise<any>>();
  
  /**
   * Cancel all pending requests
   */
  cancelAllRequests(): void {
    for (const [key, request] of this.pendingRequests.entries()) {
      request.controller.abort();
      this.pendingRequests.delete(key);
    }
    this.requestQueue.clear();
  }

  /**
   * Cancel requests by pattern
   */
  cancelRequestsMatching(pattern: RegExp): void {
    for (const [key, request] of this.pendingRequests.entries()) {
      if (pattern.test(key)) {
        request.controller.abort();
        this.pendingRequests.delete(key);
      }
    }
  }

  /**
   * Cancel a specific request
   */
  cancelRequest(key: string): boolean {
    const request = this.pendingRequests.get(key);
    if (request) {
      request.controller.abort();
      this.pendingRequests.delete(key);
      this.requestQueue.delete(key);
      return true;
    }
    return false;
  }

  /**
   * Make a cancellable request with deduplication
   */
  async request<T>(config: RequestConfig): Promise<T> {
    const key = config.key || `${config.url}:${JSON.stringify(config.options?.body || {})}`;
    
    // Return existing promise if request is already in flight
    if (this.requestQueue.has(key)) {
      return this.requestQueue.get(key)!;
    }

    // Create new abort controller
    const controller = new AbortController();
    
    // Merge abort signal with existing signal
    const existingSignal = config.options?.signal;
    let signal = controller.signal;
    
    if (existingSignal) {
      // Create a combined abort controller
      const combinedController = new AbortController();
      
      const cleanup = () => {
        existingSignal.removeEventListener('abort', cleanup);
        controller.signal.removeEventListener('abort', cleanup);
      };
      
      existingSignal.addEventListener('abort', () => {
        combinedController.abort();
        cleanup();
      });
      
      controller.signal.addEventListener('abort', () => {
        combinedController.abort();
        cleanup();
      });
      
      signal = combinedController.signal;
    }

    // Create the request promise
    const requestPromise = fetch(config.url, {
      ...config.options,
      signal,
    }).then(async response => {
      // Cleanup on success
      this.pendingRequests.delete(key);
      this.requestQueue.delete(key);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        return response.json();
      }
      return response.text();
    }).catch(error => {
      // Cleanup on error
      this.pendingRequests.delete(key);
      this.requestQueue.delete(key);
      
      // Don't throw on abort - it's expected
      if (error.name === 'AbortError') {
        return Promise.resolve(null);
      }
      
      throw error;
    });

    // Store the request
    this.pendingRequests.set(key, {
      controller,
      promise: requestPromise,
      timestamp: Date.now(),
    });
    
    this.requestQueue.set(key, requestPromise);

    return requestPromise;
  }

  /**
   * Cleanup old requests (called periodically)
   */
  cleanup(maxAge: number = 30000): void {
    const now = Date.now();
    for (const [key, request] of this.pendingRequests.entries()) {
      if (now - request.timestamp > maxAge) {
        request.controller.abort();
        this.pendingRequests.delete(key);
        this.requestQueue.delete(key);
      }
    }
  }

  /**
   * Get statistics about pending requests
   */
  getStats(): { pending: number; queued: number } {
    return {
      pending: this.pendingRequests.size,
      queued: this.requestQueue.size,
    };
  }
}

// Global request manager instance
export const requestManager = new RequestManager();

// Cleanup old requests every 30 seconds
if (typeof window !== 'undefined') {
  setInterval(() => {
    requestManager.cleanup();
  }, 30000);
}

// Cancel all requests on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    requestManager.cancelAllRequests();
  });
}

export default RequestManager;
