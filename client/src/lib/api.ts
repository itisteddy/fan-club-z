/**
 * Legacy API module - re-exports from unified apiClient
 * 
 * This maintains backward compatibility while using the new
 * CapacitorHttp-based client on native platforms.
 */

// Use the centralized Supabase client to avoid multiple instances
export { supabase } from '@/lib/supabase';

// Re-export everything from the unified API client
export {
  apiClient,
  getAuthToken,
  setAuthToken,
  removeAuthToken,
  API_BASE_URL,
  API_VERSION,
  API_URL,
} from '@/lib/apiClient';
