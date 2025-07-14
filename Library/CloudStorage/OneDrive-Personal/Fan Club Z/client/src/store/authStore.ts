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
          console.log('🚀 Auth Store: Starting login with credentials:', credentials)
          set({ isLoading: true, error: null })
          
          // Special handling for demo login to ensure it works reliably
          if (credentials.email === 'demo@fanclubz.app' && credentials.password === 'demo123') {
          console.log('🚀 Auth Store: Demo login detected, using optimized flow')
          
          // Clear any existing tokens first
          localStorage.removeItem('auth_token')
          localStorage.removeItem('accessToken')
          localStorage.removeItem('refreshToken')
          
          try {
            const response: { success: boolean, error?: string, data?: AuthResponse, details?: any } = await api.post('/users/login', credentials)
            console.log('🚀 Auth Store: Demo login response:', response)
            
          if (response.success && response.data) {
            console.log('✅ Auth Store: Demo login successful, storing tokens and user data')
            
            // Store tokens immediately
            localStorage.setItem('accessToken', response.data.accessToken)
            localStorage.setItem('refreshToken', response.data.refreshToken)
            localStorage.setItem('auth_token', response.data.accessToken)
            
            // Set authentication state immediately and synchronously
          set({
            user: response.data.user,
            isAuthenticated: true,
            isLoading: false,
              error: null,
            })
            
            console.log('✅ Auth Store: Demo user state updated immediately, user:', response.data.user)
            console.log('✅ Auth Store: Authentication status:', true)
            
            // Verify the state was set correctly
            const currentState = get()
          console.log('✅ Auth Store: Current state verification:', {
            isAuthenticated: currentState.isAuthenticated,
            userId: currentState.user?.id,
              userEmail: currentState.user?.email
            })
            
            // Connect WebSocket for real-time notifications
          try {
              notificationService.connect()
          } catch (wsError) {
              console.warn('⚠️ WebSocket connection failed (non-critical):', wsError)
            }
            
              return // Exit early for demo login
          } else {
            console.error('❌ Auth Store: Demo login failed - no success/data in response')
            const errorObj: any = new Error(response.error || 'Demo login failed')
            if (response.details) errorObj.response = { details: response.details }
              throw errorObj
              }
        } catch (apiError: any) {
          console.error('❌ Auth Store: Demo login API error:', apiError)
          
          // Enhanced error handling for demo login
          if (apiError.message?.includes('Network error') || apiError.message?.includes('Failed to fetch')) {
            throw new Error('Backend server is not running. Please start the server with: npm run dev (in server directory)')
          } else if (apiError.message?.includes('timed out')) {
            throw new Error('Backend server is not responding. Please check if the server is running.')
          } else {
            throw apiError
          }
        }
      }
          
          // Regular login flow for non-demo users
          const response: { success: boolean, error?: string, data?: AuthResponse, details?: any } = await api.post('/users/login', credentials)
          console.log('🚀 Auth Store: Login response:', response)
          
          if (response.success && response.data) {
            console.log('✅ Auth Store: Login successful, storing tokens and user data')
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
            
            console.log('✅ Auth Store: User state updated, user:', response.data.user)
            
            // Connect WebSocket for real-time notifications
            notificationService.connect()
          } else {
            console.error('❌ Auth Store: Login failed - no success/data in response')
            const errorObj: any = new Error(response.error || 'Login failed')
            if (response.details) errorObj.response = { details: response.details }
            throw errorObj
          }
        } catch (error: any) {
          console.error('❌ Auth Store: Login error:', error)
          set({
            isLoading: false,
            error: error.message || 'Login failed. Please try again.',
            isAuthenticated: false,
            user: null
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
        console.log('💪 Auth Store: Logging out user')
        
        // Clear auth tokens
        localStorage.removeItem('auth_token')
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        
        // Disconnect WebSocket
        try {
          notificationService.destroy()
        } catch (wsError) {
          console.warn('⚠️ WebSocket cleanup failed (non-critical):', wsError)
        }
        
        // Clear state
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
          onboardingCompleted: false,
        })
        
        console.log('✅ Auth Store: Logout complete')
      },

      updateUser: async (userData: Partial<User>) => {
        console.log('🔄 AuthStore: Updating user with data:', userData)
        try {
          const response: { success: boolean, error?: string, data?: AuthResponse } = await api.patch('/users/me', userData)
          console.log('🔄 AuthStore: Update response:', response)
          
          if (response.success && response.data?.user) {
            const updatedUser = response.data.user
            console.log('✅ AuthStore: User updated successfully:', updatedUser)
            set({ user: updatedUser })
            return updatedUser
          } else {
            console.error('❌ AuthStore: Update failed:', response.error)
            throw new Error(response.error || 'Failed to update profile')
          }
        } catch (error) {
          console.error('❌ AuthStore: Update error:', error)
          throw error
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
        set({ user, isAuthenticated: true })
      },

      setToken: (token: string) => {
        localStorage.setItem('auth_token', token)
        set({ isAuthenticated: true })
      },
    }),
    {
      name: 'fan-club-z-auth',
      storage: createJSONStorage(() => localStorage),
      // Only persist specific fields and include isAuthenticated
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        onboardingCompleted: state.onboardingCompleted,
      }),
      // Custom hydration to ensure consistent state
      onRehydrateStorage: () => (state) => {
        if (state) {
          console.log('🔄 Auth Store: Rehydrating from storage:', {
            hasUser: !!state.user,
            isAuthenticated: state.isAuthenticated,
            userId: state.user?.id
          })
          
          // Verify token is still valid if user is marked as authenticated
          if (state.isAuthenticated && state.user) {
            const token = localStorage.getItem('auth_token')
            if (!token || !isTokenValid(token)) {
              console.log('⚠️ Auth Store: Invalid token during rehydration, clearing auth state')
              state.user = null
              state.isAuthenticated = false
            } else {
              console.log('✅ Auth Store: Valid token found during rehydration')
            }
          }
        }
      },
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
  
  console.log('🔐 Initialize Auth: Starting with token:', token ? 'present' : 'missing')
  
  if (token && isTokenValid(token)) {
    try {
      console.log('🔐 Initializing auth with existing token...')
      
      // Decode JWT and check for demo user
      let isDemoToken = false
      let demoUserId = null
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        console.log('🔐 Token payload:', payload)
        if (payload.userId === 'demo-user-id' || payload.email === 'demo@fanclubz.app') {
          isDemoToken = true
          demoUserId = payload.userId
        }
      } catch (e) {
        // fallback to old check
        isDemoToken = token.includes('demo') || token === 'demo-token'
      }
      
      if (isDemoToken) {
        console.log('🔐 Demo user token detected, bypassing server validation')
        // For demo users, create a demo user object and set authentication
        const demoUser = {
          id: demoUserId || 'demo-user-id',
          email: 'demo@fanclubz.app',
          phone: '+10000000000',
          username: 'demouser',
          firstName: 'Demo',
          lastName: 'User',
          dateOfBirth: '1990-01-01',
          walletAddress: 'demo-wallet',
          kycLevel: 'none',
          walletBalance: 2500,
          profileImage: null,
          coverImage: null,
          bio: 'Demo user for testing',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        
        // Set state immediately and synchronously
        useAuthStore.setState({
          user: demoUser,
          isAuthenticated: true,
          isLoading: false,
          error: null
        })
        
        console.log('✅ Demo auth initialized successfully')
        console.log('✅ Demo user state:', {
          isAuthenticated: true,
          userId: demoUser.id,
          email: demoUser.email
        })
        return
      }
      
      // For non-demo users, validate token with server and get fresh user data
      const response = await api.get<{ user: User }>('/users/me')
      if (response.user) {
        console.log('✅ Auth initialized successfully with user:', response.user.email)
        useAuthStore.setState({
          user: response.user,
          isAuthenticated: true,
          isLoading: false,
          error: null
        })
      } else {
        console.log('❌ Auth initialization failed - no user data')
        useAuthStore.getState().logout()
      }
    } catch (error) {
      console.log('❌ Auth initialization failed - token invalid:', error)
      useAuthStore.getState().logout()
    }
  } else {
    console.log('🔐 No valid token found, setting unauthenticated state')
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null
    })
  }
}
