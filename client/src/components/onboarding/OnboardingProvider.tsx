import React, { createContext, useContext, useCallback, useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { isDev } from '@/utils/environment';
import { useAuthStore } from '@/store/authStore';
import { 
  OnboardingSystem, 
  WelcomeModal, 
  useOnboarding,
  type OnboardingStep 
} from './OnboardingSystem';
import {
  FULL_CONTEXTUAL_TOUR,
  QUICK_DISCOVER_TOUR
} from '@/config/contextualOnboardingTours';

// Enhanced onboarding context
interface OnboardingContextValue {
  isActive: boolean;
  showWelcome: boolean;
  startFullTour: () => void;
  startQuickTour: () => void;
  skipOnboarding: () => void;
  resetOnboarding: () => void;
  hasSeenOnboarding: boolean;
  currentStep: number;
  totalSteps: number;
}

const OnboardingContext = createContext<OnboardingContextValue | undefined>(undefined);

// Use contextual tours imported from config
const FULL_TOUR_STEPS: OnboardingStep[] = FULL_CONTEXTUAL_TOUR;
const QUICK_TOUR_STEPS: OnboardingStep[] = QUICK_DISCOVER_TOUR;

// Smart trigger conditions
const shouldShowOnboarding = () => {
  try {
    const stored = localStorage.getItem('fcz_onboarding_state_v3');
    if (!stored) return true;
    
    const state = JSON.parse(stored);
    return !state.userPreferences?.hasSeenOnboarding;
  } catch {
    return true;
  }
};

const shouldShowWelcomeModal = () => {
  // Show welcome modal for first-time users or when explicitly requested
  const urlParams = new URLSearchParams(window.location.search);
  const forceWelcome = urlParams.get('welcome') === '1';
  
  return forceWelcome || shouldShowOnboarding();
};

// Enhanced Onboarding Provider
export const OnboardingProvider: React.FC<{ children: React.ReactNode }> = ({ 
  children 
}) => {
  const [location, navigate] = useLocation();
  const {
    state,
    config,
    startOnboarding,
    nextStep,
    prevStep,
    skipOnboarding,
    resetOnboarding
  } = useOnboarding();

  const [showWelcome, setShowWelcome] = useState(false);
  const { user, loading: authLoading } = useAuthStore();
  
  // Gate: Don't run tour during auth flow or modals
  // Check UI readiness based on current route, not just discover page
  const checkUIReady = () => {
    const path = location.toLowerCase();
    if (path === '/' || path === '/discover') {
      return !!document.querySelector('[data-tour="discover-header"]');
    }
    // For other pages, just check if user is signed in and auth is loaded
    return true;
  };

  const canRunTour = 
    user && // Signed in
    !authLoading && // Auth loaded
    checkUIReady(); // UI ready for current page

  // Store navigate function globally for onboarding steps
  useEffect(() => {
    (window as any).__router_navigate = navigate;
    return () => {
      delete (window as any).__router_navigate;
    };
  }, [navigate]);

  // Check if we should show onboarding on app start
  // Reduced delay and check UI readiness before showing
  useEffect(() => {
    if (!user || authLoading) return; // Wait for auth
    
    const checkAndShow = () => {
      // Only show welcome modal on discover page for first-time users
      if ((location === '/' || location === '/discover') && shouldShowWelcomeModal()) {
        // Check if UI is ready before showing
        if (checkUIReady()) {
          setShowWelcome(true);
        } else {
          // Retry after a short delay if UI not ready
          setTimeout(checkAndShow, 200);
        }
      }
    };

    // Start checking immediately, but with a small delay for initial render
    const timer = setTimeout(checkAndShow, 300);

    return () => clearTimeout(timer);
  }, [user, authLoading, location]);

  // URL-based tour triggers
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tourType = urlParams.get('tour');
    
    if (tourType === 'full') {
      handleStartFullTour();
    } else if (tourType === 'quick') {
      handleStartQuickTour();
    }
  }, [location]);

  const handleStartFullTour = useCallback(() => {
    setShowWelcome(false);
    
    // Ensure we're on the discover page for the full tour
    if (location !== '/' && location !== '/discover') {
      navigate('/');
      // Wait for navigation and UI to be ready before starting tour
      const checkAndStart = () => {
        const header = document.querySelector('[data-tour="discover-header"]');
        if (header) {
          startOnboarding({
            steps: FULL_TOUR_STEPS,
            allowSkip: true,
            showProgress: true,
            persistent: true
          });
        } else {
          // Retry if UI not ready yet
          setTimeout(checkAndStart, 100);
        }
      };
      setTimeout(checkAndStart, 200);
    } else {
      // Already on discover page, start immediately
      startOnboarding({
        steps: FULL_TOUR_STEPS,
        allowSkip: true,
        showProgress: true,
        persistent: true
      });
    }
  }, [location, navigate, startOnboarding]);

  const handleStartQuickTour = useCallback(() => {
    setShowWelcome(false);
    startOnboarding({
      steps: QUICK_TOUR_STEPS,
      allowSkip: true,
      showProgress: true,
      persistent: false
    });
  }, [startOnboarding]);

  const handleSkipOnboarding = useCallback(() => {
    setShowWelcome(false);
    skipOnboarding();
  }, [skipOnboarding]);

  const handleResetOnboarding = useCallback(() => {
    resetOnboarding();
    setShowWelcome(true);
  }, [resetOnboarding]);

  // Context value
  const contextValue: OnboardingContextValue = {
    isActive: !!(state.isActive && canRunTour),
    showWelcome,
    startFullTour: handleStartFullTour,
    startQuickTour: handleStartQuickTour,
    skipOnboarding: handleSkipOnboarding,
    resetOnboarding: handleResetOnboarding,
    hasSeenOnboarding: state.userPreferences.hasSeenOnboarding,
    currentStep: state.currentStep,
    totalSteps: config?.steps.length || 0
  };

  // Don't render tour if gated
  if (!canRunTour && state.isActive) {
    return <OnboardingContext.Provider value={contextValue}>{children}</OnboardingContext.Provider>;
  }

  return (
    <OnboardingContext.Provider value={contextValue}>
      {children}
      
      {/* Welcome Modal */}
      {canRunTour && (
        <WelcomeModal
          isOpen={showWelcome}
          onStartTour={handleStartFullTour}
          onMinimalTour={handleStartQuickTour}
          onSkip={handleSkipOnboarding}
        />
      )}
      
      {/* Onboarding System */}
      {canRunTour && (
        <OnboardingSystem
          isActive={state.isActive}
          config={config}
          currentStep={state.currentStep}
          onNext={nextStep}
          onPrev={prevStep}
          onSkip={skipOnboarding}
        />
      )}
    </OnboardingContext.Provider>
  );
};

