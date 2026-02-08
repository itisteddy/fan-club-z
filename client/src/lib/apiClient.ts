/**
 * Unified API Client for Fan Club Z
 *
 * - Uses CapacitorHttp on native (iOS/Android) to bypass CORS; fetch on web.
 * - Auth: getAuthHeaders() returns Supabase session token (or localStorage fallback).
 *   Use for both fetch and CapacitorHttp so auth is consistent on web and native.
 * - All requests use the same auth header builder for consistency.
 * - Throws ApiError with status/message/url for 401/404 so callers can show user-facing messages.
 * - Do NOT retry by switching endpoints (e.g. no fallback to /api/v2/comments/...).
 *
 * Canonical comments endpoints (single source; no fallback):
 *   GET/POST  /api/v2/social/predictions/:predictionId/comments
 *   PUT/DELETE /api/v2/social/comments/:commentId
 */

import { Capacitor } from '@capacitor/core';
import { CapacitorHttp } from '@capacitor/core';
import { getApiUrl } from '@/utils/environment';
import { supabase } from '@/lib/supabase';

// Legacy named exports retained for compatibility with old imports.
export const API_BASE_URL = getApiUrl();
export const API_VERSION = 'v2';
const joinUrl = (base: string, path: string) => {
  // Safely join URL parts without double slashes
  const b = String(base || '').replace(/\/+$/, '');
  const p = String(path || '').replace(/^\/+/, '');
  return `${b}/${p}`;
};
const getApiBaseUrl = () => joinUrl(getApiUrl(), `/api/${API_VERSION}`);
export const API_URL = joinUrl(API_BASE_URL, `/api/${API_VERSION}`);

// Auth helpers (sync, for compatibility)
const getAuthToken = () => localStorage.getItem('token');
const setAuthToken = (token: string) => localStorage.setItem('token', token);
const removeAuthToken = () => localStorage.removeItem('token');

/** Structured error from API (401/404 etc.) so UI can show specific messages. */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public url?: string,
    public responseData?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Best-effort access token lookup.
 *
 * Order:
 * - Supabase session access_token (authoritative)
 * - Persisted auth store token (Zustand) for native/web parity
 * - Legacy localStorage token key (compat)
 *
 * Never logs the token value.
 */
async function getAccessToken(): Promise<string | null> {
  // 1) Supabase session (authoritative)
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) return token;
  } catch (e) {
    // Non-fatal: fall through to persisted storage
    console.warn('[apiClient] supabase.getSession failed (non-fatal)');
  }

  // 2) Persisted auth store token (zustand persist: fanclubz-auth-storage)
  try {
    const raw = localStorage.getItem('fanclubz-auth-storage');
    if (raw) {
      const parsed = JSON.parse(raw);
      const token = parsed?.state?.token;
      if (typeof token === 'string' && token.trim()) return token.trim();
    }
  } catch {
    // ignore
  }

  // 3) Legacy fallback token key
  const legacy = getAuthToken();
  if (legacy) return legacy;

  // 4) Supabase persisted storage fallback (sb-<ref>-auth-token)
  // Handles native/web cases where session exists but getSession() is temporarily stale.
  try {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith('sb-') && k.endsWith('-auth-token'));
    for (const key of keys) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const token =
        parsed?.access_token ||
        parsed?.currentSession?.access_token ||
        parsed?.session?.access_token ||
        (Array.isArray(parsed) ? parsed[0]?.access_token : undefined);
      if (typeof token === 'string' && token.trim()) return token.trim();
    }
  } catch {
    // ignore
  }

  return null;
}

/**
 * Build auth headers from Supabase session (or persisted token fallback).
 * Use this for both fetch and CapacitorHttp so auth is consistent on web and native.
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await getAccessToken();
  // Always include X-FCZ-Client so server can apply correct gating
  // (crypto staking is web-only today; missing header defaults to client=unknown and 403s).
  const clientHeader = { 'X-FCZ-Client': getFczClientHeader() } as const;
  return token ? { Authorization: `Bearer ${token}`, ...clientHeader } : { ...clientHeader };
}

// Check if running in native Capacitor shell
const isNative = () => Capacitor.isNativePlatform();

/** Client identifier for server gating (web vs native). Sent as X-FCZ-Client on every request. */
export function getFczClientHeader(): 'web' | 'ios' | 'android' {
  if (typeof Capacitor?.isNativePlatform !== 'function') return 'web';
  if (Capacitor.isNativePlatform()) {
    const p = Capacitor.getPlatform();
    if (p === 'ios' || p === 'android') return p;
  }
  return 'web';
}

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
 * Make HTTP request using CapacitorHttp (native) or fetch (web).
 * Always includes auth via getAuthHeaders(). Throws ApiError on 401/404 with clear message/url.
 */
async function httpRequest(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  endpoint: string,
  options?: {
    body?: any;
    headers?: HeadersInit;
  }
): Promise<any> {
  const url = joinUrl(getApiBaseUrl(), endpoint);
  const authHeaders = await getAuthHeaders();
  const headers: Record<string, string> = {
    ...authHeaders,
    'X-FCZ-Client': getFczClientHeader(),
    ...(options?.headers ? headersToObject(options.headers) : {}),
  };

  // Structured logging: one line per request (auth present or not)
  const hasAuth = Boolean(headers.Authorization);
  console.log(`[apiClient] ${method} ${endpoint} ${hasAuth ? '(with auth)' : '(no auth)'}`);

  const throwApiError = (status: number, message: string, responseData?: unknown) => {
    if (status === 401) {
      console.warn('[apiClient] 401 – Authorization required. URL:', url);
    }
    if (status === 404) {
      console.error('[apiClient] 404 – Server endpoint not found. Exact URL used:', url);
    }
    throw new ApiError(message, status, url, responseData);
  };

  // Native: Use CapacitorHttp (bypasses CORS)
  if (isNative()) {
    try {
      const requestOptions: any = {
        url,
        method,
        headers,
      };
      if (options?.body) {
        requestOptions.data = options.body;
      }

      const response = await CapacitorHttp.request(requestOptions);

      if (response.status >= 200 && response.status < 300) {
        if (typeof response.data === 'string') {
          try {
            return JSON.parse(response.data);
          } catch {
            return response.data;
          }
        }
        return response.data;
      }

      if (response.status === 401) {
        throwApiError(401, 'Session expired. Please log in again.', response.data);
      }
      if (response.status === 404) {
        throwApiError(404, 'Server endpoint not found', response.data);
      }
      console.error(`[CapacitorHttp] HTTP ${response.status}`, { url, method, responseData: response.data });
      throwApiError(response.status, `HTTP error ${response.status}`, response.data);
    } catch (error: any) {
      if (error instanceof ApiError) throw error;
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

    if (response.ok) {
      return response.json();
    }

    const responseData = await response.json().catch(() => ({}));
    if (response.status === 401) {
      throwApiError(401, 'Session expired. Please log in again.', responseData);
    }
    if (response.status === 404) {
      throwApiError(404, 'Server endpoint not found', responseData);
    }
    const message = (responseData as any)?.message ?? (responseData as any)?.error ?? `HTTP error ${response.status}`;
    throwApiError(response.status, typeof message === 'string' ? message : `HTTP error ${response.status}`, responseData);
  } catch (error: any) {
    if (error instanceof ApiError) throw error;
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
