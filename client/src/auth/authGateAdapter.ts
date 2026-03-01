import { useState, useCallback, useEffect } from 'react';
import { AuthIntent, IntentMeta, INTENT_MAP } from './authIntents';

// Types for the new API
export interface OpenOptions {
  intent: AuthIntent;
  metaOverride?: Partial<IntentMeta>;
  payload?: Record<string, unknown>; // e.g., predictionId
}

export interface AuthGateResult {
  status: 'success' | 'cancel' | 'error';
  reason?: string;
}

// Internal state interface
interface AuthGateState {
  isOpen: boolean;
  pendingIntent: AuthIntent | null;
  intentMeta: IntentMeta | null;
  payload?: Record<string, unknown>;
  resolver: ((result: AuthGateResult) => void) | null;
}

// Session storage keys
const STORAGE_KEY = 'fcz.pendingAuth';
const RETURN_URL_KEY = 'fcz.returnUrl';

// Global auth gate state
let authGateState: AuthGateState = {
  isOpen: false,
  pendingIntent: null,
  intentMeta: null,
  payload: undefined,
  resolver: null,
};

// Subscribers to auth gate state changes
const subscribers = new Set<() => void>();

// Notify all subscribers of state changes
const notifySubscribers = () => {
  subscribers.forEach(callback => callback());
};

// Update global auth gate state
const updateAuthGateState = (updates: Partial<AuthGateState>) => {
  authGateState = { ...authGateState, ...updates };
  notifySubscribers();
};

// Session storage helpers
const persistPendingAuth = (intent: AuthIntent, payload?: Record<string, unknown>) => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ intent, payload }));
    // Store the current URL for redirect after auth
    const currentUrl = window.location.pathname + window.location.search;
    console.log('📌 Storing return URL:', currentUrl);
    sessionStorage.setItem(RETURN_URL_KEY, currentUrl);
    console.log('✅ Return URL stored successfully');
  } catch (error) {
    console.warn('Failed to persist pending auth:', error);
  }
};

const clearPersistedAuth = () => {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(RETURN_URL_KEY);
  } catch (error) {
    console.warn('Failed to clear persisted auth:', error);
  }
};

const getPersistedAuth = (): { intent: AuthIntent; payload?: Record<string, unknown> } | null => {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn('Failed to get persisted auth:', error);
  }
  return null;
};

/**
 * Get the stored return URL (where user should be redirected after auth)
 */
export const getReturnUrl = (): string => {
  try {
    const returnUrl = sessionStorage.getItem(RETURN_URL_KEY);
    console.log('📍 getReturnUrl called - stored value:', returnUrl);
    const finalUrl = returnUrl || '/';
    console.log('📍 Returning URL:', finalUrl);
    return finalUrl;
  } catch (error) {
    console.warn('Failed to get return URL:', error);
    return '/';
  }
};

/**
 * Hook to access auth gate state
 */
export const useAuthGate = () => {
  const [, forceUpdate] = useState({});

  useEffect(() => {
    const callback = () => forceUpdate({});
    subscribers.add(callback);
    return () => {
      subscribers.delete(callback);
    };
  }, []);

  return {
    isOpen: authGateState.isOpen,
    pendingIntent: authGateState.pendingIntent,
    intentMeta: authGateState.intentMeta,
    payload: authGateState.payload,
  };
};

/**
 * Open the auth gate modal for a specific intent
 * Returns a promise that resolves when the user completes or cancels auth
 */
export const openAuthGate = (opts: OpenOptions): Promise<AuthGateResult> => {
  if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_LOGS === 'true') {
    console.log('[FCZ-QA] openAuthGate called with:', opts);
  }

  return new Promise<AuthGateResult>((resolve) => {
    const baseIntentMeta = INTENT_MAP[opts.intent];
    const intentMeta: IntentMeta = opts.metaOverride 
      ? { ...baseIntentMeta, ...opts.metaOverride }
      : baseIntentMeta;
    
    // Persist to sessionStorage for refresh recovery
    persistPendingAuth(opts.intent, opts.payload);
    
    updateAuthGateState({
      isOpen: true,
      pendingIntent: opts.intent,
      intentMeta,
      payload: opts.payload,
      resolver: resolve,
    });
  });
};

