// Use the centralized Supabase client to avoid multiple instances
export { supabase } from '@/lib/supabase';

// API configuration
import { getApiUrl } from '@/utils/environment';
export const API_BASE_URL = getApiUrl();
export const API_VERSION = 'v2';
export const API_URL = `${API_BASE_URL}/api/${API_VERSION}`;

// Auth helpers
// Use consistent token key across the application
export const getAuthToken = () => localStorage.getItem('token');
export const setAuthToken = (token: string) => localStorage.setItem('token', token);
export const removeAuthToken = () => localStorage.removeItem('token');

// API client with auth
export const apiClient = {
  get: async (endpoint: string, options?: RequestInit) => {
    const token = getAuthToken();
    
    try {
      // GET requests should NOT include Content-Type to avoid unnecessary preflight
      const headers: HeadersInit = {
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options?.headers,
      };
      
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'GET',
        headers,
        ...options,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    } catch (error) {
      console.warn(`API call failed: ${endpoint}`, error);
      throw error;
    }
  },
  
  post: async (endpoint: string, data?: any, options?: RequestInit) => {
    const token = getAuthToken();
    
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
          ...options?.headers,
        },
        body: data ? JSON.stringify(data) : undefined,
        ...options,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    } catch (error) {
      console.warn(`API call failed: ${endpoint}`, error);
      throw error;
    }
  },
  
  put: async (endpoint: string, data?: any, options?: RequestInit) => {
    const token = getAuthToken();
    
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
          ...options?.headers,
        },
        body: data ? JSON.stringify(data) : undefined,
        ...options,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    } catch (error) {
      console.warn(`API call failed: ${endpoint}`, error);
      throw error;
    }
  },
  
  delete: async (endpoint: string, options?: RequestInit) => {
    const token = getAuthToken();
    
    try {
      // DELETE requests should NOT include Content-Type unless there's a body
      const headers: HeadersInit = {
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options?.headers,
      };
      
      // Only add Content-Type if there's a body
      if (options?.body) {
        headers['Content-Type'] = 'application/json';
      }
      
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'DELETE',
        headers,
        ...options,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    } catch (error) {
      console.warn(`API call failed: ${endpoint}`, error);
      throw error;
    }
  },
};
