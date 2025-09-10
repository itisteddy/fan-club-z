import React, { createContext, useContext, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

interface AuthSheetContextType {
  isOpen: boolean;
  openSheet: (reason?: string) => void;
  closeSheet: () => void;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, userData?: any) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

const AuthSheetContext = createContext<AuthSheetContextType | undefined>(undefined);

export const useAuthSheet = () => {
  const context = useContext(AuthSheetContext);
  if (context === undefined) {
    throw new Error('useAuthSheet must be used within an AuthSheetProvider');
  }
  return context;
};

export const AuthSheetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openSheet = useCallback((reason?: string) => {
    console.log('🔐 Opening auth sheet, reason:', reason);
    setError(null);
    setIsOpen(true);
  }, []);

  const closeSheet = useCallback(() => {
    console.log('🔐 Closing auth sheet');
    setIsOpen(false);
    setError(null);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: import.meta.env.PROD 
            ? 'https://app.fanclubz.app/auth/callback'
            : `${window.location.origin}/auth/callback`,
        },
      });
      
      if (error) {
        setError(error.message);
        console.error('Google sign-in error:', error);
      } else {
        closeSheet();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google');
      console.error('Google sign-in exception:', err);
    } finally {
      setIsLoading(false);
    }
  }, [closeSheet]);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        setError(error.message);
        console.error('Email sign-in error:', error);
      } else {
        closeSheet();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
      console.error('Email sign-in exception:', err);
    } finally {
      setIsLoading(false);
    }
  }, [closeSheet]);

  const signUpWithEmail = useCallback(async (email: string, password: string, userData?: any) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData,
          emailRedirectTo: import.meta.env.PROD 
            ? 'https://app.fanclubz.app/auth/callback'
            : `${window.location.origin}/auth/callback`,
        },
      });
      
      if (error) {
        setError(error.message);
        console.error('Email sign-up error:', error);
      } else {
        closeSheet();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign up');
      console.error('Email sign-up exception:', err);
    } finally {
      setIsLoading(false);
    }
  }, [closeSheet]);

  const value: AuthSheetContextType = {
    isOpen,
    openSheet,
    closeSheet,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    isLoading,
    error,
  };

  return (
    <AuthSheetContext.Provider value={value}>
      {children}
    </AuthSheetContext.Provider>
  );
};
