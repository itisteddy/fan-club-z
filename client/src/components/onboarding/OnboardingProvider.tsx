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
  Compass, 
  Target, 
  TrendingUp, 
  Wallet, 
  User, 
  Plus,
  Search,
  Filter,
  BarChart3,
  Settings
} from 'lucide-react';

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

// Comprehensive tour configurations with proper target IDs matching current UI
const FULL_TOUR_STEPS: OnboardingStep[] = [
  // Welcome & Discover Tab
  {
    id: 'welcome-discover',
    title: 'Welcome to FanClubZ!',
    description: 'This is where you\'ll find active predictions and explore new markets. Browse through the list to see all available predictions you can participate in.',
    target: 'discover-list',
    placement: 'bottom',
    offset: { y: 24 },
    icon: <Compass className="w-5 h-5" />,
    delay: 500
  },
  
  // Search functionality
  {
    id: 'search-feature',
    title: 'Search Predictions',
    description: 'Use the search bar to find specific topics, events, or types of predictions that interest you.',
    target: 'search-bar',
    placement: 'bottom',
    icon: <Search className="w-5 h-5" />
  },
  
  // Category filters
  {
    id: 'category-filters',
    title: 'Browse by Category',
    description: 'Filter predictions by category - Sports, Pop Culture, Tech, Finance, and more. Tap a category to filter the list.',
    target: 'category-filters',
    placement: 'bottom',
    icon: <Filter className="w-5 h-5" />
  },
  
  // FAB for creating predictions
  {
    id: 'create-prediction',
    title: 'Create Your Own Prediction',
    description: 'Have an insight you want to share? Tap the plus button to create your own prediction and invite others to participate.',
    target: 'create-fab',
    placement: 'left',
    offset: { y: -80 },
    icon: <Plus className="w-5 h-5" />
  },
  
  // My Bets tab
  {
    id: 'my-bets-tab',
    title: 'Track Your Bets',
    description: 'View all your active bets, predictions you\'ve created, and your completed bets with results here.',
    target: 'tab-bets',
    placement: 'top',
    offset: { y: -40 },
    icon: <TrendingUp className="w-5 h-5" />,
    onNext: async () => {
      // Navigate to bets page
      const navigate = (window as any).__router_navigate;
      if (navigate) {
        navigate('/bets');
        // Wait for navigation to complete
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
  },
  
  // Wallet tab
  {
    id: 'wallet-tab',
    title: 'Manage Your Wallet',
    description: 'Keep track of your balance, view transaction history, and manage your funds securely.',
    target: 'tab-wallet',
    placement: 'top',
    // Step 7/10: raise tooltip above bottom nav
    offset: { y: -40 },
    icon: <Wallet className="w-5 h-5" />,
    onNext: async () => {
      const navigate = (window as any).__router_navigate;
      if (navigate) {
        navigate('/wallet');
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
  },
  
  // Leaderboard tab
  {
    id: 'leaderboard-tab',
    title: 'Rankings & Leaderboard',
    description: 'See how you stack up against other players and track top performers.',
    target: 'tab-leaderboard',
    placement: 'top',
    offset: { y: -40 },
    icon: <BarChart3 className="w-5 h-5" />
  },
  
  // Profile tab
  {
    id: 'profile-tab',
    title: 'Your Profile',
    description: 'Access your profile settings, view your stats, and manage your account.',
    target: 'tab-profile',
    placement: 'top',
    offset: { y: -40 },
    icon: <User className="w-5 h-5" />,
    onNext: async () => {
      const navigate = (window as any).__router_navigate;
      if (navigate) {
        navigate('/profile');
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
  },
  
  // Tour complete
  {
    id: 'tour-complete',
    title: 'You\'re Ready!',
    description: 'You now know how to navigate FanClubZ. Start exploring, place bets, and have fun!',
    target: 'tab-discover',
    placement: 'top',
    offset: { y: -40 },
    icon: <Target className="w-5 h-5" />,
    onNext: async () => {
      const navigate = (window as any).__router_navigate;
      if (navigate) {
        navigate('/');
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
  }
];

const QUICK_TOUR_STEPS: OnboardingStep[] = [
  {
    id: 'quick-discover',
    title: 'Discover Predictions',
    description: 'Browse and participate in predictions from the community.',
    target: 'tab-discover',
    placement: 'top',
    icon: <Compass className="w-5 h-5" />
  },
  {
    id: 'quick-create',
    title: 'Create Predictions',
    description: 'Share your insights by creating your own predictions.',
    target: 'create-fab',
    placement: 'left',
    icon: <Plus className="w-5 h-5" />
  },
  {
    id: 'quick-track',
    title: 'Track Progress',
    description: 'Monitor your active and completed predictions.',
    target: 'tab-bets',
    placement: 'top',
    icon: <TrendingUp className="w-5 h-5" />
  },
  {
    id: 'quick-wallet',
    title: 'Manage Funds',
    description: 'View your balance and transaction history.',
    target: 'tab-wallet',
    placement: 'top',
    icon: <Wallet className="w-5 h-5" />
  }
];

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
  const canRunTour = 
    user && // Signed in
    !authLoading && // Auth loaded
    document.querySelector('[data-tour="discover-header"]'); // UI ready

  // Store navigate function globally for onboarding steps
  useEffect(() => {
    (window as any).__router_navigate = navigate;
    return () => {
      delete (window as any).__router_navigate;
    };
  }, [navigate]);

  // Check if we should show onboarding on app start
  useEffect(() => {
    const timer = setTimeout(() => {
      if (shouldShowWelcomeModal()) {
        setShowWelcome(true);
      }
    }, 1000); // Small delay to ensure app is fully loaded

    return () => clearTimeout(timer);
  }, []);

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
      setTimeout(() => {
        startOnboarding({
          steps: FULL_TOUR_STEPS,
          allowSkip: true,
          showProgress: true,
          persistent: true
        });
      }, 500);
    } else {
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