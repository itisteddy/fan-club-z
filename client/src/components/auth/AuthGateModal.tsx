import React, { useEffect, useRef, useState } from 'react';
import { X, Mail, Chrome } from 'lucide-react';
import { FocusTrap, AriaUtils, KeyboardNavigation } from '../../utils/accessibility';
import { useAuthGate, resolveAuthGate } from '../../auth/authGateAdapter';
import { useAuthSession } from '../../providers/AuthSessionProvider';
import { useNetworkStatus } from '../../providers/NetworkStatusProvider';
import { INTENT_MAP, FALLBACK_INTENT } from '../../auth/authIntents';
import { isFeatureEnabled } from '../../config/featureFlags';
import { isGoogleOAuthSupported } from '@/lib/browserContext';
import InAppBrowserGate from './InAppBrowserGate';
import EmailInputModal from './EmailInputModal';

const AuthGateModal: React.FC = () => {
  const { isOpen, pendingIntent, intentMeta } = useAuthGate();
  const { signInWithGoogle, signInWithApple, signInWithEmailLink, user } = useAuthSession();
  const showAppleSignIn = isFeatureEnabled('SIGN_IN_APPLE');
  const { isOnline } = useNetworkStatus();
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [showBrowserGate, setShowBrowserGate] = useState(false);
  
  const modalRef = useRef<HTMLDivElement>(null);
  const firstButtonRef = useRef<HTMLButtonElement>(null);
  const focusTrapRef = useRef<FocusTrap | null>(null);
  const [modalId] = useState(() => AriaUtils.generateId('auth-modal'));

  // Compute displayMeta with fallback as per spec - ALWAYS render when isOpen is true
  const displayMeta = 
    intentMeta ?? 
    (pendingIntent ? INTENT_MAP[pendingIntent] : undefined) ?? 
    FALLBACK_INTENT;

  // Focus management with accessibility
  useEffect(() => {
    if (isOpen && modalRef.current) {
      // Initialize focus trap
      focusTrapRef.current = new FocusTrap(modalRef.current);
      focusTrapRef.current.activate();
      
      // Announce modal opening to screen readers
      AriaUtils.announce(`${displayMeta.title} dialog opened`);
      
      return () => {
        if (focusTrapRef.current) {
          focusTrapRef.current.deactivate();
          focusTrapRef.current = null;
        }
      };
    }
  }, [isOpen, displayMeta.title]);

  // Handle keyboard interactions
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      KeyboardNavigation.handleEscape(e, handleClose);
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen]);

  // Handle successful authentication - resolve with success
  useEffect(() => {
    if (user && isOpen) {
      if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_LOGS === 'true') {
        console.log('[FCZ-QA] User authenticated, resolving auth gate');
      }
      resolveAuthGate({ status: 'success' });
    }
  }, [user, isOpen]);

  // Handle modal close
  const handleClose = () => {
    if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_LOGS === 'true') {
      console.log('[FCZ-QA] Auth modal closed by user');
    }
    resolveAuthGate({ status: 'cancel' });
  };

  // Handle Google sign in — with in-app browser gate
  const handleGoogleSignIn = async () => {
    // Gate: block Google OAuth in in-app browsers (403 disallowed_useragent)
    if (!isGoogleOAuthSupported()) {
      console.log('[FCZ-QA] Google OAuth blocked: in-app browser detected');
      setShowBrowserGate(true);
      return;
    }

    if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_LOGS === 'true') {
      console.log('[FCZ-QA] Google sign in attempt');
    }
    
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        console.error('Google sign in error:', error);
        resolveAuthGate({ 
          status: 'error', 
          reason: error.message || 'Google sign in failed' 
        });
      }
      // Success case handled by useEffect above
    } catch (error) {
      console.error('Google sign in exception:', error);
      resolveAuthGate({ 
        status: 'error', 
        reason: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  };

  // Handle Apple sign in — also gated (Apple OAuth has similar in-app restrictions)
  const handleAppleSignIn = async () => {
    if (!isGoogleOAuthSupported()) {
      console.log('[FCZ-QA] Apple OAuth blocked: in-app browser detected');
      setShowBrowserGate(true);
      return;
    }

    if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_LOGS === 'true') {
      console.log('[FCZ-QA] Apple sign in attempt');
    }
    try {
      const { error } = await signInWithApple();
      if (error) {
        console.error('Apple sign in error:', error);
        resolveAuthGate({
          status: 'error',
          reason: error.message || 'Sign in with Apple failed',
        });
      }
    } catch (error) {
      console.error('Apple sign in exception:', error);
      resolveAuthGate({
        status: 'error',
        reason: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  // Handle email link sign in
  const handleEmailLinkSignIn = () => {
    if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_LOGS === 'true') {
      console.log('[FCZ-QA] Opening email input modal');
    }
    setIsEmailModalOpen(true);
  };

  const handleEmailSubmit = async (email: string) => {
    if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_LOGS === 'true') {
      console.log('[FCZ-QA] Email sign in attempt with:', email);
    }
    
    try {
      const { error } = await signInWithEmailLink(email);
      if (error) {
        console.error('Email sign in error:', error);
        throw new Error(error.message || 'Email sign in failed');
      } else {
        // Success - close email modal and main modal
        setIsEmailModalOpen(false);
        resolveAuthGate({ status: 'success' });
      }
    } catch (error) {
      console.error('Email sign in exception:', error);
      throw error; // Re-throw to let EmailInputModal handle it
    }
  };

  // Don't render if modal is not open - NEVER early-return for missing intentMeta
  if (!isOpen) return null;

  const isOffline = !isOnline;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ 
        pointerEvents: isOpen ? 'auto' : 'none' // Ensure no pointer-event bleed when closed
      }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${modalId}-title`}
        aria-describedby={`${modalId}-description`}
        aria-live="polite"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 id={`${modalId}-title`} className="text-xl font-semibold text-gray-900">
              {displayMeta.title}
            </h2>
            <p id={`${modalId}-description`} className="text-sm text-gray-600 mt-1">
              {displayMeta.description}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="space-y-4">
            {/* Sign in with Apple - first when enabled (Apple HIG: equal or higher prominence) */}
            {showAppleSignIn && (
              <button
                type="button"
                ref={firstButtonRef}
                onClick={handleAppleSignIn}
                disabled={isOffline}
                className="w-full flex items-center justify-center gap-3 bg-black hover:bg-gray-800 disabled:bg-gray-300 text-white py-4 px-6 rounded-xl font-semibold transition-colors disabled:cursor-not-allowed shadow-lg min-h-[44px]"
                data-qa="auth-gate-apple"
                title="Sign in with Apple to FanClubZ"
                aria-label="Sign in with Apple"
              >
                {/* Apple logo glyph (U+F8FF). Renders correctly on iOS/macOS system fonts. */}
                <span
                  aria-hidden
                  className="text-[18px] leading-none"
                  style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}
                >
                  {'\uF8FF'}
                </span>
                Sign in with Apple
              </button>
            )}

            {/* Primary CTA - Google (first when Apple is off) */}
            <button
              type="button"
              ref={!showAppleSignIn ? firstButtonRef : undefined}
              onClick={handleGoogleSignIn}
              disabled={isOffline}
              className="w-full flex items-center justify-center gap-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-300 text-white py-4 px-6 rounded-xl font-semibold transition-colors disabled:cursor-not-allowed shadow-lg relative group min-h-[44px]"
              data-qa="auth-gate-google"
              title="You'll sign in with Google to FanClubZ"
            >
              <Chrome className="w-5 h-5" />
              {displayMeta.primaryCta}
            </button>
            
            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">or</span>
              </div>
            </div>
            
            {/* Secondary CTA - Email */}
            <button
              type="button"
              onClick={handleEmailLinkSignIn}
              disabled={isOffline}
              className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-200 hover:bg-gray-50 hover:border-gray-300 disabled:bg-gray-100 disabled:border-gray-200 text-gray-700 py-4 px-6 rounded-xl font-semibold transition-colors disabled:cursor-not-allowed min-h-[44px]"
              data-qa="auth-gate-email"
            >
              <Mail className="w-5 h-5" />
              {displayMeta.secondaryCta}
            </button>

            {/* Offline message */}
            {isOffline && (
              <div className="text-center py-2">
                <p className="text-sm text-orange-600 bg-orange-50 px-3 py-2 rounded-lg">
                  You're offline. Try again when you're back online.
                </p>
              </div>
            )}
          </div>
        </div>

         {/* Footer */}
         <div className="px-6 pb-6">
           <p className="text-xs text-gray-500 text-center">
             By continuing, you agree to FanClubZ's Terms of Service and Privacy Policy.
           </p>
         </div>
       </div>

       {/* In-App Browser Gate (blocks Google/Apple OAuth in MetaMask, Instagram, etc.) */}
       <InAppBrowserGate
         open={showBrowserGate}
         onClose={() => setShowBrowserGate(false)}
       />

       {/* Email Input Modal */}
       <EmailInputModal
         isOpen={isEmailModalOpen}
         onClose={() => setIsEmailModalOpen(false)}
         onSubmit={handleEmailSubmit}
         title="Continue with Email"
         description="Enter your email address and we'll send you a secure sign-in link."
         submitLabel="Send Sign-in Link"
       />
     </div>
   );
 };
 
 export default AuthGateModal;
