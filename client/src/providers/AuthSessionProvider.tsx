import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { useSupabase } from './SupabaseProvider';
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { captureReturnTo } from '../lib/returnTo';
import { auth as authHelpers, buildAuthRedirectUrl } from '@/lib/supabase';

interface AuthSessionContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, userData?: any) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signInWithEmailLink: (email: string) => Promise<{ error: any }>;
}

const AuthSessionContext = createContext<AuthSessionContextType | undefined>(undefined);

export const useAuthSession = () => {
  const context = useContext(AuthSessionContext);
  if (context === undefined) {
    throw new Error('useAuthSession must be used within an AuthSessionProvider');
  }
  return context;
};

interface AuthSessionProviderProps {
  children: ReactNode;
}

// PERFORMANCE FIX: Debounce time for auth state changes
const AUTH_DEBOUNCE_MS = 3000;

export const AuthSessionProvider: React.FC<AuthSessionProviderProps> = ({ children }) => {
  const { supabase } = useSupabase();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  
  // PERFORMANCE FIX: Track last processed event to avoid duplicates
  const lastEventRef = useRef<{ event: AuthChangeEvent; userId: string; time: number } | null>(null);

  useEffect(() => {
    let mounted = true;
    
    const restorePendingSession = async () => {
      try {
        const cached = sessionStorage.getItem('fcz:update:session');
        if (!cached) return;

        sessionStorage.removeItem('fcz:update:session');
        const parsed = JSON.parse(cached);
        if (parsed?.access_token && parsed?.refresh_token) {
          await supabase.auth.setSession({
            access_token: parsed.access_token,
            refresh_token: parsed.refresh_token,
          });
        }
      } catch (error) {
        console.warn('[Auth] Failed to restore session after update:', error);
      }
    };

    // Get initial session
    const getInitialSession = async () => {
      try {
        await restorePendingSession();
        const { data: { session }, error } = await supabase.auth.getSession();
        if (!mounted) return;
        
        if (error) {
          console.error('Error getting initial session:', error);
        } else {
          setSession(session);
          setUser(session?.user ?? null);
        }
      } catch (error) {
        console.error('Exception getting initial session:', error);
      } finally {
        if (mounted) {
          setLoading(false);
          setInitialized(true);
        }
      }
    };

    getInitialSession();

    // Listen for auth changes with better deduplication
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        const now = Date.now();
        const userId = session?.user?.id || '';
        const lastEvent = lastEventRef.current;
        
        // PERFORMANCE FIX: Skip duplicate events within debounce window
        if (lastEvent && 
            lastEvent.event === event && 
            lastEvent.userId === userId && 
            (now - lastEvent.time) < AUTH_DEBOUNCE_MS) {
          return;
        }
        
        // Update tracking
        lastEventRef.current = { event, userId, time: now };
        
        // Only log significant events in development
        if (import.meta.env.DEV && (event === 'SIGNED_IN' || event === 'SIGNED_OUT')) {
          console.log('🔐 Auth:', event, session?.user?.email || '');
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (error: any) {
      return { error: { message: error.message || 'An unexpected error occurred' } };
    }
  };

  const signUp = async (email: string, password: string, userData: any = {}) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData,
          emailRedirectTo: import.meta.env.PROD 
            ? 'https://app.fanclubz.app/'
            : `${window.location.origin}/`,
        },
      });
      return { error };
    } catch (error: any) {
      return { error: { message: error.message || 'An unexpected error occurred' } };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      return { error };
    } catch (error: any) {
      return { error: { message: error.message || 'An unexpected error occurred' } };
    }
  };

  const signInWithGoogle = async () => {
    try {
      // Capture current location
      captureReturnTo();
      
      // Build redirect URL with next parameter
      const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      const next = currentPath;
      const redirectUrl = buildAuthRedirectUrl(next);
      
      if (import.meta.env.DEV) {
        console.log('🔐 Google OAuth redirect URL:', redirectUrl);
      }
      
      const { error } = await authHelpers.signInWithOAuth('google', { next });
      
      if (error) {
        console.error('🔐 Google OAuth error:', error);
      }
      
      return { error };
    } catch (error: any) {
      console.error('🔐 Google OAuth exception:', error);
      return { error: { message: error.message || 'An unexpected error occurred' } };
    }
  };

  const signInWithEmailLink = async (email: string) => {
    try {
      // Capture current location
      captureReturnTo();
      
      // Build redirect URL with next parameter
      const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      const next = currentPath;
      const emailRedirectTo = buildAuthRedirectUrl(next);
        
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo,
        },
      });
      return { error };
    } catch (error: any) {
      return { error: { message: error.message || 'An unexpected error occurred' } };
    }
  };

  const value: AuthSessionContextType = {
    user,
    session,
    loading,
    initialized,
    isAuthenticated: Boolean(user),
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
    signInWithEmailLink,
  };

  return (
    <AuthSessionContext.Provider value={value}>
      {children}
    </AuthSessionContext.Provider>
  );
};
