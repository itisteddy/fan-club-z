import React, { createContext, useContext, useCallback, useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { 
  EnhancedOnboardingSystem, 
  WelcomeModal, 
  useEnhancedOnboarding
} from './EnhancedOnboardingSystem';
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

// Fixed tour configurations with proper target IDs
const FULL_TOUR_STEPS = [
  // Welcome & Discover Tab
  {
    id: 'welcome-discover',
    title: 'Welcome to Discover',
    description: 'This is where you\'ll find trending predictions and explore new markets. Scroll down to see all available predictions.',
    target: 'discover-list',
    placement: 'center',
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
    description: 'Filter predictions by category - Sports, Pop Culture, Tech, Finance, and more. Find what you\'re passionate about.',
    target: 'category-filters',
    placement: 'bottom',
    icon: <Filter className="w-5 h-5" />
  },
  
  // FAB for creating predictions
  {
    id: 'create-prediction',
    title: 'Create Your Own',
    description: 'Ready to share your insights? Tap the plus button to create your own prediction and invite others to participate.',
    target: 'create-fab',
    placement: 'left',
    icon: <Plus className="w-5 h-5" />
  },
  
  // My Bets tab
  {
    id: 'my-bets-tab',
    title: 'Track Your Predictions',
    description: 'View all your active predictions, ones you\'ve created, and your completed predictions with results.',
    target: 'tab-bets',
    placement: 'top',
    icon: <TrendingUp className="w-5 h-5" />,
    onNext: () => {
      // Navigate to predictions page
      const navigate = (window as any).__router_navigate;
      if (navigate) navigate('/predictions');
    }
  },
  
  // Bets management tabs
  {
    id: 'bets-management',
    title: 'Organize Your Activity',
    description: 'Switch between Active (ongoing), Created (your predictions), and Completed (finished) to stay organized.',
    target: 'bets-tabs',
    placement: 'bottom',
    icon: <BarChart3 className="w-5 h-5" />
  },
  
  // Wallet tab
  {
    id: 'wallet-tab',
    title: 'Manage Your Wallet',
    description: 'Keep track of your balance, view transaction history, and manage your funds securely.',
    target: 'tab-wallet',
    placement: 'top',
    icon: <Wallet className="w-5 h-5" />,
    onNext: () => {
      const navigate = (window as any).__router_navigate;
      if (navigate) navigate('/wallet');
    }
  },
  
  // Wallet balance
  {
    id: 'wallet-balance',
    title: 'Your Balance',
    description: 'Your current balance is displayed here. In demo mode, you can add test funds to try out predictions.',
    target: 'wallet-balance',
    placement: 'bottom',
    icon: <Wallet className="w-5 h-5" />
  },
  
  // Profile tab
  {
    id: 'profile-tab',
    title: 'Your Profile',
    description: 'Access your settings, view achievements, manage notifications, and track your performance stats.',
    target: 'tab-profile',
    placement: 'top',
    icon: <User className="w-5 h-5" />,
    onNext: () => {
      const navigate = (window as any).__router_navigate;
      if (navigate) navigate('/profile');
    }
  },
  
  // Profile completion
  {
    id: 'profile-completion',
    title: 'Complete Your Profile',
    description: 'Take a moment to complete your profile information and adjust your preferences for the best experience.',
    target: 'profile-header',
    placement: 'bottom',
    icon: <Settings className="w-5 h-5" />
  }
];

const QUICK_TOUR_STEPS = [
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
  const stored = localStorage.getItem('fcz_onboarding_state_v2');
  if (!stored) return true;
  
  try {
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

// Fixed Enhanced Onboarding Provider
export const FixedOnboardingProvider: React.FC<{ children: React.ReactNode }> = ({ 
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
  } = useEnhancedOnboarding();

  const [showWelcome, setShowWelcome] = useState(false);

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
    isActive: state.isActive,
    showWelcome,
    startFullTour: handleStartFullTour,
    startQuickTour: handleStartQuickTour,
    skipOnboarding: handleSkipOnboarding,
    resetOnboarding: handleResetOnboarding,
    hasSeenOnboarding: state.userPreferences.hasSeenOnboarding,
    currentStep: state.currentStep,
    totalSteps: config?.steps.length || 0
  };

  return (
    <OnboardingContext.Provider value={contextValue}>
      {children}
      
      {/* Welcome Modal */}
      <WelcomeModal
        isOpen={showWelcome}
        onStartTour={handleStartFullTour}
        onMinimalTour={handleStartQuickTour}
        onSkip={handleSkipOnboarding}
      />
      
      {/* Enhanced Onboarding System */}
      <EnhancedOnboardingSystem
        isActive={state.isActive}
        config={config}
        currentStep={state.currentStep}
        onNext={nextStep}
        onPrev={prevStep}
        onSkip={skipOnboarding}
      />
    </OnboardingContext.Provider>
  );
};

// Hook to use onboarding context
export const useFixedOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useFixedOnboarding must be used within FixedOnboardingProvider');
  }
  return context;
};

// Fixed Debug component for development
export const FixedOnboardingDebugPanel: React.FC = () => {
  const {
    isActive,
    hasSeenOnboarding,
    currentStep,
    totalSteps,
    startFullTour,
    startQuickTour,
    resetOnboarding
  } = useFixedOnboarding();

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 bg-white p-3 rounded-lg shadow-lg border z-[20000] text-xs max-w-48">
      <div className="font-semibold mb-2 text-teal-600">Fixed Onboarding v2</div>
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

export default FixedOnboardingProvider;