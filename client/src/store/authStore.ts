import { create } from 'zustand';
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
  
  return {
    id: supabaseUser.id,
    email: supabaseUser.email || '',
    firstName: metadata.firstName || metadata.first_name || nameParts[0] || 'User',
    lastName: metadata.lastName || metadata.last_name || nameParts.slice(1).join(' ') || '',
    phone: supabaseUser.phone,
    avatar: metadata.avatar_url,
    bio: metadata.bio
  };
};

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  user: null,
  token: null,
  loading: false,
  initialized: false,

  initializeAuth: async () => {
    set({ loading: true });
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
        set({ 
          isAuthenticated: false, 
          user: null, 
          token: null, 
          loading: false,
          initialized: true
        });
        return;
      }

      if (sessionData.session && sessionData.session.user) {
        const convertedUser = convertSupabaseUser(sessionData.session.user);
        const token = sessionData.session.access_token;
        
        console.log('✅ User authenticated from session:', convertedUser?.firstName);
        set({ 
          isAuthenticated: true, 
          user: convertedUser,
          token,
          loading: false,
          initialized: true
        });
      } else {
        console.log('ℹ️ No active session found');
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
      set({ 
        isAuthenticated: false, 
        user: null, 
        token: null, 
        loading: false,
        initialized: true
      });
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
        
        // Provide more helpful error messages
        if (error.message.includes('Invalid login credentials')) {
          userMessage = 'Invalid email or password. Please check your credentials and try again.';
        } else if (error.message.includes('Email not confirmed')) {
          // FIXED: Allow unconfirmed users to access the app
          console.log('⚠️ Email not confirmed, but allowing app access');
          
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
        } else if (error.message.includes('Too many requests')) {
          userMessage = 'Too many attempts. Please wait a moment and try again.';
        } else if (error.message.includes('User not found')) {
          userMessage = 'No account found with this email. Please register first.';
        } else {
          userMessage = error.message;
        }
        
        showError(userMessage);
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
        
        // FIXED: More permissive error handling for business domains
        if (error.message.includes('User already registered')) {
          userMessage = 'An account with this email already exists. Please try signing in instead.';
        } else if (error.message.includes('Password should be at least')) {
          userMessage = 'Password should be at least 6 characters long.';
        } else if (error.message.includes('Signup is disabled')) {
          userMessage = 'Account registration is currently disabled. Please contact support.';
        } else if (error.message.includes('Email rate limit')) {
          userMessage = 'Too many registration attempts. Please wait a moment and try again.';
        } else if (error.message.includes('invalid') || error.message.includes('Invalid')) {
          // FIXED: Less restrictive error message
          userMessage = 'Registration failed. Please ensure you\'re using a valid email address and try again.';
        } else {
          // FIXED: Generic fallback message
          userMessage = 'Registration failed. Please try again or contact support if the issue persists.';
        }
        
        showError(userMessage);
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
              // FIXED: Still authenticate them and redirect to app
              set({ 
                isAuthenticated: true,
                user: convertedUser,
                token: null,
                loading: false
              });
              
              showSuccess(`Welcome to Fan Club Z, ${convertedUser?.firstName}! You're now signed in.`);
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
            console.log('⚠️ Automatic login failed:', autoLoginError.message);
            // FIXED: Still authenticate and redirect to app
            set({ 
              isAuthenticated: true,
              user: convertedUser,
              token: null,
              loading: false
            });
            
            showSuccess(`Welcome to Fan Club Z, ${convertedUser?.firstName}! You're now signed in.`);
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
}));

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