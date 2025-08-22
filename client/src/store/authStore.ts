import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { supabase, auth } from '../lib/supabase';
import toast from 'react-hot-toast';
import { showSuccess, showError } from './notificationStore';
import type { Provider } from '@supabase/supabase-js';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatar?: string;
  bio?: string;
  provider?: string; // Added provider tracking
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
  lastAuthCheck: number;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  loginWithOAuth: (provider: 'google' | 'apple') => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (profileData: any) => Promise<void>;
  uploadAvatar: (file: File) => Promise<string>;
  initializeAuth: () => Promise<void>;
  handleOAuthCallback: () => Promise<void>;
}

// Convert Supabase user to our User interface
const convertSupabaseUser = (supabaseUser: any): User | null => {
  if (!supabaseUser) return null;
  
  const metadata = supabaseUser.user_metadata || {};
  const appMetadata = supabaseUser.app_metadata || {};
  
  // Handle different OAuth providers
  let firstName = '';
  let lastName = '';
  let avatar = '';
  
  if (metadata.full_name) {
    const nameParts = metadata.full_name.split(' ');
    firstName = nameParts[0] || '';
    lastName = nameParts.slice(1).join(' ') || '';
  } else {
    firstName = metadata.firstName || metadata.first_name || metadata.given_name || 'User';
    lastName = metadata.lastName || metadata.last_name || metadata.family_name || '';
  }
  
  // Handle avatar from different providers
  if (metadata.avatar_url) {
    avatar = metadata.avatar_url;
  } else if (metadata.picture) {
    avatar = metadata.picture; // Google
  } else if (metadata.photo) {
    avatar = metadata.photo; // Apple
  }
  
  return {
    id: supabaseUser.id,
    email: supabaseUser.email || '',
    firstName,
    lastName,
    phone: supabaseUser.phone,
    avatar,
    provider: appMetadata.provider || 'email',
    bio: metadata.bio,
    totalEarnings: metadata.totalEarnings || 0,
    totalInvested: metadata.totalInvested || 0,
    winRate: metadata.winRate || 0,
    activePredictions: metadata.activePredictions || 0,
    totalPredictions: metadata.totalPredictions || 0,
    rank: metadata.rank || 0,
    level: metadata.level || 'New Predictor',
    createdAt: supabaseUser.created_at || new Date().toISOString()
  };
};

