/**
 * API Utilities with Retry Logic
 * Handles common production issues like 502 errors, timeouts, and CORS issues
 */

import { getApiUrl } from '../config';

interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
}

interface FetchOptions extends RequestInit {
  timeout?: number;
  retryOptions?: RetryOptions;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000,    // 10 seconds
  backoffFactor: 2
};

/**
 * Sleep utility for retry delays
 */
const sleep = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Check if an error should trigger a retry
 */
const shouldRetry = (error: any, attemptNumber: number, maxRetries: number): boolean => {
  if (attemptNumber >= maxRetries) return false;
  
  // Retry on network errors
  if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
    return true;
  }
  
  // Retry on server errors (5xx)
  if (error.name === 'HTTPError' && error.status >= 500) {
    return true;
  }
  
  // Retry on timeout
  if (error.name === 'AbortError' || error.name === 'TimeoutError') {
    return true;
  }
  
  return false;
};

/**
 * Calculate delay for exponential backoff
 */
const calculateDelay = (attemptNumber: number, options: RetryOptions): number => {
  const delay = options.initialDelay! * Math.pow(options.backoffFactor!, attemptNumber - 1);
  return Math.min(delay, options.maxDelay!);
};

/**
 * Enhanced fetch with retry logic, timeout, and better error handling
 */
export const fetchWithRetry = async (
  url: string, 
  options: FetchOptions = {}
): Promise<Response> => {
  const { 
    timeout = 15000,
    retryOptions = DEFAULT_RETRY_OPTIONS,
    ...fetchOptions 
  } = options;
  
  const retryConfig = { ...DEFAULT_RETRY_OPTIONS, ...retryOptions };
  let lastError: any;
  
  for (let attempt = 1; attempt <= retryConfig.maxRetries! + 1; attempt++) {
    try {
      console.log(`🌐 API Request (attempt ${attempt}/${retryConfig.maxRetries! + 1}): ${url}`);
      
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
          ...fetchOptions.headers,
        },
      });
      
      clearTimeout(timeoutId);
      
      // Check for HTTP errors
      if (!response.ok) {
        const error = new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
        (error as any).name = 'HTTPError';
        (error as any).status = response.status;
        (error as any).response = response;
        throw error;
      }
      
      console.log(`✅ API Success (attempt ${attempt}): ${response.status} ${response.statusText}`);
      return response;
      
    } catch (error: any) {
      lastError = error;
      console.warn(`⚠️ API Error (attempt ${attempt}):`, error.message);
      
      // Check if we should retry
      if (shouldRetry(error, attempt, retryConfig.maxRetries!)) {
        const delay = calculateDelay(attempt, retryConfig);
        console.log(`🔄 Retrying in ${delay}ms...`);
        await sleep(delay);
        continue;
      }
      
      // No more retries, throw the last error
      break;
    }
  }
  
  console.error(`❌ API Failed after ${retryConfig.maxRetries! + 1} attempts:`, lastError);
  throw lastError;
};

/**
 * API client with retry logic and consistent error handling
 */
export const apiClient = {
  get: async (endpoint: string, options: FetchOptions = {}) => {
    const url = `${getApiUrl()}${endpoint}`;
    const response = await fetchWithRetry(url, {
      method: 'GET',
      ...options,
    });
    return response.json();
  },
  
  post: async (endpoint: string, data?: any, options: FetchOptions = {}) => {
    const url = `${getApiUrl()}${endpoint}`;
    const response = await fetchWithRetry(url, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });
    return response.json();
  },
  
  put: async (endpoint: string, data?: any, options: FetchOptions = {}) => {
    const url = `${getApiUrl()}${endpoint}`;
    const response = await fetchWithRetry(url, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });
    return response.json();
  },
  
  delete: async (endpoint: string, options: FetchOptions = {}) => {
    const url = `${getApiUrl()}${endpoint}`;
    const response = await fetchWithRetry(url, {
      method: 'DELETE',
      ...options,
    });
    return response.json();
  }
};

/**
 * Test API connectivity with retry
 */
export const testApiConnectivity = async (): Promise<boolean> => {
  try {
    const response = await fetchWithRetry(`${getApiUrl()}/api/health`, {
      timeout: 5000,
      retryOptions: { maxRetries: 2 }
    });
    return response.ok;
  } catch (error) {
    console.error('API connectivity test failed:', error);
    return false;
  }
};

/**
 * Get cache-busted URL for static assets
 */
export const getCacheBustedUrl = (url: string): string => {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}_t=${Date.now()}`;
};
