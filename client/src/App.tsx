import React, { useEffect, useCallback, memo, Suspense, lazy } from 'react';
import { Routes, Route, useLocation, useNavigate, useParams } from 'react-router-dom';
import { FCZ_UNIFIED_CARDS } from './utils/environment';
import { useWalletStore } from './store/walletStore';
import { useAuthStore } from './store/authStore';
import { useLikeStore } from './store/likeStore';
import { useUnifiedCommentStore } from './store/unifiedCommentStore';
import { restorePendingAuth } from './auth/authGateAdapter';
import { useAuthSession } from './providers/AuthSessionProvider';
import { SupabaseProvider } from './providers/SupabaseProvider';
import { AuthSessionProvider } from './providers/AuthSessionProvider';
import AuthGateModal from './components/auth/AuthGateModal';
import { Toaster } from 'react-hot-toast';
import { scrollToTop, saveScrollPosition, markNavigationAsIntentional } from './utils/scroll';
import NotificationContainer from './components/ui/NotificationContainer';
import PWAInstallManager from './components/PWAInstallManager';
import PageWrapper from './components/PageWrapper';
import { OnboardingProvider } from './components/onboarding/OnboardingProvider';
import MobileShell from './components/layout/MobileShell';
import { NetworkStatusProvider } from './providers/NetworkStatusProvider';
import PageLoadingSpinner from './components/ui/PageLoadingSpinner';

// Lazy-loaded pages for code splitting
const LazyDiscoverPage = lazy(() => import('./pages/DiscoverPage'));
const LazyPredictionsPage = lazy(() => import('./pages/PredictionsPage'));
const LazyCreatePredictionPage = lazy(() => import('./pages/CreatePredictionPage'));
const LazyProfilePage = lazy(() => import('./pages/ProfilePage'));
const LazyWalletPage = lazy(() => import('./pages/WalletPage'));
const LazyPredictionDetailsPageV2 = lazy(() => import('./pages/PredictionDetailsPageV2'));
const LazyProfilePageV2 = lazy(() => import('./pages/ProfilePageV2'));
const LazyWalletPageV2 = lazy(() => import('./pages/WalletPageV2'));
const LazyUnifiedLeaderboardPage = lazy(() => import('./pages/UnifiedLeaderboardPage'));


// Import all page components
// These imports are now lazy-loaded above
import StableBottomNavigation from './components/navigation/StableBottomNavigation';
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