// Flags to prevent multiple auth state listeners and initializations
let authStateChangeListenerSet = false;
let initializationInProgress = false;
let lastAuthEvent = '';
let lastAuthEventTime = 0;

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      user: null,
      token: null,
      loading: false,
      initialized: false,
      lastAuthCheck: 0,

      initializeAuth: async () => {
        const state = get();
        const now = Date.now();
        
        // Prevent multiple concurrent initializations
        if (initializationInProgress) {
          console.log('🔄 Auth initialization already in progress, waiting...');
          return;
        }

        // Prevent frequent re-initialization (max once per 30 seconds)
        if (state.initialized && (now - state.lastAuthCheck < 30000)) {
          console.log('🔄 Auth recently checked, skipping initialization');
          return;
        }

        // If we have valid persisted data and it's recent, use it
        if (state.isAuthenticated && state.user && state.token && (now - state.lastAuthCheck < 300000)) { // 5 minutes
          // Only log once per session for cached auth
          if (!state.initialized) {
            console.log('✅ Using cached auth state for:', state.user.firstName);
          }
          set({ 
            loading: false, 
            initialized: true,
            lastAuthCheck: now
          });
          return;
        }

        // Prevent concurrent initialization attempts
        if (state.loading) {
          console.log('🔄 Auth check already in progress...');
          return;
        }

        initializationInProgress = true;
        set({ loading: true, lastAuthCheck: now });

        try {
          console.log('🔐 Initializing authentication...');

          // Get current session without triggering auth state change
          const { data: { session }, error } = await supabase.auth.getSession();

          if (error) {
            console.log('⚠️ Session check error:', error.message);
            set({ 
              isAuthenticated: false, 
              user: null, 
              token: null, 
              loading: false,
              initialized: true,
              lastAuthCheck: now
            });
            return;
          }

          if (session?.user) {
            const convertedUser = convertSupabaseUser(session.user);
            if (!state.initialized) {
              console.log('✅ Found active session for:', convertedUser?.firstName);
            }
            
            set({ 
              isAuthenticated: true, 
              user: convertedUser,
              token: session.access_token,
              loading: false,
              initialized: true,
              lastAuthCheck: now
            });
          } else {
            if (!state.initialized) {
              console.log('ℹ️ No active session found');
            }
            set({ 
              isAuthenticated: false, 
              user: null, 
              token: null, 
              loading: false,
              initialized: true,
              lastAuthCheck: now
            });
          }

        } catch (error: any) {
          console.error('❌ Auth initialization error:', error.message);
          set({ 
            isAuthenticated: false, 
            user: null, 
            token: null, 
            loading: false,
            initialized: true,
            lastAuthCheck: now
          });
        } finally {
          initializationInProgress = false;
        }
      },

      login: async (email: string, password: string) => {
        set({ loading: true });
        
        try {
          console.log('🔑 Logging in user:', email);

          const { data, error } = await auth.signIn(email, password);

          if (error) {
            console.error('❌ Login error:', error.message);
            let userMessage = 'Login failed. Please check your credentials.';
            
            if (error.message.includes('Invalid login credentials')) {
              userMessage = 'Invalid email or password. Please try again.';
            } else if (error.message.includes('Email not confirmed')) {
              userMessage = 'Please check your email and click the confirmation link.';
            }
            
            set({ loading: false });
            showError(userMessage);
            throw new Error(userMessage);
          }

          if (data.user && data.session) {
            const convertedUser = convertSupabaseUser(data.user);
            console.log('✅ Login successful for:', convertedUser?.firstName);
            
            set({ 
              isAuthenticated: true, 
              user: convertedUser,
              token: data.session.access_token,
              loading: false,
              initialized: true,
              lastAuthCheck: Date.now()
            });
            
            showSuccess(`Welcome back, ${convertedUser?.firstName}!`);
          }

        } catch (error: any) {
          console.error('❌ Login exception:', error.message);
          set({ loading: false });
          throw error;
        }
      },

      register: async (email: string, password: string, firstName: string, lastName: string) => {
        set({ loading: true });
        
        try {
          console.log('📝 Registering user:', email);

          if (password.length < 6) {
            throw new Error('Password must be at least 6 characters long');
          }

          const userData = {
            data: {
              firstName,
              lastName,
              first_name: firstName,
              last_name: lastName,
              full_name: `${firstName} ${lastName}`,
            }
          };

          const { data, error } = await auth.signUp(email, password, userData);

          if (error) {
            console.error('❌ Registration error:', error.message);
            let userMessage = 'Registration failed. Please try again.';
            
            if (error.message.includes('User already registered')) {
              userMessage = 'An account with this email already exists. Please sign in instead.';
            } else if (error.message.includes('Password should be at least')) {
              userMessage = 'Password must be at least 6 characters long.';
            }
            
            set({ loading: false });
            showError(userMessage);
            throw new Error(userMessage);
          }

          if (data.user) {
            const convertedUser = convertSupabaseUser(data.user);
            console.log('✅ Registration successful for:', convertedUser?.firstName);
            
            // If we have a session, log them in immediately
            if (data.session) {
              set({ 
                isAuthenticated: true,
                user: convertedUser,
                token: data.session.access_token,
                loading: false,
                initialized: true,
                lastAuthCheck: Date.now()
              });
              showSuccess(`Welcome to Fan Club Z, ${convertedUser?.firstName}!`);
            } else {
              // No immediate session, but allow app access
              set({ 
                isAuthenticated: true,
                user: convertedUser,
                token: null,
                loading: false,
                initialized: true,
                lastAuthCheck: Date.now()
              });
              showSuccess(`Welcome to Fan Club Z, ${convertedUser?.firstName}! Please check your email to verify your account.`);
            }
          }

        } catch (error: any) {
          console.error('❌ Registration exception:', error.message);
          set({ loading: false });
          throw error;
        }
      },

      loginWithOAuth: async (provider: 'google' | 'apple') => {
        set({ loading: true });
        
        try {
          console.log(`🔑 Starting ${provider} OAuth login...`);
          
          // Get the correct redirect URL based on current domain
          const currentOrigin = window.location.origin;
          const redirectTo = `${currentOrigin}/auth/callback`;

          console.log('🔗 Current origin:', currentOrigin);
          console.log('🔗 OAuth redirect URL:', redirectTo);

          const { data, error } = await supabase.auth.signInWithOAuth({
            provider: provider as Provider,
            options: {
              redirectTo,
              queryParams: {
                access_type: 'offline',
                prompt: 'consent',
              },
            },
          });

          if (error) {
            console.error(`❌ ${provider} OAuth error:`, error.message);
            set({ loading: false });
            showError(`${provider} sign-in failed. Please try again.`);
            throw new Error(error.message);
          }

          // OAuth redirect will handle the rest
          console.log(`✅ ${provider} OAuth initiated, redirecting...`);
          
        } catch (error: any) {
          console.error(`❌ ${provider} OAuth exception:`, error.message);
          set({ loading: false });
          throw error;
        }
      },

      handleOAuthCallback: async () => {
        try {
          console.log('🔄 Handling OAuth callback...');
          
          const { data, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('❌ OAuth callback error:', error.message);
            showError('Authentication failed. Please try again.');
            throw new Error(error.message);
          }

          if (data.session?.user) {
            const convertedUser = convertSupabaseUser(data.session.user);
            console.log('✅ OAuth authentication successful for:', convertedUser?.firstName);
            
            set({ 
              isAuthenticated: true, 
              user: convertedUser,
              token: data.session.access_token,
              loading: false,
              initialized: true,
              lastAuthCheck: Date.now()
            });
            
            const providerName = convertedUser?.provider?.charAt(0).toUpperCase() + convertedUser?.provider?.slice(1);
            showSuccess(`Welcome ${convertedUser?.firstName}! Signed in with ${providerName}.`);
            
            return convertedUser;
          } else {
            throw new Error('No user session found after OAuth callback');
          }
          
        } catch (error: any) {
          console.error('❌ OAuth callback exception:', error.message);
          set({ loading: false });
          throw error;
        }
      },

      logout: async () => {
        set({ loading: true });
        
        try {
          console.log('🚪 Logging out...');
          
          const { error } = await auth.signOut();
          
          if (error) {
            console.error('❌ Logout error:', error.message);
          }
          
          set({ 
            isAuthenticated: false, 
            user: null,
            token: null,
            loading: false,
            initialized: true,
            lastAuthCheck: 0
          });
          
          showSuccess('Signed out successfully');
          
        } catch (error: any) {
          console.error('❌ Logout exception:', error.message);
          
          // Force logout regardless of error
          set({ 
            isAuthenticated: false, 
            user: null,
            token: null,
            loading: false,
            initialized: true,
            lastAuthCheck: 0
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

          console.log('📝 Updating profile...');

          const { data, error } = await supabase.auth.updateUser({
            data: {
              firstName: profileData.firstName || currentUser.firstName,
              lastName: profileData.lastName || currentUser.lastName,
              bio: profileData.bio !== undefined ? profileData.bio : currentUser.bio
            }
          });

          if (error) {
            throw new Error(error.message);
          }

          if (data.user) {
            const updatedUser = convertSupabaseUser(data.user);
            set({ 
              user: updatedUser,
              loading: false,
              lastAuthCheck: Date.now()
            });
            showSuccess('Profile updated successfully!');
          }

        } catch (error: any) {
          console.error('❌ Profile update error:', error.message);
          set({ loading: false });
          showError(error.message || 'Failed to update profile');
          throw error;
        }
      },

      // Upload profile avatar to Supabase Storage and persist URL in both auth metadata and users table
      uploadAvatar: async (file: File) => {
        const state = get();
        if (!state.user) throw new Error('No user logged in');
        const userId = state.user.id;

        const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        // Path must NOT include the bucket name; the SDK prefixes it.
        const path = `${userId}/${Date.now()}.${ext}`;

        // 1) Upload to storage (public bucket configured: avatars)
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(path, file, { cacheControl: '3600', upsert: true, contentType: file.type });

        if (uploadError) {
          showError('Failed to upload image.');
          throw uploadError;
        }

        // 2) Get public URL
        const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(uploadData.path);
        const publicUrl = publicUrlData.publicUrl;

        // 3) Save to auth user metadata
        const { data: authUpdate, error: authErr } = await supabase.auth.updateUser({ data: { avatar_url: publicUrl } });
        if (authErr) {
          showError('Failed to save avatar to profile.');
          throw authErr;
        }

        // 4) Mirror to public users table for fast reads
        await clientDb.users.updateProfile(userId, { avatar_url: publicUrl });

        // 5) Update local state
        const updatedUser = convertSupabaseUser(authUpdate.user);
        set({ user: updatedUser, lastAuthCheck: Date.now() });
        showSuccess('Profile photo updated.');
        return publicUrl;
      },
    }),
    {
      name: 'fanclubz-auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        token: state.token,
        initialized: state.initialized,
        lastAuthCheck: state.lastAuthCheck
      }),
      version: 5, // Increment version for OAuth support
    }
  )
);

