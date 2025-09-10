import React, { useEffect, useCallback, memo, Suspense } from 'react';
import { Router, Route, Switch, useLocation } from 'wouter';
import { useWalletStore } from './store/walletStore';
import { useAuthStore } from './store/authStore';
import { useLikeStore } from './store/likeStore';
import { useUnifiedCommentStore } from './store/unifiedCommentStore';
import { Toaster } from 'react-hot-toast';
import { scrollToTop, saveScrollPosition, markNavigationAsIntentional } from './utils/scroll';
import NotificationContainer from './components/ui/NotificationContainer';
import PWAInstallManager from './components/PWAInstallManager';
import PageWrapper from './components/PageWrapper';
import { OnboardingProvider } from './components/onboarding/OnboardingProvider';
import { AuthSheetProvider } from './components/auth/AuthSheetProvider';
import AuthSheet from './components/auth/AuthSheet';

// Import all page components
import DiscoverPage from './pages/DiscoverPage';
import CreatePredictionPage from './pages/CreatePredictionPage';
import BetsTab from './pages/BetsTab';
import ProfilePage from './pages/ProfilePage';
import WalletPage from './pages/WalletPage';
// import AuthPage from './pages/auth/AuthPage'; // Removed - using bottom sheet auth
import AuthCallbackPage from './pages/auth/AuthCallbackPage';
import PredictionDetailsPage from './pages/PredictionDetailsPage';
import BottomNavigation from './components/BottomNavigation';
import ErrorBoundary from './components/ErrorBoundary';

// Simple Loading Component
const LoadingSpinner: React.FC<{ message?: string }> = ({ message = "Loading..." }) => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
      <p className="mt-2 text-gray-600">{message}</p>
    </div>
  </div>
);

// Simplified Auth Guard
const AuthGuard: React.FC<{ children: React.ReactNode }> = memo(({ children }) => {
  const { isAuthenticated, loading, initialized, initializeAuth } = useAuthStore();
  
  useEffect(() => {
    if (!initialized && !loading) {
      initializeAuth();
    }
  }, [initialized, loading, initializeAuth]);
  
  if (!initialized || (loading && !isAuthenticated)) {
    return <LoadingSpinner message="Authenticating..." />;
  }
  
  if (!isAuthenticated) {
    return <AuthPage />;
  }
  
  return <>{children}</>;
});

AuthGuard.displayName = 'AuthGuard';

// Enhanced Main Layout Component with scroll preservation
const MainLayout: React.FC<{ children: React.ReactNode }> = memo(({ children }) => {
  const [location, navigate] = useLocation();
  
  // Scroll to top on route change (mobile UX best practice)
  useEffect(() => {
    scrollToTop({ behavior: 'instant' });
  }, [location]);
  
  const getCurrentTab = useCallback(() => {
    const path = location.toLowerCase();
    if (path === '/' || path === '/discover') return 'discover';
    if (path === '/bets' || path === '/predictions') return 'bets';
    if (path === '/profile') return 'profile';
    if (path === '/wallet') return 'wallet';
    return 'discover';
  }, [location]);

  const handleTabChange = useCallback((tab: string) => {
    // Prevent infinite loops by checking if we're already on the target route
    const currentTab = getCurrentTab();
    if (currentTab === tab) return;
    
    // Save current scroll position before navigating
    saveScrollPosition(location);
    
    // Mark as intentional navigation to prevent auto-scroll-restore
    markNavigationAsIntentional();
    
    // Navigate to the appropriate route
    switch (tab) {
      case 'discover':
        navigate('/');
        break;
      case 'bets':
        navigate('/predictions');
        break;
      case 'profile':
        navigate('/profile');
        break;
      case 'wallet':
        navigate('/wallet');
        break;
      default:
        navigate('/');
    }
    
    // Only scroll to top for intentional tab changes, not for back navigation
    setTimeout(() => {
      scrollToTop({ behavior: 'instant' });
    }, 50);
  }, [navigate, getCurrentTab, location]);

  const handleFABClick = useCallback(() => {
    // Save current scroll position
    saveScrollPosition(location);
    markNavigationAsIntentional();
    navigate('/create');
  }, [navigate, location]);

  const showFAB = getCurrentTab() === 'discover';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" data-scroll-container>
      {/* Main Content */}
      <main className="flex-1 pb-20">
        <Suspense fallback={<LoadingSpinner message="Loading page..." />}>
          {children}
        </Suspense>
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation
        activeTab={getCurrentTab()}
        onTabChange={handleTabChange}
        showFAB={showFAB}
        onFABClick={handleFABClick}
      />

      {/* Notifications */}
      <NotificationContainer />
      
      {/* PWA Install Manager */}
      <PWAInstallManager />
      
      {/* Toast Notifications */}
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />
    </div>
  );
});

