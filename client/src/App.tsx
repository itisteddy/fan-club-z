import React, { useEffect, useCallback, Suspense } from 'react';
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

// Import all page components
import DiscoverPage from './pages/DiscoverPage';
import CreatePredictionPage from './pages/CreatePredictionPage';
import BetsTab from './pages/BetsTab';
import ProfilePage from './pages/ProfilePage';
import WalletPage from './pages/WalletPage';
import AuthPage from './pages/auth/AuthPage';
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

// Auth Guard for Protected Routes Only
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading, initialized, initializeAuth } = useAuthStore();
  
  useEffect(() => {
    if (!initialized && !loading) {
      initializeAuth();
    }
  }, [initialized, loading, initializeAuth]);
  
  if (!initialized || loading) {
    return <LoadingSpinner message="Authenticating..." />;
  }
  
  if (!isAuthenticated) {
    return (
      <PageWrapper title="Sign In Required">
        <AuthPage />
      </PageWrapper>
    );
  }
  
  return <>{children}</>;
};

// Main Layout with Navigation
const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [location, navigate] = useLocation();
  
  const getCurrentTab = useCallback(() => {
    if (location === '/' || location === '/discover') return 'discover';
    if (location.startsWith('/predictions') || location.startsWith('/bets')) return 'bets';
    if (location.startsWith('/profile')) return 'profile';
    if (location.startsWith('/wallet')) return 'wallet';
    return 'discover';
  }, [location]);

  const handleTabChange = useCallback((tab: string) => {
    // Save current scroll position before navigation
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
      
      {/* Global Components */}
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
      <NotificationContainer />
      <PWAInstallManager />
    </div>
  );
};

// Page Wrappers
const DiscoverPageWrapper: React.FC = () => (
  <PageWrapper title="Discover">
    <DiscoverPage />
  </PageWrapper>
);

const PredictionsPageWrapper: React.FC = () => (
  <ProtectedRoute>
    <PageWrapper title="My Bets">
      <BetsTab onNavigateToDiscover={() => window.location.href = '/'} />
    </PageWrapper>
  </ProtectedRoute>
);

const CreatePredictionPageWrapper: React.FC = () => (
  <ProtectedRoute>
    <PageWrapper title="Create Prediction">
      <CreatePredictionPage />
    </PageWrapper>
  </ProtectedRoute>
);

const MyProfilePageWrapper: React.FC = () => (
  <ProtectedRoute>
    <PageWrapper title="My Profile">
      <ProfilePage />
    </PageWrapper>
  </ProtectedRoute>
);

const WalletPageWrapper: React.FC = () => (
  <ProtectedRoute>
    <PageWrapper title="Wallet">
      <WalletPage />
    </PageWrapper>
  </ProtectedRoute>
);

const PredictionDetailsWrapper: React.FC<{ params: { id: string } }> = ({ params }) => {
  const [, navigate] = useLocation();
  
  const handleNavigateBack = useCallback(() => {
    // Check if there's history to go back to
    if (window.history.length > 1) {
      window.history.back();
    } else {
      // Fallback to discover page
      navigate('/');
    }
  }, [navigate]);

  return (
    <PageWrapper title="Prediction Details">
      <PredictionDetailsPage 
        predictionId={params.id}
        onNavigateBack={handleNavigateBack}
      />
    </PageWrapper>
  );
};

// Main App Component - Content First Architecture
function App() {
  const { initializeWallet } = useWalletStore();
  const { initializeAuth, isAuthenticated, loading, initialized } = useAuthStore();
  const { initializeLikes } = useLikeStore();
  const { initialize: initializeCommentStore } = useUnifiedCommentStore();

  // Initialize auth in background (non-blocking)
  useEffect(() => {
    if (!initialized && !loading) {
      try {
        console.log('App: Initializing auth in background...');
        initializeAuth();
      } catch (error) {
        console.error('Auth initialization failed:', error);
      }
    }
  }, [initializeAuth, initialized, loading]);

  // Initialize wallet and social features after auth is ready (if authenticated)
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
      <Router>
        <Switch>
          {/* Public auth routes */}
          <Route path="/auth/callback">
            <PageWrapper title="Authentication">
              <AuthCallbackPage />
            </PageWrapper>
          </Route>
          
          {/* Content-First Routes */}
          <OnboardingProvider>
            <MainLayout>
              <Switch>
                {/* PUBLIC ROUTES - No authentication required */}
                <Route path="/" component={DiscoverPageWrapper} />
                <Route path="/discover" component={DiscoverPageWrapper} />
                <Route path="/prediction/:id" component={PredictionDetailsWrapper} />
                <Route path="/predictions/:id" component={PredictionDetailsWrapper} />

                {/* PROTECTED ROUTES - Authentication required */}
                <Route path="/predictions" component={PredictionsPageWrapper} />
                <Route path="/bets" component={PredictionsPageWrapper} />
                <Route path="/create" component={CreatePredictionPageWrapper} />
                <Route path="/profile" component={MyProfilePageWrapper} />
                <Route path="/wallet" component={WalletPageWrapper} />

                {/* Fallback to Discover (public) */}
                <Route component={DiscoverPageWrapper} />
              </Switch>
            </MainLayout>
          </OnboardingProvider>
        </Switch>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
