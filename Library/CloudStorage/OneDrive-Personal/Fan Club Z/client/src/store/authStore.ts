import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { User, LoginRequest, RegisterRequest, AuthResponse } from '@shared/schema'
import { api } from '@/lib/queryClient'
import { useToast } from '@/hooks/use-toast'
import { notificationService } from '@/services/notificationService'

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
  setUser: (user: User) => void
  setToken: (token: string) => void
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
          const response: { success: boolean, error?: string, data?: AuthResponse, details?: any } = await api.post('/users/login', credentials)
          if (response.success && response.data) {
            // Store both access and refresh tokens
            localStorage.setItem('accessToken', response.data.accessToken)
            localStorage.setItem('refreshToken', response.data.refreshToken)
            localStorage.setItem('auth_token', response.data.accessToken) // Keep for backward compatibility
            
            set({
              user: response.data.user,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            })
            
            // Connect WebSocket for real-time notifications
            notificationService.connect()
          } else {
            const errorObj: any = new Error(response.error || 'Login failed')
            if (response.details) errorObj.response = { details: response.details }
            throw errorObj
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
          console.log('🚀 Auth Store: Starting registration API call...')
          console.log('User data:', userData)
          
          set({ isLoading: true, error: null })
          
          console.log('🚀 Auth Store: Making POST request to /users/register')
          const response: { success: boolean, error?: string, data?: AuthResponse, details?: any } = await api.post('/users/register', userData)
          
          console.log('🚀 Auth Store: Got response:', response)
          
          if (response.success && response.data) {
            console.log('✅ Auth Store: Registration successful, storing tokens...')
            
            // Store both access and refresh tokens
            localStorage.setItem('accessToken', response.data.accessToken)
            localStorage.setItem('refreshToken', response.data.refreshToken)
            localStorage.setItem('auth_token', response.data.accessToken) // Keep for backward compatibility
            
            set({
              user: response.data.user,
              isAuthenticated: true,
              isLoading: false,
              error: null,
              onboardingCompleted: false,
            })
            
            console.log('✅ Auth Store: State updated, connecting WebSocket...')
            
            // Connect WebSocket for real-time notifications
            notificationService.connect()
          } else {
            console.error('❌ Auth Store: Registration failed - no success/data in response')
            const errorObj: any = new Error(response.error || 'Registration failed')
            if (response.details) errorObj.response = { details: response.details }
            throw errorObj
          }
        } catch (error: any) {
          console.error('❌ Auth Store: Registration error:', error)
          set({
            isLoading: false,
            error: error.message || 'Registration failed. Please try again.',
          })
          throw error
        }
      },

      logout: () => {
        // Clear auth tokens
        localStorage.removeItem('auth_token')
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        
        // Disconnect WebSocket
        notificationService.destroy()
        
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
          onboardingCompleted: false,
        })
      },

      updateUser: async (userData: Partial<User>) => {
        const response: { success: boolean, error?: string, data?: AuthResponse } = await api.patch('/users/me', userData)
        if (response.success && response.data?.user) {
          set({ user: response.data.user })
          return response.data.user
        } else {
          throw new Error(response.error || 'Failed to update profile')
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

      setUser: (user: User) => {
        set({ user })
      },

      setToken: (token: string) => {
        localStorage.setItem('auth_token', token)
        set({ isAuthenticated: true })
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
      if (response.user) {
        useAuthStore.setState({
          user: response.user,
          isAuthenticated: true,
        })
      } else {
        useAuthStore.getState().logout()
      }
    } catch (error) {
      useAuthStore.getState().logout()
    }
  } else {
    useAuthStore.getState().logout()
  }
}
