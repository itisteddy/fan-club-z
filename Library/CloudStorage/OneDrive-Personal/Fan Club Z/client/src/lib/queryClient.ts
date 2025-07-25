import { QueryClient } from '@tanstack/react-query'
import { getApiUrl } from './utils'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors except 408, 429
        if (error?.status >= 400 && error?.status < 500 && ![408, 429].includes(error.status)) {
          return false
        }
        return failureCount < 3
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
})

// Base API configuration with fallback URLs
const FALLBACK_API_URLS = [
  'http://localhost:5001/api',      // Local backend (correct port)
  'http://172.20.1.100:5001/api',  // Network backend (correct port)
  '/api'                           // Vite proxy fallback
]

let API_BASE_URL = getApiUrl()
let workingApiUrl: string | null = null

// Test API connectivity and find working URL
async function findWorkingApiUrl(): Promise<string> {
  if (workingApiUrl) return workingApiUrl
  
  // First try the configured URL
  try {
    const response = await fetch(`${API_BASE_URL}/health`, { 
      method: 'GET',
      signal: AbortSignal.timeout(3000)
    })
    if (response.ok) {
      workingApiUrl = API_BASE_URL
      return API_BASE_URL
    }
  } catch (error) {
    // Silently handle connection errors
  }
  
  // Try fallback URLs
  for (const url of FALLBACK_API_URLS) {
    if (url === API_BASE_URL) continue // Skip if already tried
    
    try {
      const response = await fetch(`${url}/health`, { 
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      })
      if (response.ok) {
        workingApiUrl = url
        return url
      }
    } catch (error) {
      // Silently handle connection errors
    }
  }
  
  // If no URL works, return the original
  workingApiUrl = API_BASE_URL
  return API_BASE_URL
}

// API client with error handling and timeout
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit & { params?: Record<string, string> } = {}
): Promise<T> {
  const { params, ...requestOptions } = options

  // In development, use Vite proxy (relative URL)
  // In production, use the working API URL
  let baseUrl: string
  // @ts-ignore - Vite provides import.meta.env
  if (import.meta.env.DEV) {
    baseUrl = '/api' // Use Vite proxy
  } else {
    baseUrl = await findWorkingApiUrl()
  }

  // Build URL with query parameters
  let url = `${baseUrl}${endpoint}`
  if (params) {
    const searchParams = new URLSearchParams(params)
    url += `?${searchParams.toString()}`
  }

  // Get auth token from localStorage (try both possible keys)
  const token = localStorage.getItem('accessToken') || localStorage.getItem('auth_token')
  
  // Default headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((requestOptions.headers as Record<string, string>) || {}),
  }

  // Add auth header if token exists
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  // Add timeout (10 seconds)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)

  try {
    const response = await fetch(url, {
      ...requestOptions,
      headers,
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!response.ok) {
      let errorData: any = {}
      try {
        errorData = await response.json()
      } catch {
        // If JSON parsing fails, create basic error object
        errorData = { error: `HTTP ${response.status}: ${response.statusText}` }
      }
      
      // Create error object with all backend error fields
      const err: any = new Error(errorData.error || errorData.message || `HTTP error! status: ${response.status}`)
      err.status = response.status
      err.response = errorData  // Keep the full response for the auth store
      if (errorData.details) err.details = errorData.details
      throw err
    }

    const data = await response.json()
    return data
  } catch (error: any) {
    clearTimeout(timeout)
    
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please check your network connection and try again.')
    }
    
    // If it's already a structured error from response handling, re-throw it
    if (error.status || error.response) {
      throw error
    }
    
    // Handle network errors
    if (error.message?.includes('Failed to fetch') || error.message?.includes('Network request failed')) {
      throw new Error('Network error. Please check your connection and try again.')
    }
    
    throw new Error(error.message || 'Network error. Please check your connection and try again.')
  }
}

// Convenient methods for different HTTP verbs
export const api = {
  get: <T>(endpoint: string, params?: Record<string, string>) =>
    apiRequest<T>(endpoint, { method: 'GET', params }),

  post: <T>(endpoint: string, data?: any) =>
    apiRequest<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T>(endpoint: string, data?: any) =>
    apiRequest<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),

  patch: <T>(endpoint: string, data?: any) =>
    apiRequest<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T>(endpoint: string) =>
    apiRequest<T>(endpoint, { method: 'DELETE' }),
}

// Query keys factory
export const queryKeys = {
  // Auth
  user: ['user'] as const,
  userProfile: (id: string) => ['user', 'profile', id] as const,

  // Bets
  bets: ['bets'] as const,
  betsList: (filters?: Record<string, any>) => ['bets', 'list', filters] as const,
  bet: (id: string) => ['bets', id] as const,
  betComments: (id: string) => ['bets', id, 'comments'] as const,
  userBets: (userId: string) => ['bets', 'user', userId] as const,
  trendingBets: ['bets', 'trending'] as const,

  // Bet Entries
  betEntries: ['bet-entries'] as const,
  userBetEntries: (userId: string) => ['bet-entries', 'user', userId] as const,

  // User Stats
  userStats: (userId: string) => ['user', 'stats', userId] as const,

  // Clubs
  clubs: ['clubs'] as const,
  clubsList: (filters?: Record<string, any>) => ['clubs', 'list', filters] as const,
  club: (id: string) => ['clubs', id] as const,
  clubBets: (id: string) => ['clubs', id, 'bets'] as const,
  clubMembers: (id: string) => ['clubs', id, 'members'] as const,
  clubDiscussions: (id: string) => ['clubs', id, 'discussions'] as const,
  userClubs: (userId: string) => ['clubs', 'user', userId] as const,

  // Discussions
  discussion: (id: string) => ['discussions', id] as const,
  discussionComments: (id: string) => ['discussions', id, 'comments'] as const,

  // Wallet
  wallet: ['wallet'] as const,
  walletBalance: (userId: string) => ['wallet', 'balance', userId] as const,
  transactions: (userId: string) => ['wallet', 'transactions', userId] as const,

  // Leaderboards
  leaderboard: (type: string) => ['leaderboard', type] as const,

  // Social
  comments: (targetType: string, targetId: string) => ['comments', targetType, targetId] as const,
}

// React Query hooks will be created in separate hook files
export type ApiResponse<T> = {
  success: boolean
  data: T
  message?: string
  error?: string
}

export type PaginatedResponse<T> = ApiResponse<{
  items: T[]
  total: number
  page: number
  limit: number
  hasNext: boolean
  hasPrev: boolean
}>