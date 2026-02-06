import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { supabase, auth, clientDb } from '../lib/supabase';
import { apiClient } from '@/lib/apiClient';
import toast from 'react-hot-toast';
import { showSuccess, showError } from './notificationStore';
import { captureReturnTo } from '@/lib/returnTo';
import { validateContent } from '@/lib/textFilter';

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
  username?: string;
  full_name?: string;
  avatar_url?: string;
  is_verified?: boolean;
  // OG Badge fields from users table
  og_badge?: 'gold' | 'silver' | 'bronze' | null;
  og_badge_assigned_at?: string | null;
  og_badge_member_number?: number | null;
  referral_code?: string | null;
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
  handleOAuthCallback: () => Promise<User | null | void>;
}

// Fetch extended profile data from users table (includes OG badges)
const fetchExtendedProfile = async (userId: string): Promise<Partial<User>> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('og_badge, og_badge_assigned_at, og_badge_member_number, referral_code, username, full_name, avatar_url')
      .eq('id', userId)
      .single();
    
    if (error || !data) {
      return {};
    }
    
    return {
      og_badge: data.og_badge as User['og_badge'],
      og_badge_assigned_at: data.og_badge_assigned_at,
      og_badge_member_number: data.og_badge_member_number,
      referral_code: data.referral_code,
      // Also get username/avatar from users table if available
      username: data.username || undefined,
      full_name: data.full_name || undefined,
      avatar_url: data.avatar_url || undefined,
    };
  } catch (err) {
    console.warn('Failed to fetch extended profile:', err);
    return {};
  }
};

// Convert Supabase user to our User interface
const convertSupabaseUser = (supabaseUser: any, extendedProfile?: Partial<User>): User | null => {
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
  const username = metadata.username || metadata.preferred_username || metadata.full_name || supabaseUser.email?.split('@')[0] || '';
  const fullName = metadata.full_name || `${firstName} ${lastName}`.trim();
  
  return {
    id: supabaseUser.id,
    email: supabaseUser.email || '',
    firstName,
    lastName,
    phone: supabaseUser.phone,
    avatar: extendedProfile?.avatar_url || avatar,
    avatar_url: extendedProfile?.avatar_url || avatar,
    provider: appMetadata.provider || 'email',
    bio: metadata.bio,
    totalEarnings: metadata.totalEarnings || 0,
    totalInvested: metadata.totalInvested || 0,
    winRate: metadata.winRate || 0,
    activePredictions: metadata.activePredictions || 0,
    totalPredictions: metadata.totalPredictions || 0,
    rank: metadata.rank || 0,
    level: metadata.level || 'New Predictor',
    createdAt: supabaseUser.created_at || new Date().toISOString(),
    username: extendedProfile?.username || username,
    full_name: extendedProfile?.full_name || fullName,
    is_verified: Boolean(metadata.is_verified || metadata.verified),
    // OG Badge fields from extended profile
    og_badge: extendedProfile?.og_badge || null,
    og_badge_assigned_at: extendedProfile?.og_badge_assigned_at || null,
    og_badge_member_number: extendedProfile?.og_badge_member_number || null,
    referral_code: extendedProfile?.referral_code || null,
  };
};

// Flags to prevent multiple auth state listeners and initializations
let authStateChangeListenerSet = false;
let initializationInProgress = false;