// Set up auth state change listener only once per session with better event filtering
if (typeof window !== 'undefined' && !authStateChangeListenerSet) {
  authStateChangeListenerSet = true;
  
  console.log('🔧 Setting up auth state listener...');
  
  supabase.auth.onAuthStateChange((event, session) => {
    const now = Date.now();
    
    // Prevent rapid duplicate events (max 1 per second)
    if (lastAuthEvent === event && (now - lastAuthEventTime) < 1000) {
      return;
    }
    
    lastAuthEvent = event;
    lastAuthEventTime = now;
    
    console.log('🔄 Auth state change:', event);
    
    // Only handle specific critical events to prevent loops
    if (event === 'SIGNED_OUT') {
      console.log('🔓 User signed out');
      useAuthStore.setState({
        isAuthenticated: false,
        user: null,
        token: null,
        lastAuthCheck: 0
      });
    } else if (event === 'TOKEN_REFRESHED' && session?.user) {
      console.log('🔄 Token refreshed');
      const convertedUser = convertSupabaseUser(session.user);
      useAuthStore.setState({
        user: convertedUser,
        token: session.access_token,
        lastAuthCheck: now
      });
    }
    // Deliberately ignore SIGNED_IN, INITIAL_SESSION to prevent re-auth loops
  });
}