MainLayout.displayName = 'MainLayout';

// Enhanced Page Wrapper Components with scroll preservation
const DiscoverPageWrapper: React.FC = () => {
  const [location, navigate] = useLocation();
  
  const handleNavigateToProfile = useCallback(() => {
    saveScrollPosition(location);
    navigate('/profile');
  }, [navigate, location]);

  const handleNavigateToPrediction = useCallback((predictionId: string) => {
    // Save scroll position before navigating to details
    saveScrollPosition(location);
    navigate(`/prediction/${predictionId}`);
  }, [navigate, location]);

  return (
    <PageWrapper title="Discover">
      <DiscoverPage 
        onNavigateToProfile={handleNavigateToProfile}
        onNavigateToPrediction={handleNavigateToPrediction}
      />
    </PageWrapper>
  );
};

const PredictionsPageWrapper: React.FC = () => {
  const [location, navigate] = useLocation();
  
  const handleNavigateToDiscover = useCallback(() => {
    saveScrollPosition(location);
    navigate('/');
  }, [navigate, location]);

  return (
    <PageWrapper title="My Predictions">
      <BetsTab onNavigateToDiscover={handleNavigateToDiscover} />
    </PageWrapper>
  );
};

const CreatePredictionPageWrapper: React.FC = () => {
  const [location, navigate] = useLocation();
  
  const handleNavigateBack = useCallback(() => {
    // Don't save scroll position when going back from create
    markNavigationAsIntentional();
    navigate('/');
  }, [navigate]);

  return (
    <PageWrapper title="Create Prediction">
      <CreatePredictionPage 
        onNavigateBack={handleNavigateBack}
      />
    </PageWrapper>
  );
};

// Component for viewing other users' profiles with proper param extraction
const UserProfilePageWrapper: React.FC<{ params: { userId: string } }> = ({ params }) => {
  const [location, navigate] = useLocation();
  
  const handleNavigateBack = useCallback(() => {
    if (window.history.length > 1) {
      // Use browser back to restore previous scroll position
      window.history.back();
    } else {
      markNavigationAsIntentional();
      navigate('/');
    }
  }, [navigate]);

  // Validate and clean the userId parameter
  const userId = React.useMemo(() => {
    const rawUserId = params?.userId;
    if (!rawUserId) {
      console.warn('⚠️ No userId provided in profile route');
      return undefined;
    }
    
    const cleanUserId = rawUserId.trim();
    if (!cleanUserId) {
      console.warn('⚠️ Empty userId in profile route');
      return undefined;
    }
    
    // Basic UUID validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(cleanUserId)) {
      console.log('✅ Valid UUID userId:', cleanUserId);
      return cleanUserId;
    }
    
    // If not UUID but has content, could be username (for backward compatibility)
    if (cleanUserId.length > 2) {
      console.log('⚠️ Non-UUID userId (might be username):', cleanUserId);
      return cleanUserId;
    }
    
    console.warn('⚠️ Invalid userId format:', cleanUserId);
    return undefined;
  }, [params?.userId]);

  // If no valid userId, redirect to own profile
  if (!userId) {
    React.useEffect(() => {
      console.warn('⚠️ Invalid userId in profile route, redirecting to own profile');
      markNavigationAsIntentional();
      navigate('/profile');
    }, [navigate]);
    
    return <LoadingSpinner message="Redirecting..." />;
  }

  console.log('🔍 UserProfilePageWrapper rendering with userId:', userId);

  return (
    <PageWrapper title="User Profile">
      <ProfilePage 
        onNavigateBack={handleNavigateBack} 
        userId={userId} 
      />
    </PageWrapper>
  );
};

// Wrapper for current user profile
const MyProfilePageWrapper: React.FC = () => {
  const [location, navigate] = useLocation();
  
  const handleNavigateBack = useCallback(() => {
    saveScrollPosition(location);
    navigate('/');
  }, [navigate, location]);

  return (
    <PageWrapper title="My Profile">
      <ProfilePage 
        onNavigateBack={handleNavigateBack} 
      />
    </PageWrapper>
  );
};

