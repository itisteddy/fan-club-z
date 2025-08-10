import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { supabase, auth } from '../lib/supabase';
import toast from 'react-hot-toast';
import { showSuccess, showError, showWarning, showInfo } from './notificationStore';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatar?: string;
  bio?: string;
  // Analytics fields
  totalEarnings?: number;
  totalInvested?: number;
  winRate?: number;
  activePredictions?: number;
  totalPredictions?: number;
  rank?: number;
  level?: string;
  createdAt?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  loading: boolean;
  initialized: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (profileData: any) => Promise<void>;
  initializeAuth: () => Promise<void>;
}

// Convert Supabase user to our User interface
const convertSupabaseUser = (supabaseUser: any): User | null => {
  if (!supabaseUser) return null;
  
  const metadata = supabaseUser.user_metadata || {};
  const fullName = metadata.full_name || '';
  const nameParts = fullName.split(' ');
  
  // Calculate analytics based on user data
  const totalPredictions = metadata.totalPredictions || 0;
  const totalWins = metadata.totalWins || 0;
  const totalEarnings = metadata.totalEarnings || 0;
  const totalInvested = metadata.totalInvested || 0;
  const activePredictions = metadata.activePredictions || 0;
  
  const winRate = totalPredictions > 0 ? Math.round((totalWins / totalPredictions) * 100) : 0;
  const rank = metadata.rank || Math.floor(Math.random() * 1000) + 1; // Fallback rank
  const level = getLevelFromStats(totalPredictions, winRate, totalEarnings);
  
  return {
    id: supabaseUser.id,
    email: supabaseUser.email || '',
    firstName: metadata.firstName || metadata.first_name || nameParts[0] || 'User',
    lastName: metadata.lastName || metadata.last_name || nameParts.slice(1).join(' ') || '',
    phone: supabaseUser.phone,
    avatar: metadata.avatar_url,
    bio: metadata.bio,
    // Analytics fields
    totalEarnings,
    totalInvested,
    winRate,
    activePredictions,
    totalPredictions,
    rank,
    level,
    createdAt: supabaseUser.created_at || new Date().toISOString()
  };
};

