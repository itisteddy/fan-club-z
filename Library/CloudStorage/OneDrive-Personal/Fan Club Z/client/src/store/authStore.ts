import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { User, LoginRequest, RegisterRequest, AuthResponse } from '@shared/schema'
import { api } from '@/lib/queryClient'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  onboardingCompleted: boolean
}

interface AuthActions {
  login: (credentials: LoginRequest) => Promise<void>
  register: (userData: RegisterRequest) => Promise<void>
  logout: () => void
  updateUser: (userData: Partial<User>) => void
  completeOnboarding: () => void
  clearError: () => void
  setLoading: (loading: boolean) => void
}

type AuthStore = AuthState & AuthActions

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      onboardingCompleted: false,

      // Actions
      login: async (credentials) => {
        try {
          set({ isLoading: true, error: null })
          
          const response = await api.post<AuthResponse>('/users/login', credentials)
          
          if (response.success) {
            // Store auth token
            localStorage.setItem('auth_token', response.data.token)
            
            set({
              user: response.data.user,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            })
          } else {
            throw new Error(response.error || 'Login failed')
          }
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || 'Login failed. Please try again.',
          })
          throw error
        }
      },

      register: async (userData) => {
        try {
          set({ isLoading: true, error: null })
          
          const response = await api.post<AuthResponse>('/users/register', userData)
          
          if (response.success) {
            // Store auth token
            localStorage.setItem('auth_token', response.data.token)
            
            set({
              user: response.data.user,
              isAuthenticated: true,
              isLoading: false,
              error: null,
              onboardingCompleted: false, // New users need onboarding
            })
          } else {
            throw new Error(response.error || 'Registration failed')
          }
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || 'Registration failed. Please try again.',
          })
          throw error
        }
      },

      logout: () => {
        // Clear auth token
        localStorage.removeItem('auth_token')
        
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
          onboardingCompleted: false,
        })
      },

      updateUser: (userData) => {
        const currentUser = get().user
        if (currentUser) {
          set({
            user: { ...currentUser, ...userData },
          })
        }
      },

      completeOnboarding: () => {
        set({ onboardingCompleted: true })
      },

      clearError: () => {
        set({ error: null })
      },

      setLoading: (loading) => {
        set({ isLoading: loading })
      },
    }),
    {
      name: 'fan-club-z-auth',
      storage: createJSONStorage(() => localStorage),
      // Only persist specific fields
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        onboardingCompleted: state.onboardingCompleted,
      }),
    }
  )
)

// Auth helpers
export const getAuthToken = (): string | null => {
  return localStorage.getItem('auth_token')
}

export const isTokenValid = (token: string | null): boolean => {
  if (!token) return false
  
  try {
    // Basic JWT validation (check if it's not expired)
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp * 1000 > Date.now()
  } catch {
    return false
  }
}

// Initialize auth state from token on app load
export const initializeAuth = async () => {
  const token = getAuthToken()
  
  if (token && isTokenValid(token)) {
    try {
      // Validate token with server and get fresh user data
      const response = await api.get<{ user: User }>('/users/me')
      
      if (response.success) {
        useAuthStore.setState({
          user: response.data.user,
          isAuthenticated: true,
        })
      } else {
        // Token is invalid, clear it
        useAuthStore.getState().logout()
      }
    } catch (error) {
      // Token is invalid or network error, clear it
      useAuthStore.getState().logout()
    }
  } else {
    // No valid token, ensure user is logged out
    useAuthStore.getState().logout()
  }
}