const WalletPageWrapper: React.FC = () => {
  const [location, navigate] = useLocation();
  
  const handleNavigateBack = useCallback(() => {
    saveScrollPosition(location);
    navigate('/');
  }, [navigate, location]);

  return (
    <PageWrapper title="Wallet">
      <WalletPage onNavigateBack={handleNavigateBack} />
    </PageWrapper>
  );
};

const PredictionDetailsWrapper: React.FC<{ params: { id: string } }> = ({ params }) => {
  const [location, navigate] = useLocation();
  
  const handleNavigateBack = useCallback(() => {
    // Use browser back to restore previous scroll position automatically
    console.log('🔙 Navigating back from prediction details');
    
    if (window.history.length > 1) {
      // Browser back will automatically restore scroll position via our scroll manager
      window.history.back();
    } else {
      // Fallback to discover page
      markNavigationAsIntentional();
      navigate('/');
    }
  }, [navigate]);

  if (!params?.id) {
    return (
      <PageWrapper title="Error">
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Prediction Not Found</h2>
            <p className="text-gray-600 mb-4">The prediction you're looking for doesn't exist.</p>
            <button
              onClick={handleNavigateBack}
              className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"
            >
              Go Back
            </button>
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Prediction Details">
      <PredictionDetailsPage 
        predictionId={params.id}
        onNavigateBack={handleNavigateBack}
      />
    </PageWrapper>
  );
};

// Main App Component with improved error handling
function App() {
  const { initializeWallet } = useWalletStore();
  const { initializeAuth, isAuthenticated, loading, initialized } = useAuthStore();
  const { initializeLikes } = useLikeStore();
  const { initialize: initializeCommentStore } = useUnifiedCommentStore();

  // Initialize auth once on app start
  useEffect(() => {
    if (!initialized && !loading) {
      try {
        console.log('App: Initializing auth...');
        initializeAuth();
      } catch (error) {
        console.error('Auth initialization failed:', error);
      }
    }
  }, [initializeAuth, initialized, loading]);

  // Initialize wallet and social features after auth is ready
  useEffect(() => {
    if (isAuthenticated && !loading && initialized) {
      try {
        console.log('App: Initializing wallet and social features...');
        
        // Initialize wallet
        initializeWallet();
        
        // Initialize social engagement features
        initializeLikes();
        initializeCommentStore();
        
        console.log('✅ All stores initialized successfully');
      } catch (error) {
        console.error('Store initialization failed:', error);
      }
    }
  }, [isAuthenticated, loading, initialized, initializeWallet, initializeLikes, initializeCommentStore]);

  return (
    <ErrorBoundary>
      <AuthSheetProvider>
        <Router>
          <Switch>
        {/* Public auth routes */}
        <Route path="/auth/callback">
          <PageWrapper title="Authentication">
            <AuthCallbackPage />
          </PageWrapper>
        </Route>
        
        {/* Public routes - no auth required */}
        <MainLayout>
          <Switch>
            <Route path="/" component={DiscoverPageWrapper} />
            <Route path="/discover" component={DiscoverPageWrapper} />
            <Route path="/prediction/:id" component={PredictionDetailsWrapper} />
            <Route path="/predictions/:id" component={PredictionDetailsWrapper} />
            
            {/* Protected routes - require auth */}
            <AuthGuard>
              <OnboardingProvider>
                <Switch>
                  <Route path="/predictions" component={PredictionsPageWrapper} />
                  <Route path="/bets" component={PredictionsPageWrapper} />
                  <Route path="/create" component={CreatePredictionPageWrapper} />
                  <Route path="/profile" component={MyProfilePageWrapper} />
                  <Route path="/profile/:userId" component={UserProfilePageWrapper} />
                  <Route path="/wallet" component={WalletPageWrapper} />
                </Switch>
              </OnboardingProvider>
            </AuthGuard>

            {/* Fallback */}
            <Route component={DiscoverPageWrapper} />
          </Switch>
        </MainLayout>
        </Switch>
        </Router>
        
        {/* Global Auth Sheet */}
        <AuthSheet />
      </AuthSheetProvider>
    </ErrorBoundary>
  );
}

export default App;