/**
 * Resolve the current auth gate with a result
 */
export const resolveAuthGate = (result: AuthGateResult): void => {
  if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_LOGS === 'true') {
    console.log('[FCZ-QA] resolveAuthGate called with:', result);
  }

  const { resolver, pendingIntent, payload } = authGateState;
  
  // Don't clear return URL yet - it will be cleared by AuthCallback after redirect
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear auth intent:', error);
  }
  
  updateAuthGateState({
    isOpen: false,
    pendingIntent: null,
    intentMeta: null,
    payload: undefined,
    resolver: null,
  });

  // If successful auth, handle the resume action
  if (result.status === 'success' && pendingIntent && pendingIntent !== 'edit_profile') {
    handleResumeAfterAuth(pendingIntent, payload);
  }

  if (resolver) {
    resolver(result);
  }
};

/**
 * Handle resume-after-auth actions based on the intent
 */
const handleResumeAfterAuth = (intent: AuthIntent, payload?: Record<string, unknown>) => {
  if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_LOGS === 'true') {
    console.log('[FCZ-QA] Handling resume after auth for intent:', intent, 'with payload:', payload);
  }

  switch (intent) {
    case 'view_wallet':
      // Wallet will automatically reload its data when user becomes authenticated
      break;
      
    case 'view_my_bets':
      // BetsTab will automatically load user bets when user becomes authenticated
      break;
      
    case 'comment_prediction':
      // Focus the comment composer after auth
      setTimeout(() => {
        const textarea = document.querySelector('.comment-textarea') as HTMLTextAreaElement;
        if (textarea) {
          textarea.focus();
        }
      }, 100);
      break;
      
    case 'place_prediction':
      // Navigate to create prediction or focus the bet amount input
      if (payload?.predictionId) {
        // If there's a specific prediction, focus the bet input
        setTimeout(() => {
          const betInput = document.querySelector('[data-qa="bet-amount"]') as HTMLInputElement;
          if (betInput) {
            betInput.focus();
          }
        }, 100);
      }
      break;
      
    default:
      // No specific resume action needed
      break;
  }
};

/**
 * Close the auth gate (same as resolving with cancel)
 */
export const closeAuthGate = () => {
  resolveAuthGate({ status: 'cancel' });
};

/**
 * Get current pending intent and payload for resume-after-auth
 */
export const getPendingIntent = (): { intent?: AuthIntent; payload?: any } => {
  return {
    intent: authGateState.pendingIntent || undefined,
    payload: authGateState.payload,
  };
};

/**
 * Check if auth gate is currently open
 */
export const isAuthGateOpen = () => {
  return authGateState.isOpen;
};

/**
 * Get current auth gate state (read-only)
 */
export const getAuthGateState = (): Readonly<AuthGateState> => {
  return { ...authGateState };
};

/**
 * Restore pending auth state from sessionStorage (called on app init)
 */
export const restorePendingAuth = (): { intent: AuthIntent; payload?: Record<string, unknown> } | null => {
  const persisted = getPersistedAuth();
  if (persisted) {
    if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_LOGS === 'true') {
      console.log('[FCZ-QA] Restored pending auth from sessionStorage:', persisted);
    }
    
    // Don't auto-open the modal, just restore the state for potential resumption
    updateAuthGateState({
      pendingIntent: persisted.intent,
      payload: persisted.payload,
      // Don't set isOpen or resolver - let the app decide when to re-open
    });
    
    return persisted;
  }
  return null;
};

// Legacy compatibility - keep the old useAuthGate export name for backward compatibility
export { useAuthGate as useAuthGateAdapter };
