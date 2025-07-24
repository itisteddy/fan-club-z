import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User, LoginRequest, RegisterRequest, AuthResponse } from '@shared/schema';
import { api } from '@/lib/queryClient';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  onboardingCompleted: boolean;
}

interface AuthActions {
  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => Promise<User>;
  completeOnboarding: () => void;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
}

type AuthStore = AuthState & AuthActions;

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
          set({ isLoading: true, error: null });
          
          const response: { success: boolean, error?: string, data?: AuthResponse } = await api.post('/users/login', credentials);
          
          if (response && response.success && response.data) {
            // Store tokens
            localStorage.setItem('auth_token', response.data.accessToken);
            localStorage.setItem('accessToken', response.data.accessToken);
            
            // Check if user completed onboarding (enhanced check)
            const hasCompletedOnboarding = checkOnboardingCompletion();
            
            set({
              user: response.data.user,
              isAuthenticated: true,
              isLoading: false,
              error: null,
              onboardingCompleted: hasCompletedOnboarding
            });
          } else {
            throw new Error(response?.error || 'Unable to sign in. Please try again.');
          }
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || 'Unable to sign in. Please try again.',
            isAuthenticated: false,
            user: null
          });
          throw error;
        }
      },

      register: async (userData) => {
        try {
          set({ isLoading: true, error: null });
          
          const response: { success: boolean, error?: string, data?: AuthResponse } = await api.post('/users/register', userData);
          
          if (response.success && response.data) {
            // Store tokens
            localStorage.setItem('auth_token', response.data.accessToken);
            localStorage.setItem('accessToken', response.data.accessToken);
            
            set({
              user: response.data.user,
              isAuthenticated: true,
              isLoading: false,
              error: null,
              onboardingCompleted: false, // New users always need onboarding
            });
          } else {
            throw new Error(response.error || 'Unable to create account. Please try again.');
          }
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || 'Unable to create account. Please try again.',
          });
          throw error;
        }
      },

      logout: () => {
        // Clear all auth data
        localStorage.removeItem('auth_token');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('compliance_status');
        
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
          onboardingCompleted: false,
        });
      },

      updateUser: async (userData: Partial<User>) => {
        try {
          const response: { success: boolean, error?: string, data?: AuthResponse } = await api.patch('/users/me', userData);
          
          if (response.success && response.data?.user) {
            const updatedUser = response.data.user;
            set({ user: updatedUser });
            return updatedUser;
          } else {
            throw new Error(response.error || 'Unable to update profile. Please try again.');
          }
        } catch (error) {
          throw error;
        }
      },

      completeOnboarding: () => {
        const complianceStatus = {
          ageVerified: true,
          privacyAccepted: true,
          termsAccepted: true,
          responsibleGamblingAcknowledged: true,
          completedAt: new Date().toISOString()
        };
        localStorage.setItem('compliance_status', JSON.stringify(complianceStatus));
        set({ onboardingCompleted: true });
      },

      clearError: () => set({ error: null }),
      setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: 'fan-club-z-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        onboardingCompleted: state.onboardingCompleted,
      }),
    }
  )
);

// Helper functions
export const getAuthToken = (): string | null => {
  return localStorage.getItem('auth_token');
};

export const isAuthenticated = (): boolean => {
  const token = getAuthToken();
  const { user } = useAuthStore.getState();
  return !!(token && user);
};

// Helper function to check onboarding completion from multiple sources
const checkOnboardingCompletion = (): boolean => {
  try {
    // Method 1: Check simple completion flag
    const simpleFlag = localStorage.getItem('onboarding_completed');
    if (simpleFlag === 'true') {
      return true;
    }

    // Method 2: Check compliance status
    const complianceStatus = localStorage.getItem('compliance_status');
    if (complianceStatus) {
      try {
        const compliance = JSON.parse(complianceStatus);
        if (compliance.completedAt) {
          return true;
        }
      } catch (e) {
        // Invalid JSON, ignore
      }
    }

    // Method 3: Check auth store persisted state
    const authState = localStorage.getItem('fan-club-z-auth');
    if (authState) {
      try {
        const parsed = JSON.parse(authState);
        if (parsed.state?.onboardingCompleted) {
          return true;
        }
      } catch (e) {
        // Invalid JSON, ignore
      }
    }

    return false;
  } catch (error) {
    return false;
  }
};

// Simple initialization with improved error handling
export const initializeAuth = async () => {
  const token = getAuthToken();
  
  if (token) {
    try {
      const response = await api.get<{ user: User }>('/users/me');
      if (response.user) {
        const onboardingCompleted = checkOnboardingCompletion();
        
        useAuthStore.setState({
          user: response.user,
          isAuthenticated: true,
          onboardingCompleted
        });
      } else {
        useAuthStore.getState().logout();
      }
    } catch (error) {
      // Silently handle auth initialization failures to prevent UI disruption
      useAuthStore.getState().logout();
    }
  }
};