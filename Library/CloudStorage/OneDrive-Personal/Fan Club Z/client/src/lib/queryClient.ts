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

// Base API configuration
const API_BASE_URL = getApiUrl()

// API client with error handling and timeout
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit & { params?: Record<string, string> } = {}
): Promise<T> {
  const { params, ...requestOptions } = options

  // Build URL with query parameters
  let url = `${API_BASE_URL}${endpoint}`
  if (params) {
    const searchParams = new URLSearchParams(params)
    url += `?${searchParams.toString()}`
  }

  // Get auth token from localStorage
  const token = localStorage.getItem('auth_token')
  
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
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error: any) {
    clearTimeout(timeout)
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please check your network connection and try again.')
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
