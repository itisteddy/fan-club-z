import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSupabase } from './SupabaseProvider';
import { User, Session } from '@supabase/supabase-js';
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

export const AuthSessionProvider: React.FC<AuthSessionProviderProps> = ({ children }) => {
  const { supabase } = useSupabase();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error getting initial session:', error);
        } else {
          setSession(session);
          setUser(session?.user ?? null);
        }
      } catch (error) {
        console.error('Exception getting initial session:', error);
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Auth state change:', event, session?.user?.email);
        console.log('🔐 Full auth event details:', { event, session });
        
        // Handle different auth events
        switch (event) {
          case 'SIGNED_IN':
            console.log('✅ User signed in successfully');
            break;
          case 'SIGNED_OUT':
            console.log('👋 User signed out');
            break;
          case 'TOKEN_REFRESHED':
            console.log('🔄 Token refreshed');
            break;
          case 'PASSWORD_RECOVERY':
            console.log('🔑 Password recovery initiated');
            break;
          default:
            console.log(`🔐 Auth event: ${event}`);
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => {
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
      
      console.log('🔐 Google OAuth redirect URL:', redirectUrl);
      console.log('🔐 Current path:', currentPath);
      console.log('🔐 Next param:', next);
      
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