// ENHANCED: Better debouncing with event + userId tracking
let lastProcessedEvent = '';
let lastProcessedUserId = '';
let lastEventTime = 0;
const AUTH_EVENT_DEBOUNCE_MS = 5000; // Increased from 2000ms to 5000ms

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
          return;
        }

        // Prevent frequent re-initialization (max once per 30 seconds)
        if (state.initialized && (now - state.lastAuthCheck < 30000)) {
          return;
        }

        // If we have valid persisted data and it's recent, use it
        if (state.isAuthenticated && state.user && state.token && (now - state.lastAuthCheck < 300000)) { // 5 minutes
          set({ 
            loading: false, 
            initialized: true,
            lastAuthCheck: now
          });
          return;
        }

        // Prevent concurrent initialization attempts
        if (state.loading) {
          return;
        }

        initializationInProgress = true;
        set({ loading: true, lastAuthCheck: now });

        try {
          // Get current session without triggering auth state change
          const { data: { session }, error } = await supabase.auth.getSession();

          if (error) {
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
            // Fetch extended profile data (including OG badges) from users table
            const extendedProfile = await fetchExtendedProfile(session.user.id);
            const convertedUser = convertSupabaseUser(session.user, extendedProfile);
            
            set({ 
              isAuthenticated: true, 
              user: convertedUser,
              token: session.access_token,
              loading: false,
              initialized: true,
              lastAuthCheck: now
            });
          } else {
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
          const { data, error } = await auth.signIn(email, password);

          if (error) {
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

          const authUser = data?.user;
          const session = data?.session;

          if (authUser && session) {
            // Fetch extended profile data (including OG badges) from users table
            const extendedProfile = await fetchExtendedProfile(authUser.id);
            const convertedUser = convertSupabaseUser(authUser, extendedProfile);
            
            set({ 
              isAuthenticated: true, 
              user: convertedUser,
              token: session.access_token,
              loading: false,
              initialized: true,
              lastAuthCheck: Date.now()
            });
            
            showSuccess(`Welcome back, ${convertedUser?.firstName}!`);
          }

        } catch (error: any) {
          set({ loading: false });
          throw error;
        }
      },

      register: async (email: string, password: string, firstName: string, lastName: string) => {
        set({ loading: true });
        
        try {
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

          const authUser = data?.user;

          if (authUser) {
            // Fetch extended profile data (including OG badges) from users table
            const extendedProfile = await fetchExtendedProfile(authUser.id);
            const convertedUser = convertSupabaseUser(authUser, extendedProfile);
            
            // If we have a session, log them in immediately
            if (data?.session) {
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
          set({ loading: false });
          throw error;
        }
      },

      loginWithOAuth: async (provider: 'google' | 'apple') => {
        set({ loading: true });
        
        try {
          const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
          captureReturnTo(currentPath);
          
          const { data, error } = await auth.signInWithOAuth(provider, { next: currentPath });

          if (error) {
            set({ loading: false });
            showError(`${provider} sign-in failed. Please try again.`);
            throw new Error(error.message);
          }

          // OAuth redirect will handle the rest
          
        } catch (error: any) {
          set({ loading: false });
          throw error;
        }
      },

      handleOAuthCallback: async () => {
        try {
          const { data, error } = await supabase.auth.getSession();
          
          if (error) {
            showError('Authentication failed. Please try again.');
            throw new Error(error.message);
          }

          if (data.session?.user) {
            // Fetch extended profile data (including OG badges) from users table
            const extendedProfile = await fetchExtendedProfile(data.session.user.id);
            const convertedUser = convertSupabaseUser(data.session.user, extendedProfile);
            
            set({ 
              isAuthenticated: true, 
              user: convertedUser,
              token: data.session.access_token,
              loading: false,
              initialized: true,
              lastAuthCheck: Date.now()
            });
            
            const providerId = convertedUser?.provider || 'email';
            const providerName = providerId.charAt(0).toUpperCase() + providerId.slice(1);
            showSuccess(`Welcome ${convertedUser?.firstName}! Signed in with ${providerName}.`);
            
            return convertedUser;
          } else {
            throw new Error('No user session found after OAuth callback');
          }
          
        } catch (error: any) {
          set({ loading: false });
          throw error;
        }
      },

      logout: async () => {
        set({ loading: true });
        
        try {
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

          const validation = validateContent([
            { label: 'first name', value: profileData.firstName || currentUser.firstName },
            { label: 'last name', value: profileData.lastName || currentUser.lastName },
            { label: 'bio', value: profileData.bio !== undefined ? profileData.bio : currentUser.bio },
          ]);
          if (!validation.ok) {
            throw new Error(`Objectionable content detected in ${validation.field}`);
          }

          const { data, error } = await supabase.auth.updateUser({
            data: {
              firstName: profileData.firstName || currentUser.firstName,
              lastName: profileData.lastName || currentUser.lastName,
              bio: profileData.bio !== undefined ? profileData.bio : currentUser.bio
            }
          });

          if (error) {
            throw new Error(error.message || 'Failed to update profile');
          }

          if (data?.user) {
            // Fetch extended profile to preserve OG badge data
            const extendedProfile = await fetchExtendedProfile(data.user.id);
            const updatedUser = convertSupabaseUser(data.user, extendedProfile);

            // Mirror name changes into the public users table via backend API
            // (uses service role key on server; includes auth + X-FCZ-Client via apiClient)
            try {
              const fullName = `${updatedUser?.firstName || ''} ${updatedUser?.lastName || ''}`.trim();
              if (fullName) {
                await apiClient.patch(`/users/${data.user.id}/profile`, {
                  full_name: fullName,
                });
                console.log('✅ Profile name mirrored to users table via API:', fullName);
              }
            } catch (mirrorError) {
              console.warn('Failed to mirror profile name to users table:', mirrorError);
            }

            set({ 
              user: updatedUser,
              loading: false,
              lastAuthCheck: Date.now()
            });
            showSuccess('Profile updated successfully!');
          }

        } catch (error: any) {
          set({ loading: false });
          const msg = typeof error?.message === 'string' ? error.message : '';
          const isNetworkError = msg.toLowerCase().includes('failed to fetch') || msg.toLowerCase().includes('network error');
          
          if (isNetworkError) {
            showError('Network error while saving your profile. Please check your connection and try again.');
          } else {
            showError(msg || 'Failed to update profile. Please try again.');
          }
          throw error;
        }
      },

      // Upload profile avatar to Supabase Storage and persist URL in both auth metadata and users table
      uploadAvatar: async (file: File) => {
        const state = get();
        if (!state.user) throw new Error('No user logged in');
        const userId = state.user.id;

        // Upload via backend (service-role) to avoid client-side Storage policy failures (400 Bad Request)
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token || '';
        if (!accessToken) throw new Error('Missing session token');

        const { getApiUrl } = await import('@/config');
        const apiUrl = getApiUrl();

        const form = new FormData();
        form.append('file', file);

        const uploadRes = await fetch(`${apiUrl}/api/v2/uploads/avatar`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
          body: form,
        });

        if (!uploadRes.ok) {
          const errData = await uploadRes.json().catch(() => ({}));
          const msg = String(errData?.message || 'Failed to upload image. Please try again.');
          showError(msg);
          throw new Error(msg);
        }

        const uploadJson = await uploadRes.json().catch(() => ({}));
        const publicUrl = uploadJson?.data?.publicUrl as string | undefined;
        if (!publicUrl) {
          showError('Upload succeeded but URL was not returned. Please try again.');
          throw new Error('Missing publicUrl from upload');
        }

        // 3) Save to auth user metadata
        const { data: authUpdate, error: authErr } = await supabase.auth.updateUser({ data: { avatar_url: publicUrl } });
        if (authErr) {
          showError('Failed to save avatar to profile.');
          throw authErr;
        }

        // 4) Mirror to public users table via backend API (avoids RLS/policy surprises)
        try {
          await fetch(`${apiUrl}/api/v2/users/${userId}/profile`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ avatar_url: publicUrl }),
          });
        } catch {
          // Non-fatal: auth metadata already updated
        }

        // 5) Update local state - preserve OG badge data
        const extendedProfile = await fetchExtendedProfile(userId);
        const updatedUser = authUpdate?.user ? convertSupabaseUser(authUpdate.user, extendedProfile) : null;
        if (updatedUser) {
          set({ user: updatedUser, lastAuthCheck: Date.now() });
        }
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
      version: 6, // Increment version for OG badge support
    }
  )
);

