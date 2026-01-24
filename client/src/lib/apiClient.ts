/**
 * Unified API Client for Fan Club Z
 * 
 * Uses CapacitorHttp on native platforms to bypass CORS entirely.
 * Falls back to fetch on web.
 * 
 * This eliminates CORS preflight issues in iOS/Android Capacitor builds.
 */

import { Capacitor } from '@capacitor/core';
import { CapacitorHttp } from '@capacitor/core';
import { getApiUrl } from '@/utils/environment';

const API_BASE_URL = getApiUrl();
const API_VERSION = 'v2';
const API_URL = `${API_BASE_URL}/api/${API_VERSION}`;

// Auth helpers
const getAuthToken = () => localStorage.getItem('token');
const setAuthToken = (token: string) => localStorage.setItem('token', token);
const removeAuthToken = () => localStorage.removeItem('token');

// Check if running in native Capacitor shell
const isNative = () => Capacitor.isNativePlatform();

/**
 * Convert HeadersInit to a plain object for CapacitorHttp
 */
const headersToObject = (headers: HeadersInit): Record<string, string> => {
  if (headers instanceof Headers) {
    const obj: Record<string, string> = {};
    headers.forEach((value, key) => {
      obj[key] = value;
    });
    return obj;
  }
  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }
  return headers as Record<string, string>;
};

/**
 * Make HTTP request using CapacitorHttp (native) or fetch (web)
 */
async function httpRequest(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  endpoint: string,
  options?: {
    body?: any;
    headers?: HeadersInit;
  }
): Promise<any> {
  const url = `${API_URL}${endpoint}`;
  const token = getAuthToken();

  // Build headers
  const headers: Record<string, string> = {
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(options?.headers ? headersToObject(options.headers) : {}),
  };

  // Native: Use CapacitorHttp (bypasses CORS)
  if (isNative()) {
    try {
      // CapacitorHttp expects data as an object (not stringified)
      // It will automatically JSON.stringify for us
      const requestOptions: any = {
        url,
        method,
        headers,
      };

      // Only add data if body exists (for POST/PUT/PATCH)
      if (options?.body) {
        requestOptions.data = options.body;
      }

      const response = await CapacitorHttp.request(requestOptions);

      // CapacitorHttp returns { data, status, headers }
      if (response.status >= 200 && response.status < 300) {
        // CapacitorHttp automatically parses JSON responses
        // If data is already an object, return it; if string, try to parse
        if (typeof response.data === 'string') {
          try {
            return JSON.parse(response.data);
          } catch {
            return response.data;
          }
        }
        return response.data;
      }

      // Include response data in error for debugging
      const errorMessage = `HTTP error! status: ${response.status}`;
      console.error(`[CapacitorHttp] ${errorMessage}`, { 
        url, 
        method, 
        responseData: response.data 
      });
      throw new Error(errorMessage);
    } catch (error: any) {
      console.warn(`[CapacitorHttp] API call failed: ${endpoint}`, error);
      throw error;
    }
  }

  // Web: Use fetch
  try {
    const response = await fetch(url, {
      method,
      headers,
      body: options?.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.warn(`[fetch] API call failed: ${endpoint}`, error);
    throw error;
  }
}

/**
 * Unified API Client
 * Automatically uses CapacitorHttp on native, fetch on web
 */
export const apiClient = {
  get: async (endpoint: string, options?: RequestInit) => {
    // GET requests should NOT include Content-Type to avoid unnecessary preflight
    const headers: HeadersInit = {
      ...(options?.headers || {}),
    };
    
    return httpRequest('GET', endpoint, { headers });
  },

  post: async (endpoint: string, data?: any, options?: RequestInit) => {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    };
    
    return httpRequest('POST', endpoint, { body: data, headers });
  },

  put: async (endpoint: string, data?: any, options?: RequestInit) => {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    };
    
    return httpRequest('PUT', endpoint, { body: data, headers });
  },

  patch: async (endpoint: string, data?: any, options?: RequestInit) => {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    };
    
    return httpRequest('PATCH', endpoint, { body: data, headers });
  },

  delete: async (endpoint: string, options?: RequestInit) => {
    // DELETE requests should NOT include Content-Type unless there's a body
    const headers: Record<string, string> = {
      ...(options?.headers ? headersToObject(options.headers) : {}),
    };
    
    // Only add Content-Type if there's a body
    if (options?.body) {
      headers['Content-Type'] = 'application/json';
    }
    
    return httpRequest('DELETE', endpoint, { 
      body: options?.body ? (typeof options.body === 'string' ? JSON.parse(options.body) : options.body) : undefined,
      headers 
    });
  },
};

// Export auth helpers for compatibility
export { getAuthToken, setAuthToken, removeAuthToken };
export { API_BASE_URL, API_VERSION, API_URL };