// Hook to use onboarding context
export const useOnboardingContext = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboardingContext must be used within OnboardingProvider');
  }
  return context;
};

// Debug component for development
export const OnboardingDebugPanel: React.FC = () => {
  const {
    isActive,
    hasSeenOnboarding,
    currentStep,
    totalSteps,
    startFullTour,
    startQuickTour,
    resetOnboarding
  } = useOnboardingContext();

  if (!isDev) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 bg-white p-3 rounded-lg shadow-lg border z-[30000] text-xs max-w-48">
      <div className="font-semibold mb-2 text-teal-600">Onboarding v3</div>
      <div className="space-y-1 text-gray-600">
        <div>Active: {isActive ? 'Yes' : 'No'}</div>
        <div>Seen: {hasSeenOnboarding ? 'Yes' : 'No'}</div>
        <div>Step: {currentStep + 1}/{totalSteps}</div>
      </div>
      <div className="flex gap-1 mt-2 flex-wrap">
        <button
          onClick={startFullTour}
          className="px-2 py-1 bg-blue-500 text-white rounded text-xs"
        >
          Full
        </button>
        <button
          onClick={startQuickTour}
          className="px-2 py-1 bg-teal-500 text-white rounded text-xs"
        >
          Quick
        </button>
        <button
          onClick={resetOnboarding}
          className="px-2 py-1 bg-red-500 text-white rounded text-xs"
        >
          Reset
        </button>
      </div>
    </div>
  );
};

export default OnboardingProvider;