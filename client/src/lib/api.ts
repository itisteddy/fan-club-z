// Use the singleton Supabase client
import { supabase } from './supabase';

// API configuration
import { getApiUrl } from './environment';
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
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
          ...options?.headers,
        },
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
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
          ...options?.headers,
        },
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