// Helper function to determine user level based on stats
const getLevelFromStats = (totalPredictions: number, winRate: number, totalEarnings: number): string => {
  if (totalPredictions === 0) return 'New Predictor';
  if (totalPredictions < 5) return 'Rookie Predictor';
  if (totalPredictions < 20) return 'Bronze Predictor';
  if (totalPredictions < 50) return 'Silver Predictor';
  if (totalPredictions < 100) return 'Gold Predictor';
  if (totalPredictions < 200) return 'Platinum Predictor';
  if (totalPredictions < 500) return 'Diamond Predictor';
  return 'Legendary Predictor';
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
  isAuthenticated: false,
  user: null,
  token: null,
  loading: false,
  initialized: false,

  initializeAuth: async () => {
    const currentState = get();
    
    // If we have persisted auth state, show it immediately to prevent logout flash
    if (currentState.isAuthenticated && currentState.user && !currentState.initialized) {
      console.log('🔄 Using persisted auth state while verifying with Supabase...');
      set({ loading: false, initialized: false }); // Keep showing authenticated state
    } else {
      set({ loading: true });
    }
    
    try {
      console.log('🔐 Initializing authentication...');
      
      // For local development, use mock authentication if explicitly enabled
      if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_AUTH === 'true') {
        console.log('🔧 Using mock authentication for development');
        set({ 
          isAuthenticated: false, 
          user: null, 
          token: null, 
          loading: false,
          initialized: true
        });
        return;
      }
      
      // Production: Use real Supabase authentication
      console.log('🔧 Using Supabase authentication for production');
      
      // Get current session first
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('❌ Error getting session:', sessionError.message);
        // If we had persisted auth but can't verify with Supabase, keep user logged in
        // but mark as needs verification
        if (currentState.isAuthenticated && currentState.user) {
          console.log('⚠️ Session error but persisted auth exists, keeping user logged in');
          set({ 
            loading: false,
            initialized: true
          });
        } else {
          set({ 
            isAuthenticated: false, 
            user: null, 
            token: null, 
            loading: false,
            initialized: true
          });
        }
        return;
      }

      if (sessionData.session && sessionData.session.user) {
        const convertedUser = convertSupabaseUser(sessionData.session.user);
        const token = sessionData.session.access_token;
        
        console.log('✅ User authenticated from fresh session:', convertedUser?.firstName);
        set({ 
          isAuthenticated: true, 
          user: convertedUser,
          token,
          loading: false,
          initialized: true
        });
      } else {
        // No valid session found
        if (currentState.isAuthenticated && currentState.user) {
          console.log('⚠️ No Supabase session but persisted auth exists, logging out');
        }
        console.log('ℹ️ No active session found, logging out');
        set({ 
          isAuthenticated: false, 
          user: null, 
          token: null, 
          loading: false,
          initialized: true
        });
      }
    } catch (error: any) {
      console.error('❌ Error initializing auth:', error.message);
      // If we have persisted auth state and there's a network/temporary error,
      // keep the user logged in rather than forcing logout
      if (currentState.isAuthenticated && currentState.user) {
        console.log('⚠️ Auth initialization failed but persisted auth exists, keeping user logged in');
        set({ 
          loading: false,
          initialized: true
        });
      } else {
        set({ 
          isAuthenticated: false, 
          user: null, 
          token: null, 
          loading: false,
          initialized: true
        });
      }
    }
  },

  login: async (email: string, password: string) => {
    set({ loading: true });
    try {
      console.log('🔑 Attempting to log in user:', email);
      
      // For local development, use mock authentication
      if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_AUTH === 'true') {
        console.log('🔧 Using mock authentication for development');
        
        // Simulate a brief delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const mockUser = {
          id: 'mock-user-' + Date.now(),
          firstName: 'Demo',
          lastName: 'User',
          email,
          avatar: undefined,
          bio: undefined
        };
        
        console.log('✅ Mock user logged in successfully:', mockUser.firstName);
        
        set({ 
          isAuthenticated: true, 
          user: mockUser,
          token: 'mock-token-' + Date.now(),
          loading: false
        });
        
        showSuccess(`Welcome back, ${mockUser.firstName}!`);
        return;
      }
      
      // Production: Use Supabase authentication
      console.log('🔧 Using Supabase authentication for production');
      
      console.log('📤 Sending login request to Supabase...');
      const { data, error } = await auth.signIn(email, password);
      
      if (error) {
        console.error('❌ Login error:', error.message);
        let userMessage = 'Login failed';
        
        // Enhanced error messages with better UX
        if (error.message.includes('Invalid login credentials') || error.message.includes('Invalid email or password')) {
          userMessage = 'The email or password you entered is incorrect. Please check your credentials and try again.';
        } else if (error.message.includes('Email not confirmed')) {
          // FIXED: Allow unconfirmed users to access the app
          console.log('⚠️ Email not confirmed, but allowing app access (v2.0.2)');
          
          // Create a user object from the email (limited functionality)
          const unconfirmedUser = {
            id: `unconfirmed-${Date.now()}`,
            email: email,
            firstName: email.split('@')[0] || 'User',
            lastName: '',
            phone: undefined,
            avatar: undefined,
            bio: undefined
          };
          
          set({ 
            isAuthenticated: true,
            user: unconfirmedUser,
            token: null,
            loading: false
          });
          
          showSuccess(`Welcome back! Please check your email to verify your account, but you can start using the app now.`);
          return; // Exit early to avoid throwing error
        } else if (error.message.includes('Too many requests') || error.message.includes('rate limit')) {
          userMessage = 'Too many login attempts. Please wait a few minutes before trying again.';
        } else if (error.message.includes('User not found') || error.message.includes('No user found')) {
          userMessage = 'No account found with this email address. Please check your email or create a new account.';
        } else if (error.message.includes('Account disabled') || error.message.includes('User disabled')) {
          userMessage = 'Your account has been disabled. Please contact support for assistance.';
        } else if (error.message.includes('network') || error.message.includes('connection')) {
          userMessage = 'Network connection issue. Please check your internet connection and try again.';
        } else {
          userMessage = 'Unable to sign in at this time. Please check your credentials and try again.';
        }
        
        // Show error message with fallback
        try {
          showError(userMessage);
        } catch (e) {
          console.error('Error showing notification:', e);
          toast.error(userMessage);
        }
        set({ loading: false });
        throw new Error(error.message);
      }

      if (data.user && data.session) {
        const convertedUser = convertSupabaseUser(data.user);
        const token = data.session.access_token;
        
        console.log('✅ User logged in successfully:', convertedUser?.firstName);
        set({ 
          isAuthenticated: true, 
          user: convertedUser,
          token,
          loading: false
        });
        
        showSuccess(`Welcome back, ${convertedUser?.firstName}!`);
      } else {
        // This shouldn't happen for login but handle it gracefully
        set({ loading: false });
        showError('Login successful but no session created. Please try again.');
        throw new Error('No session created after login');
      }
    } catch (error: any) {
      console.error('❌ Login exception:', error.message);
      set({ loading: false });
      showError('Login failed. Please try again.');
      throw error;
    }
  },

  register: async (email: string, password: string, firstName: string, lastName: string) => {
    set({ loading: true });
    try {
      console.log('📝 Attempting to register user:', email);
      
      // For local development, use mock authentication
      if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_AUTH === 'true') {
        console.log('🔧 Using mock authentication for development');
        
        // Simulate a brief delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const mockUser = {
          id: 'mock-user-' + Date.now(),
          firstName,
          lastName,
          email,
          avatar: undefined,
          bio: undefined
        };
        
        console.log('✅ Mock user registered successfully:', mockUser.firstName);
        
        set({ 
          isAuthenticated: true, 
          user: mockUser,
          token: 'mock-token-' + Date.now(),
          loading: false
        });
        
        showSuccess(`Welcome to Fan Club Z, ${mockUser.firstName}!`);
        return;
      }
      
      // Production: Use Supabase authentication
      console.log('🔧 Using Supabase authentication for production');
      
      // Validate password strength
      if (password.length < 6) {
        showError('Password must be at least 6 characters long.');
        set({ loading: false });
        return;
      }
      
      // FIXED: More flexible email validation
      const isValidEmail = (email: string): boolean => {
        // Basic format check
        const basicEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return basicEmailRegex.test(email);
      };
      
      if (!isValidEmail(email)) {
        showError('Please enter a valid email address. Business domains and common providers are supported.');
        set({ loading: false });
        return;
      }
      
      // Prepare user metadata with improved field mapping
      const userData = {
        data: {
          firstName: firstName,
          lastName: lastName,
          first_name: firstName,
          last_name: lastName,
          full_name: `${firstName} ${lastName}`,
          username: email.split('@')[0], // Use email prefix as username
        }
      };

      console.log('📤 Sending registration request to Supabase...');
      const { data, error } = await auth.signUp(email, password, userData);
      
      if (error) {
        console.error('❌ Registration error:', error.message);
        let userMessage = 'Registration failed';
        
        // Enhanced error messages with better UX
        if (error.message.includes('User already registered') || error.message.includes('already exists')) {
          userMessage = 'An account with this email address already exists. Please try signing in instead, or use a different email address.';
        } else if (error.message.includes('Password should be at least') || error.message.includes('password')) {
          userMessage = 'Password must be at least 6 characters long. Please choose a stronger password.';
        } else if (error.message.includes('Signup is disabled') || error.message.includes('registration disabled')) {
          userMessage = 'Account registration is currently disabled. Please contact support for assistance.';
        } else if (error.message.includes('Email rate limit') || error.message.includes('Too many requests')) {
          userMessage = 'Too many registration attempts. Please wait a few minutes before trying again.';
        } else if (error.message.includes('invalid email') || error.message.includes('Invalid email')) {
          userMessage = 'Please enter a valid email address. Make sure it includes an @ symbol and a domain (e.g., example@domain.com).';
        } else if (error.message.includes('network') || error.message.includes('connection')) {
          userMessage = 'Network connection issue. Please check your internet connection and try again.';
        } else if (error.message.includes('domain') || error.message.includes('business email')) {
          userMessage = 'Business email addresses are supported. Please ensure your email is correctly formatted.';
        } else {
          userMessage = 'Registration failed. Please check your information and try again, or contact support if the issue persists.';
        }
        
        // Show error message with fallback
        try {
          showError(userMessage);
        } catch (e) {
          console.error('Error showing notification:', e);
          toast.error(userMessage);
        }
        set({ loading: false });
        throw new Error(error.message);
      }

      if (data.user) {
        const convertedUser = convertSupabaseUser(data.user);
        const token = data.session?.access_token || null;
        
        console.log('✅ User registered successfully:', convertedUser?.firstName);
        console.log('Session created:', !!data.session);
        console.log('User confirmed:', data.user.email_confirmed_at ? 'Yes' : 'No');
        
        // FIXED: Immediately authenticate user and redirect to app
        if (data.session) {
          // User has a session - log them in immediately
          set({ 
            isAuthenticated: true,
            user: convertedUser,
            token,
            loading: false
          });
          
          showSuccess(`Welcome to Fan Club Z, ${convertedUser?.firstName}! You're ready to start making predictions.`);
        } else {
          // No session created - try automatic login
          console.log('🔄 No session created, attempting automatic login...');
          
          try {
            // Wait a brief moment for the user to be fully created
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const { data: loginData, error: loginError } = await auth.signIn(email, password);
            
            if (loginError) {
              console.log('⚠️ Automatic login failed:', loginError.message);
              
              // FIXED: Handle email confirmation issue gracefully
              if (loginError.message.includes('Email not confirmed')) {
                console.log('⚠️ Email not confirmed during auto-login, but allowing app access (v2.0.2)');
                set({ 
                  isAuthenticated: true,
                  user: convertedUser,
                  token: null,
                  loading: false
                });
                showSuccess(`Welcome to Fan Club Z, ${convertedUser?.firstName}! Please check your email to verify your account, but you can start using the app now.`);
              } else {
                // For other errors, still allow access
                set({ 
                  isAuthenticated: true,
                  user: convertedUser,
                  token: null,
                  loading: false
                });
                showSuccess(`Welcome to Fan Club Z, ${convertedUser?.firstName}! You're now signed in.`);
              }
            } else if (loginData.user && loginData.session) {
              console.log('✅ Automatic login successful after registration');
              const loggedInUser = convertSupabaseUser(loginData.user);
              const loginToken = loginData.session.access_token;
              
              set({ 
                isAuthenticated: true,
                user: loggedInUser,
                token: loginToken,
                loading: false
              });
              
              showSuccess(`Welcome to Fan Club Z, ${loggedInUser?.firstName}! You're ready to start making predictions.`);
            } else {
              // FIXED: Still authenticate and redirect
              set({ 
                isAuthenticated: true,
                user: convertedUser,
                token: null,
                loading: false
              });
              
              showSuccess(`Welcome to Fan Club Z, ${convertedUser?.firstName}! You're now signed in.`);
            }
          } catch (autoLoginError: any) {
            console.log('⚠️ Automatic login exception:', autoLoginError.message);
            
            // FIXED: Handle email confirmation issue in catch block too
            if (autoLoginError.message.includes('Email not confirmed')) {
              console.log('⚠️ Email not confirmed exception during auto-login, but allowing app access (v2.0.2)');
              set({ 
                isAuthenticated: true,
                user: convertedUser,
                token: null,
                loading: false
              });
              showSuccess(`Welcome to Fan Club Z, ${convertedUser?.firstName}! Please check your email to verify your account, but you can start using the app now.`);
            } else {
              // For other errors, still allow access
              set({ 
                isAuthenticated: true,
                user: convertedUser,
                token: null,
                loading: false
              });
              showSuccess(`Welcome to Fan Club Z, ${convertedUser?.firstName}! You're now signed in.`);
            }
          }
        }
      } else {
        set({ loading: false });
        showError('Registration failed. Please try again.');
        throw new Error('No user created');
      }
    } catch (error: any) {
      console.error('❌ Registration exception:', error.message);
      set({ loading: false });
      showError('Registration failed. Please try again or contact support if the issue persists.');
      throw error;
    }
  },

  logout: async () => {
    set({ loading: true });
    try {
      console.log('🚪 Logging out user...');
      
      const { error } = await auth.signOut();
      
      if (error) {
        console.error('❌ Logout error:', error.message);
        showError('Error signing out');
      } else {
        console.log('✅ User logged out successfully');
        showSuccess('Signed out successfully');
      }
      
      set({ 
        isAuthenticated: false, 
        user: null,
        token: null,
        loading: false
      });
    } catch (error: any) {
      console.error('❌ Error during logout:', error.message);
      set({ 
        isAuthenticated: false, 
        user: null,
        token: null,
        loading: false
      });
    }
  },

  updateProfile: async (profileData: any) => {
    set({ loading: true });
    try {
      const currentUser = get().user;
      if (!currentUser) {
        throw new Error('No user logged in');
      }

      console.log('📝 Updating user profile...');

      // Update user metadata in Supabase
      const { data, error } = await supabase.auth.updateUser({
        data: {
          firstName: profileData.firstName || currentUser.firstName,
          lastName: profileData.lastName || currentUser.lastName,
          first_name: profileData.firstName || currentUser.firstName,
          last_name: profileData.lastName || currentUser.lastName,
          full_name: `${profileData.firstName || currentUser.firstName} ${profileData.lastName || currentUser.lastName}`,
          bio: profileData.bio !== undefined ? profileData.bio : currentUser.bio
        }
      });

      if (error) {
        console.error('❌ Profile update error:', error.message);
        showError(error.message || 'Failed to update profile');
        set({ loading: false });
        throw new Error(error.message);
      }

      if (data.user) {
        const updatedUser = convertSupabaseUser(data.user);
        set({ 
          user: updatedUser,
          loading: false
        });
        
        showSuccess('Profile updated successfully!');
      }
    } catch (error: any) {
      set({ loading: false });
      throw error;
    }
  },
}),
    {
      name: 'fanclubz-auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        token: state.token,
        initialized: state.initialized
      }),
      // Version to handle migrations if needed
      version: 1,
    }
  )
);

// Initialize auth when the store is created
if (typeof window !== 'undefined') {
  // Expose auth store to window for debugging
  (window as any).authStore = useAuthStore;

  // Listen for auth state changes
  supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('🔄 Auth state changed:', event, session?.user?.email);
    
    const store = useAuthStore.getState();
    
    if (event === 'SIGNED_IN' && session?.user) {
      const convertedUser = convertSupabaseUser(session.user);
      
      console.log('✅ Setting authenticated state via auth change:', convertedUser?.firstName);
      useAuthStore.setState({
        isAuthenticated: true,
        user: convertedUser,
        token: session.access_token,
        loading: false
      });
    } else if (event === 'SIGNED_OUT') {
      console.log('🚪 Setting signed out state via auth change');
      useAuthStore.setState({
        isAuthenticated: false,
        user: null,
        token: null,
        loading: false
      });
    } else if (event === 'TOKEN_REFRESHED' && session) {
      console.log('🔄 Token refreshed');
      useAuthStore.setState({
        token: session.access_token
      });
    } else if (event === 'USER_UPDATED' && session?.user) {
      console.log('👤 User updated');
      const convertedUser = convertSupabaseUser(session.user);
      useAuthStore.setState({
        user: convertedUser
      });
    }
  });
}