import { useState, useCallback, useEffect } from 'react';
import { useAuthSession } from '../providers/AuthSessionProvider';
import { useNetworkStatus } from '../providers/NetworkStatusProvider';
import { AuthIntentKey, AuthIntentMeta, AUTH_INTENTS } from './authIntents';
import { qaLog } from '../utils/devQa';

interface PendingIntent {
  intent: AuthIntentKey;
  timestamp: number;
  route: string;
  payload?: any;
}

export interface UseAuthAdapter {
  isOpen: boolean;
  intent: AuthIntentKey | null;
  intentMeta: AuthIntentMeta | null;
  offline: boolean;

  open: (intent: AuthIntentKey) => void;
  close: () => void;

  /** Gate an action; run when authed (now or after resume) */
  require: <T>(intent: AuthIntentKey, action: () => Promise<T> | T) => Promise<T | undefined>;

  /** Call on app boot (effect in App) to resume a prior intent after OAuth return */
  resumeIfNeeded: () => void;
}

export const useAuthAdapter = (): UseAuthAdapter => {
  const { user, signInWithGoogle, signInWithEmailLink } = useAuthSession();
  const { isOnline } = useNetworkStatus();
  
  const [isOpen, setIsOpen] = useState(false);
  const [currentIntent, setCurrentIntent] = useState<AuthIntentKey | null>(null);
  const [pendingAction, setPendingAction] = useState<(() => Promise<any> | any) | null>(null);

  const offline = !isOnline;

  const intentMeta = currentIntent ? AUTH_INTENTS[currentIntent] : null;

  const open = useCallback((intent: AuthIntentKey) => {
    qaLog('Auth adapter: opening intent', intent);
    
    if (offline) {
      qaLog('Auth adapter: offline, cannot open modal');
      return;
    }

    // Store the intent in sessionStorage for resume functionality
    const pendingIntent: PendingIntent = {
      intent,
      timestamp: Date.now(),
      route: window.location.pathname,
    };
    
    sessionStorage.setItem('fcz_pending_intent', JSON.stringify(pendingIntent));
    
    setCurrentIntent(intent);
    setIsOpen(true);
  }, [offline]);

  const close = useCallback(() => {
    qaLog('Auth adapter: closing modal');
    setIsOpen(false);
    setCurrentIntent(null);
    setPendingAction(null);
    
    // Clear the pending intent from sessionStorage
    sessionStorage.removeItem('fcz_pending_intent');
  }, []);

  const require = useCallback(async <T>(
    intent: AuthIntentKey,
    action: () => Promise<T> | T
  ): Promise<T | undefined> => {
    qaLog('Auth adapter: require called', intent, !!user);
    
    if (user) {
      // User is authenticated, run the action immediately
      try {
        return await action();
      } catch (error) {
        qaLog('Auth adapter: action failed', error);
        throw error;
      }
    } else {
      // User is not authenticated, store the action and open the modal
      setPendingAction(() => action);
      open(intent);
      return undefined;
    }
  }, [user, open]);

  const resumeIfNeeded = useCallback(() => {
    qaLog('Auth adapter: checking for pending intent');
    
    try {
      const stored = sessionStorage.getItem('fcz_pending_intent');
      if (!stored) {
        qaLog('Auth adapter: no pending intent found');
        return;
      }

      const pendingIntent: PendingIntent = JSON.parse(stored);
      
      // Check if the intent is still valid (within 5 minutes)
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;
      
      if (now - pendingIntent.timestamp > fiveMinutes) {
        qaLog('Auth adapter: pending intent expired');
        sessionStorage.removeItem('fcz_pending_intent');
        return;
      }

      // Check if we're on the same route
      if (window.location.pathname !== pendingIntent.route) {
        qaLog('Auth adapter: route changed, clearing pending intent');
        sessionStorage.removeItem('fcz_pending_intent');
        return;
      }

      // If user is now authenticated, we can resume
      if (user) {
        qaLog('Auth adapter: user authenticated, resuming intent', pendingIntent.intent);
        
        // Clear the stored intent
        sessionStorage.removeItem('fcz_pending_intent');
        
        // If there's a pending action, run it
        if (pendingAction) {
          qaLog('Auth adapter: running pending action');
          pendingAction().catch((error: unknown) => {
            qaLog('Auth adapter: pending action failed', error);
          });
          setPendingAction(null);
        }
      } else {
        // User is still not authenticated, open the modal
        qaLog('Auth adapter: user not authenticated, opening modal');
        setCurrentIntent(pendingIntent.intent);
        setIsOpen(true);
      }
    } catch (error) {
      qaLog('Auth adapter: error resuming intent', error);
      sessionStorage.removeItem('fcz_pending_intent');
    }
  }, [user, pendingAction]);

  // Handle successful authentication
  useEffect(() => {
    if (user && isOpen && currentIntent) {
      qaLog('Auth adapter: user authenticated, closing modal and resuming');
      close();
      
      // Run pending action if it exists
      if (pendingAction) {
        pendingAction().catch((error: unknown) => {
          qaLog('Auth adapter: pending action failed after auth', error);
        });
        setPendingAction(null);
      }
    }
  }, [user, isOpen, currentIntent, close, pendingAction]);

  return {
    isOpen,
    intent: currentIntent,
    intentMeta,
    offline,
    open,
    close,
    require,
    resumeIfNeeded,
  };
};