// Enhanced Main Layout Component with scroll preservation
const MainLayout: React.FC<{ children: React.ReactNode }> = memo(({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const getCurrentTab = useCallback(() => {
    const path = location.pathname.toLowerCase();
    if (path === '/' || path === '/discover') return 'discover';
    if (path === '/bets' || path === '/predictions') return 'bets';
    if (path === '/leaderboard') return 'leaderboard';
    if (path === '/profile') return 'profile';
    if (path === '/wallet') return 'wallet';
    return 'discover';
  }, [location.pathname]);

  const handleTabChange = useCallback((tab: string) => {
    // Prevent infinite loops by checking if we're already on the target route
    const currentTab = getCurrentTab();
    if (currentTab === tab) return;
    
    // Save current scroll position before navigating
    saveScrollPosition(location.pathname);
    
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
      case 'leaderboard':
        navigate('/leaderboard');
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
    saveScrollPosition(location.pathname);
    markNavigationAsIntentional();
    navigate('/create');
  }, [navigate, location.pathname]);

  const showFAB = getCurrentTab() === 'discover';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" data-scroll-container>
      {/* Main Content */}
      <main className="flex-1 pb-[calc(5rem+env(safe-area-inset-bottom))]">
        <Suspense fallback={<LoadingSpinner message="Loading page..." />}>
          {children}
        </Suspense>
      </main>

      {/* Stable Bottom Navigation */}
      <StableBottomNavigation
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

// Bootstrap effects component for auth adapter and sync
const BootstrapEffects: React.FC = () => {
  const { user: sessionUser, session, initialized: sessionInitialized } = useAuthSession();
  const { initializeAuth, isAuthenticated: storeAuthenticated, initialized: storeInitialized, user: storeUser } = useAuthStore();
  
  // Sync AuthSession with AuthStore
  useEffect(() => {
    if (sessionInitialized) {
      // Always sync session state to store when session is initialized
      if (sessionUser && session) {
        const currentStoreUser = useAuthStore.getState().user;
        const currentStoreAuth = useAuthStore.getState().isAuthenticated;
        
        // Only update if there's a meaningful change
        if (!currentStoreAuth || !currentStoreUser || currentStoreUser.id !== sessionUser.id) {
          console.log('🔄 Syncing session user to auth store...', sessionUser.email);
          
          // Convert session user to store format
          const convertedUser = {
            id: sessionUser.id,
            firstName: sessionUser.user_metadata?.firstName || sessionUser.user_metadata?.first_name || sessionUser.user_metadata?.full_name?.split(' ')[0] || 'User',
            lastName: sessionUser.user_metadata?.lastName || sessionUser.user_metadata?.last_name || sessionUser.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
            email: sessionUser.email || '',
            phone: sessionUser.phone,
            avatar: sessionUser.user_metadata?.avatar_url || sessionUser.user_metadata?.picture,
            provider: sessionUser.app_metadata?.provider || 'email',
            createdAt: sessionUser.created_at
          };
          
          // Update the auth store state directly
          useAuthStore.setState({
            isAuthenticated: true,
            user: convertedUser,
            token: session.access_token,
            loading: false,
            initialized: true,
            lastAuthCheck: Date.now()
          });
          
          console.log('✅ Auth store synced with session user:', convertedUser.firstName);
        }
      }
      // If no session user but store thinks we're authenticated, clear the store
      else if (!sessionUser && storeAuthenticated) {
        console.log('🔄 No session user, clearing auth store...');
        
        useAuthStore.setState({
          isAuthenticated: false,
          user: null,
          token: null,
          lastAuthCheck: 0
        });
      }
    }
  }, [sessionUser, session, sessionInitialized, storeAuthenticated]);
  
  useEffect(() => {
    // Restore any pending auth state from session storage
    restorePendingAuth();
  }, []);
  
  return null;
};

// Enhanced Page Wrapper Components with scroll preservation
const DiscoverPageWrapper: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const handleNavigateToProfile = useCallback(() => {
    saveScrollPosition(location.pathname);
    navigate('/profile');
  }, [navigate, location.pathname]);

  const handleNavigateToPrediction = useCallback((predictionId: string) => {
    // Save scroll position before navigating to details
    saveScrollPosition(location.pathname);
    navigate(`/prediction/${predictionId}`);
  }, [navigate, location.pathname]);

  return (
      <LazyDiscoverPage 
        onNavigateToProfile={handleNavigateToProfile}
        onNavigateToPrediction={handleNavigateToPrediction}
      />
  );
};

const PredictionsPageWrapper: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const handleNavigateToDiscover = useCallback(() => {
    saveScrollPosition(location.pathname);
    navigate('/');
  }, [navigate, location.pathname]);

  return (
      <LazyPredictionsPage onNavigateToDiscover={handleNavigateToDiscover} />
  );
};

const CreatePredictionPageWrapper: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const handleNavigateBack = useCallback(() => {
    // Don't save scroll position when going back from create
    markNavigationAsIntentional();
    navigate('/');
  }, [navigate]);

  return (
    <PageWrapper title="Create Prediction">
      <LazyCreatePredictionPage 
        onNavigateBack={handleNavigateBack}
      />
    </PageWrapper>
  );
};

// Component for viewing other users' profiles with proper param extraction
const UserProfilePageWrapper: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  
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
  const validatedUserId = React.useMemo(() => {
    if (!userId) {
      console.warn('⚠️ No userId provided in profile route');
      return undefined;
    }
    
    const cleanUserId = userId.trim();
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
  }, [userId]);

  // If no valid userId, redirect to own profile
  if (!validatedUserId) {
    React.useEffect(() => {
      console.warn('⚠️ Invalid userId in profile route, redirecting to own profile');
      markNavigationAsIntentional();
      navigate('/profile');
    }, [navigate]);
    
    return <LoadingSpinner message="Redirecting..." />;
  }

  console.log('🔍 UserProfilePageWrapper rendering with userId:', validatedUserId);

  return (
    <PageWrapper title="User Profile">
      <LazyProfilePage 
        onNavigateBack={handleNavigateBack} 
        userId={validatedUserId} 
      />
    </PageWrapper>
  );
};

// Wrapper for current user profile
const MyProfilePageWrapper: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const handleNavigateBack = useCallback(() => {
    saveScrollPosition(location.pathname);
    navigate('/');
  }, [navigate, location.pathname]);

  return (
    <PageWrapper title="My Profile">
      <LazyProfilePage 
        onNavigateBack={handleNavigateBack} 
      />
    </PageWrapper>
  );
};

const WalletPageWrapper: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const handleNavigateBack = useCallback(() => {
    saveScrollPosition(location.pathname);
    navigate('/');
  }, [navigate, location.pathname]);

  return (
    <PageWrapper title="Wallet">
      <LazyWalletPage onNavigateBack={handleNavigateBack} />
    </PageWrapper>
  );
};

