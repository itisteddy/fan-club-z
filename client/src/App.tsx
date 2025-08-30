import React, { useEffect, useCallback, memo, Suspense } from 'react';
import { Router, Route, Switch, useLocation } from 'wouter';
import { useWalletStore } from './store/walletStore';
import { useAuthStore } from './store/authStore';
import { useLikeStore } from './store/likeStore';
import { useUnifiedCommentStore } from './store/unifiedCommentStore';
import { useThemeStore } from './store/themeStore';
import { Toaster } from 'react-hot-toast';
import { scrollToTop, saveScrollPosition, markNavigationAsIntentional } from './utils/scroll';
import NotificationContainer from './components/ui/NotificationContainer';
import PWAInstallManager from './components/PWAInstallManager';
import PageWrapper from './components/PageWrapper';
import { OnboardingProvider } from './components/onboarding/OnboardingProvider';
import { AuthPrompt } from './components/ui/AuthPrompt';
import { realtimeService } from './services/realtimeService';


// Import all page components
import DiscoverPage from './pages/DiscoverPage';
import CreatePredictionPage from './pages/CreatePredictionPage';
import BetsTab from './pages/BetsTab';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import PrivacySecurityPage from './pages/PrivacySecurityPage';
import WalletPage from './pages/WalletPage';
import AuthPage from './pages/auth/AuthPage';
import AuthCallbackPage from './pages/auth/AuthCallbackPage';
import PredictionDetailsPage from './pages/PredictionDetailsPage';
import LeaderboardPage from './pages/LeaderboardPage';
import AnalyticsPage from './pages/AnalyticsPage';
import CommunityPage from './pages/CommunityPage';
import BottomNavigation from './components/BottomNavigation';
import ErrorBoundary from './components/ErrorBoundary';

// Simple Loading Component
const LoadingSpinner: React.FC<{ message?: string }> = ({ message = "Loading..." }) => (
  <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
      <p className="mt-2 text-gray-600">{message}</p>
    </div>
  </div>
);

// AuthGate Component for protecting specific actions
const AuthGate: React.FC<{ 
  children: React.ReactNode; 
  fallback?: React.ReactNode;
  onAuthRequired?: () => void;
  intendedDestination?: string;
}> = memo(({ children, fallback, onAuthRequired, intendedDestination }) => {
  const { isAuthenticated, loading, initialized } = useAuthStore();
  
  if (!initialized || loading) {
    return <LoadingSpinner message="Checking authentication..." />;
  }
  
  if (!isAuthenticated) {
    if (onAuthRequired) {
      onAuthRequired();
    }
    return fallback || <AuthPrompt intendedDestination={intendedDestination} />;
  }
  
  return <>{children}</>;
});

AuthGate.displayName = 'AuthGate';

