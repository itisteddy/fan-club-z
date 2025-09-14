import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useLocation } from 'wouter';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

interface AuthSheetContextType {
  isOpen: boolean;
  openAuth: (options: { reason: string; returnTo?: string; actionData?: any }) => void;
  closeAuth: () => void;
  reason: string;
  returnTo: string | null;
  actionData: any;
}

const AuthSheetContext = createContext<AuthSheetContextType | null>(null);

interface AuthSheetProviderProps {
  children: ReactNode;
}

export const AuthSheetProvider: React.FC<AuthSheetProviderProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [returnTo, setReturnTo] = useState<string | null>(null);
  const [actionData, setActionData] = useState<any>(null);
  const [location, setLocation] = useLocation();
  const { isAuthenticated, user } = useAuthStore();

  const openAuth = useCallback((options: { reason: string; returnTo?: string; actionData?: any }) => {
    console.log('🔐 Opening auth sheet:', options);
    setReason(options.reason);
    setReturnTo(options.returnTo || location);
    setActionData(options.actionData || null);
    setIsOpen(true);
  }, [location]);

  const closeAuth = useCallback(() => {
    console.log('🔐 Closing auth sheet');
    setIsOpen(false);
    setReason('');
    setReturnTo(null);
    setActionData(null);
  }, []);

  const handleAuthSuccess = useCallback(() => {
    console.log('✅ Auth successful, resuming action:', { reason, returnTo, actionData });
    
    // Close the auth sheet
    closeAuth();
    
    // Navigate back to the intended location if different from current
    if (returnTo && returnTo !== location) {
      setLocation(returnTo);
    }
    
    // Show success message
    toast.success(`Welcome back, ${user?.username}!`);
    
    // Trigger action resume (this will be handled by the withAuthGate hook)
    if (actionData && actionData.resumeAction) {
      setTimeout(() => {
        actionData.resumeAction();
      }, 100);
    }
  }, [reason, returnTo, actionData, closeAuth, location, setLocation, user]);

  const contextValue: AuthSheetContextType = {
    isOpen,
    openAuth,
    closeAuth,
    reason,
    returnTo,
    actionData
  };

  return (
    <AuthSheetContext.Provider value={contextValue}>
      {children}
      {isOpen && (
        <AuthSheet 
          isOpen={isOpen}
          onClose={closeAuth}
          onSuccess={handleAuthSuccess}
          reason={reason}
        />
      )}
    </AuthSheetContext.Provider>
  );
};

// Simple Auth Sheet Component
const AuthSheet: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  reason: string;
}> = ({ isOpen, onClose, onSuccess, reason }) => {
  const { login, loginWithOAuth, register, loading } = useAuthStore();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(email, password, firstName, lastName);
      }
      onSuccess();
    } catch (error) {
      // Error handling is done in the store
    }
  };

  const handleOAuth = async (provider: 'google' | 'apple') => {
    try {
      await loginWithOAuth(provider);
      // OAuth will redirect, so we don't need to call onSuccess here
    } catch (error) {
      // Error handling is done in the store
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            {isLogin ? 'Sign In' : 'Sign Up'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
        
        <p className="text-gray-600 mb-4 text-sm">
          {reason === 'place_prediction' && 'Sign in to place your prediction'}
          {reason === 'comment' && 'Sign in to add a comment'}
          {reason === 'reply' && 'Sign in to reply'}
          {reason === 'like' && 'Sign in to like this prediction'}
          {reason === 'follow' && 'Sign in to follow this user'}
          {reason === 'wallet' && 'Sign in to access your wallet'}
          {reason === 'profile' && 'Sign in to view your profile'}
          {!['place_prediction', 'comment', 'reply', 'like', 'follow', 'wallet', 'profile'].includes(reason) && 'Sign in to continue'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                required={!isLogin}
              />
              <input
                type="text"
                placeholder="Last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                required={!isLogin}
              />
            </div>
          )}
          
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            required
          />
          
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            required
          />
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-500 text-white py-2 px-4 rounded-md hover:bg-purple-600 disabled:opacity-50"
          >
            {loading ? 'Loading...' : (isLogin ? 'Sign In' : 'Sign Up')}
          </button>
        </form>

        <div className="mt-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or continue with</span>
            </div>
          </div>
          
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              onClick={() => handleOAuth('google')}
              disabled={loading}
              className="w-full bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Google
            </button>
            <button
              onClick={() => handleOAuth('apple')}
              disabled={loading}
              className="w-full bg-black text-white py-2 px-4 rounded-md hover:bg-gray-800 disabled:opacity-50"
            >
              Apple
            </button>
          </div>
        </div>

        <div className="mt-4 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-purple-500 hover:text-purple-600 text-sm"
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
};

export const useAuthSheet = () => {
  const context = useContext(AuthSheetContext);
  if (!context) {
    throw new Error('useAuthSheet must be used within an AuthSheetProvider');
  }
  return context;
};

// Hook for gating actions behind authentication
export const withAuthGate = <T extends any[]>(
  actionName: string,
  actionFn: (...args: T) => void | Promise<void>
) => {
  return (...args: T) => {
    const { isAuthenticated } = useAuthStore();
    const { openAuth } = useAuthSheet();
    const [location] = useLocation();

    if (!isAuthenticated) {
      openAuth({
        reason: actionName,
        returnTo: location,
        actionData: {
          resumeAction: () => actionFn(...args)
        }
      });
      return;
    }

    actionFn(...args);
  };
};
