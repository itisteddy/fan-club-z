import { createClient } from '@supabase/supabase-js';

// Supabase configuration (optional for now)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Only initialize Supabase if we have real credentials
let supabase = null;
if (supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('demo')) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
  } catch (error) {
    console.warn('Supabase not configured, using demo mode');
  }
}

export { supabase };

// API configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
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