// Public Layout - No authentication required
const PublicLayout: React.FC<{ children: React.ReactNode }> = memo(({ children }) => {
  const [location, navigate] = useLocation();
  const { isAuthenticated } = useAuthStore();
  
  const getCurrentTab = useCallback(() => {
    const path = location.toLowerCase();
    if (path === '/' || path === '/discover') return 'discover';
    if (path === '/bets' || path === '/predictions') return 'bets';
    if (path === '/profile') return 'profile';
    if (path === '/wallet') return 'wallet';
    return 'discover';
  }, [location]);

  const handleTabChange = useCallback((tab: string) => {
    const currentTab = getCurrentTab();
    if (currentTab === tab) return;
    
    saveScrollPosition(location);
    markNavigationAsIntentional();
    
    switch (tab) {
      case 'discover':
        navigate('/');
        break;
      case 'bets':
        // Require auth for bets/predictions
        if (!isAuthenticated) {
          navigate('/auth');
          return;
        }
        navigate('/predictions');
        break;
      case 'profile':
        // Require auth for profile
        if (!isAuthenticated) {
          navigate('/auth');
          return;
        }
        navigate('/profile');
        break;
      case 'wallet':
        // Require auth for wallet
        if (!isAuthenticated) {
          navigate('/auth');
          return;
        }
        navigate('/wallet');
        break;
      default:
        navigate('/');
    }
    
    setTimeout(() => {
      scrollToTop({ behavior: 'instant' });
    }, 50);
  }, [navigate, getCurrentTab, location, isAuthenticated]);

  const handleFABClick = useCallback(() => {
    // Require auth for creating predictions
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }
    
    saveScrollPosition(location);
    markNavigationAsIntentional();
    navigate('/create');
  }, [navigate, location, isAuthenticated]);

  const showFAB = getCurrentTab() === 'discover';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col" data-scroll-container>
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

PublicLayout.displayName = 'PublicLayout';

// Enhanced Main Layout Component with scroll preservation
const MainLayout: React.FC<{ children: React.ReactNode }> = memo(({ children }) => {
  const [location, navigate] = useLocation();
  
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col" data-scroll-container>
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
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
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
  const { initializeTheme } = useThemeStore();

  // Initialize auth and theme once on app start
  useEffect(() => {
    if (!initialized && !loading) {
      try {
        console.log('App: Initializing auth and theme...');
        initializeAuth();
        initializeTheme();
      } catch (error) {
        console.error('Auth/Theme initialization failed:', error);
      }
    }
  }, [initializeAuth, initializeTheme, initialized, loading]);

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
        
        // Initialize real-time service
        console.log('🔗 Real-time service is already running');
        
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
        
        {/* Auth page */}
        <Route path="/auth">
          <PageWrapper title="Sign In">
            <AuthPage />
          </PageWrapper>
        </Route>
        
        {/* Content-first routes - all content publicly accessible */}
        <PublicLayout>
          <Switch>
            {/* Public content routes - no authentication required */}
            <Route path="/" component={DiscoverPageWrapper} />
            <Route path="/discover" component={DiscoverPageWrapper} />
            <Route path="/prediction/:id" component={PredictionDetailsWrapper} />
            <Route path="/leaderboard" component={LeaderboardPage} />
            <Route path="/community" component={CommunityPage} />
            
            {/* User-specific routes - require authentication */}
            <Route path="/predictions">
              <AuthGate 
                intendedDestination="/predictions"
                fallback={<AuthPrompt title="Your Predictions" message="Sign in to see your prediction history and active bets" intendedDestination="/predictions" />}
              >
                <PredictionsPageWrapper />
              </AuthGate>
            </Route>
            
            <Route path="/bets">
              <AuthGate 
                intendedDestination="/bets"
                fallback={<AuthPrompt title="Your Bets" message="Sign in to view your betting history and active predictions" intendedDestination="/bets" />}
              >
                <PredictionsPageWrapper />
              </AuthGate>
            </Route>
            
            <Route path="/create">
              <AuthGate 
                intendedDestination="/create"
                fallback={<AuthPrompt title="Create Prediction" message="Sign in to create your own predictions and start earning" intendedDestination="/create" />}
              >
                <CreatePredictionPageWrapper />
              </AuthGate>
            </Route>
            
            <Route path="/profile">
              <AuthGate 
                intendedDestination="/profile"
                fallback={<AuthPrompt title="Your Profile" message="Sign in to view and manage your profile" intendedDestination="/profile" />}
              >
                <MyProfilePageWrapper />
              </AuthGate>
            </Route>
            
            <Route path="/profile/:userId">
              <AuthGate 
                intendedDestination={location}
                fallback={<AuthPrompt title="User Profile" message="Sign in to view user profiles and follow other predictors" intendedDestination={location} />}
              >
                <UserProfilePageWrapper />
              </AuthGate>
            </Route>
            
            <Route path="/settings">
              <AuthGate 
                intendedDestination="/settings"
                fallback={<AuthPrompt title="Settings" message="Sign in to access your account settings and preferences" intendedDestination="/settings" />}
              >
                <SettingsPage />
              </AuthGate>
            </Route>
            
            <Route path="/privacy-security">
              <AuthGate 
                intendedDestination="/privacy-security"
                fallback={<AuthPrompt title="Privacy & Security" message="Sign in to manage your privacy and security settings" intendedDestination="/privacy-security" />}
              >
                <PrivacySecurityPage />
              </AuthGate>
            </Route>
            
            <Route path="/wallet">
              <AuthGate 
                intendedDestination="/wallet"
                fallback={<AuthPrompt title="Wallet" message="Sign in to access your wallet and manage funds" intendedDestination="/wallet" />}
              >
                <WalletPageWrapper />
              </AuthGate>
            </Route>

            <Route path="/analytics">
              <AuthGate 
                intendedDestination="/analytics"
                fallback={<AuthPrompt title="Analytics" message="Sign in to view your performance analytics and insights" intendedDestination="/analytics" />}
              >
                <AnalyticsPage />
              </AuthGate>
            </Route>

            {/* Fallback */}
            <Route component={DiscoverPageWrapper} />
          </Switch>
        </PublicLayout>
        </Switch>
      </Router>
    </ErrorBoundary>
  );
}

export default App;