// Set up auth state change listener only once per session with ENHANCED event filtering
if (typeof window !== 'undefined' && !authStateChangeListenerSet) {
  authStateChangeListenerSet = true;
  
  supabase.auth.onAuthStateChange((event, session) => {
    const now = Date.now();
    const userId = session?.user?.id || '';
    
    // ENHANCED: Create a unique key combining event + userId
    const eventKey = `${event}:${userId}`;
    
    // Skip if this exact event+user combo was processed recently
    if (eventKey === `${lastProcessedEvent}:${lastProcessedUserId}` && 
        (now - lastEventTime) < AUTH_EVENT_DEBOUNCE_MS) {
      return;
    }
    
    // Update tracking
    lastProcessedEvent = event;
    lastProcessedUserId = userId;
    lastEventTime = now;
    
    const currentState = useAuthStore.getState();
    
    // Handle SIGNED_IN - critical for OAuth flows
    if (event === 'SIGNED_IN' && session?.user) {
      // Only update if we don't already have this user authenticated
      if (!currentState.isAuthenticated || currentState.user?.id !== session.user.id) {
        const convertedUser = convertSupabaseUser(session.user);
        if (import.meta.env.DEV) {
          console.log('🔐 Auth state change: SIGNED_IN', convertedUser?.email);
        }
        useAuthStore.setState({
          isAuthenticated: true,
          user: convertedUser,
          token: session.access_token,
          loading: false,
          initialized: true,
          lastAuthCheck: now
        });
      }
    }
    // Handle SIGNED_OUT
    else if (event === 'SIGNED_OUT') {
      if (import.meta.env.DEV) {
        console.log('🔐 Auth state change: SIGNED_OUT');
      }
      useAuthStore.setState({
        isAuthenticated: false,
        user: null,
        token: null,
        lastAuthCheck: 0
      });
    }
    // Handle TOKEN_REFRESHED - only update token, not full state
    else if (event === 'TOKEN_REFRESHED' && session?.user) {
      // Only update if we're already authenticated as this user
      if (currentState.isAuthenticated && currentState.user?.id === session.user.id) {
        useAuthStore.setState({
          token: session.access_token,
          lastAuthCheck: now
        });
      }
    }
    // INITIAL_SESSION is handled by initializeAuth and AuthSessionProvider, skip it
  });
}