const LeaderboardPageWrapper: React.FC = () => {
  return <PageWrapper title="Leaderboard"><LazyUnifiedLeaderboardPage /></PageWrapper>;
};

const PredictionDetailsRouteWrapper: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
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

  if (!id) {
    return (
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
    );
  }

  return <LazyPredictionDetailsPageV2 predictionId={id} />;
};

// Main App Component with improved error handling
// Main App Content - requires providers to be available
const AppContent: React.FC = () => {
  const { initializeWallet } = useWalletStore();
  const { initializeAuth, loading: storeLoading, initialized: storeInitialized } = useAuthStore();
  const { initializeLikes } = useLikeStore();
  
  // Use session provider as source of truth for authentication
  const { user: sessionUser, loading: sessionLoading, initialized: sessionInitialized } = useAuthSession();
  
  // Determine overall loading and auth state
  const loading = sessionLoading || storeLoading;
  const isAuthenticated = !!sessionUser;
  const initialized = sessionInitialized && storeInitialized;

  // Initialize auth store but let session provider be source of truth
  useEffect(() => {
    if (!storeInitialized && !storeLoading && sessionInitialized) {
      try {
        console.log('App: Initializing auth store...');
        // If session already has user, don't call initializeAuth as it might conflict
        if (sessionUser) {
          // Let the sync effect above handle the auth store update
          console.log('App: Session user exists, sync will handle auth store');
        } else {
          initializeAuth();
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
      }
    }
  }, [initializeAuth, storeInitialized, storeLoading, sessionInitialized, sessionUser]);

  // Initialize wallet and social features after auth is ready
  useEffect(() => {
    if (isAuthenticated && !loading && sessionInitialized) {
      try {
        console.log('App: Initializing wallet and social features...');
        
        // Initialize wallet
        initializeWallet();
        
        // Initialize social engagement features
        initializeLikes();
        
        console.log('✅ All stores initialized successfully');
      } catch (error) {
        console.error('Store initialization failed:', error);
      }
    }
  }, [isAuthenticated, loading, sessionInitialized, initializeWallet, initializeLikes]);
  
  // Ensure auth store is marked as initialized when session is ready
  useEffect(() => {
    if (sessionInitialized && !useAuthStore.getState().initialized) {
      console.log('App: Marking auth store as initialized to match session state');
      useAuthStore.setState({ initialized: true, loading: false });
    }
  }, [sessionInitialized]);

  return (
        <OnboardingProvider>
          <MobileShell>
            <MainLayout>
          <Suspense fallback={<PageLoadingSpinner />}>
            <Routes>
              <Route path="/" element={<DiscoverPageWrapper />} />
              <Route path="/discover" element={<DiscoverPageWrapper />} />
              <Route path="/predictions" element={<PredictionsPageWrapper />} />
              <Route path="/predictions/:id" element={<PredictionDetailsRouteWrapper />} />
              <Route path="/bets" element={<PredictionsPageWrapper />} />
              <Route path="/leaderboard" element={<LeaderboardPageWrapper />} />
              <Route path="/create" element={<CreatePredictionPageWrapper />} />
              <Route path="/profile" element={
                FCZ_UNIFIED_CARDS
                  ? <PageWrapper title="Profile"><LazyProfilePageV2 /></PageWrapper>
                  : <MyProfilePageWrapper />
              } />
              <Route path="/profile/:userId" element={
                FCZ_UNIFIED_CARDS
                  ? <PageWrapper title="Profile"><LazyProfilePageV2 /></PageWrapper>
                  : <UserProfilePageWrapper />
              } />
              <Route path="/wallet" element={
                FCZ_UNIFIED_CARDS
                  ? <PageWrapper title="Wallet"><LazyWalletPageV2 /></PageWrapper>
                  : <WalletPageWrapper />
              } />
              <Route path="/rankings" element={<LeaderboardPageWrapper />} />
              <Route path="/prediction/:id" element={<PredictionDetailsRouteWrapper />} />

              {/* Fallback */}
              <Route path="*" element={<DiscoverPageWrapper />} />
            </Routes>
          </Suspense>
            </MainLayout>
          </MobileShell>
          
          {/* Auth Gate Modal */}
          <AuthGateModal />
          
          {/* Bootstrap Effects */}
          <BootstrapEffects />
          
        </OnboardingProvider>
  );
};

// Root App Component with proper provider nesting
function App() {
  return (
    <NetworkStatusProvider>
      <SupabaseProvider>
        <AuthSessionProvider>
          <AppContent />
        </AuthSessionProvider>
      </SupabaseProvider>
    </NetworkStatusProvider>
  );
}

export default App;