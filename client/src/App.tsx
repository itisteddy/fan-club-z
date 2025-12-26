import React, { useEffect, useCallback, memo, Suspense, lazy, useRef } from 'react';
import { Routes, Route, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useWalletStore } from './store/walletStore';
import { useAuthStore } from './store/authStore';
import { useLikeStore } from './store/likeStore';
import { useUnifiedCommentStore } from './store/unifiedCommentStore';
import { openAuthGate, restorePendingAuth } from './auth/authGateAdapter';
import { useAuthSession } from './providers/AuthSessionProvider';
import { SupabaseProvider } from './providers/SupabaseProvider';
import { AuthSessionProvider } from './providers/AuthSessionProvider';
import { RealtimeProvider } from './providers/RealtimeProvider';
import AuthGateModal from './components/auth/AuthGateModal';
import { Toaster } from 'react-hot-toast';
import { scrollToTop, saveScrollPosition, markNavigationAsIntentional, handleRouterNavigation } from './utils/scroll';
import NotificationContainer from './components/ui/NotificationContainer';
import PWAInstallManager from './components/PWAInstallManager';
import PageWrapper from './components/PageWrapper';
import { OnboardingProvider } from './components/onboarding/OnboardingProvider';
import MobileShell from './components/layout/MobileShell';
import { NetworkStatusProvider } from './providers/NetworkStatusProvider';
import PageLoadingSpinner from './components/ui/PageLoadingSpinner';
import { OAuthDiagnostic } from './components/diagnostics/OAuthDiagnostic';

// Lazy-loaded pages for code splitting
const LazyDiscoverPage = lazy(() => import('./pages/DiscoverPage'));
const LazyPredictionsPage = lazy(() => import('./pages/PredictionsPage'));
const LazyCreatePredictionPage = lazy(() => import('./pages/CreatePredictionPage'));
const LazyProfilePage = lazy(() => import('./legacy/pages/ProfilePage'));
const LazyWalletPage = lazy(() => import('./legacy/pages/WalletPage'));
const LazyPredictionDetailsPageV2 = lazy(() => import('./pages/PredictionDetailsPageV2'));
const LazyProfilePageV2 = lazy(() => import('./pages/ProfilePageV2'));
const LazyDownloadPage = lazy(() => import('./legacy/pages/DownloadPage'));
const LazyWalletPageV2 = lazy(() => import('./pages/WalletPageV2'));
const LazyUnifiedWalletPage = lazy(() => import('./pages/UnifiedWalletPage'));
const LazyUnifiedLeaderboardPage = lazy(() => import('./pages/UnifiedLeaderboardPage'));
const LazyAuthCallback = lazy(() => import('./pages/auth/AuthCallback'));
const LazyReferralRedirectPage = lazy(() => import('./pages/ReferralRedirectPage'));

// Admin pages (lazy loaded)
const LazyAdminHomePage = lazy(() => import('./pages/admin/AdminHomePage'));
const LazyAuditLogPage = lazy(() => import('./pages/admin/AuditLogPage'));
const LazyUsersPage = lazy(() => import('./pages/admin/UsersPage'));
const LazyUserDetailPage = lazy(() => import('./pages/admin/UserDetailPage'));
const LazyWalletsPage = lazy(() => import('./pages/admin/WalletsPage'));
const LazyUserWalletPage = lazy(() => import('./pages/admin/UserWalletPage'));
const LazyAdminPredictionsPage = lazy(() => import('./pages/admin/PredictionsPage'));
const LazyPredictionDetailPage = lazy(() => import('./pages/admin/PredictionDetailPage'));
const LazyModerationPage = lazy(() => import('./pages/admin/ModerationPage'));
const LazyConfigPage = lazy(() => import('./pages/admin/ConfigPage'));
const LazySettlementsPage = lazy(() => import('./pages/admin/SettlementsPage'));
const LazySettlementDetailPage = lazy(() => import('./pages/admin/SettlementDetailPage'));
const LazySupportPage = lazy(() => import('./pages/admin/SupportPage'));


// Import all page components
// These imports are now lazy-loaded above
import StableBottomNavigation from './components/navigation/StableBottomNavigation';
import ErrorBoundary from './components/ErrorBoundary';
import ConnectWalletSheet from './components/wallet/ConnectWalletSheet';
import AuthRequiredState from './components/ui/empty/AuthRequiredState';
import { Sparkles } from 'lucide-react';
import { captureReturnTo } from './lib/returnTo';
import { useReferralCapture, useReferralAttribution } from './hooks/useReferral';
import { AdminGuard } from './components/admin/AdminGuard';
import { AdminLayout } from './components/admin/AdminLayout';

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
  const { user: sessionUser } = useAuthSession();
  const isAuthenticated = !!sessionUser;
  const prevLocationRef = useRef<string>(location.pathname);
  
  // Initialize navigation history on mount
  useEffect(() => {
    prevLocationRef.current = location.pathname;
  }, []);
  
  // Handle location changes for proper scroll behavior
  useEffect(() => {
    const currentPath = location.pathname;
    const prevPath = prevLocationRef.current;
    
    if (currentPath !== prevPath) {
      // Use scroll manager to handle navigation (detects forward vs back)
      handleRouterNavigation(prevPath, currentPath);
      prevLocationRef.current = currentPath;
    }
  }, [location.pathname]);
  
  // Helper to normalize path by removing trailing slashes (except for root)
  const normalizePath = useCallback((pathname: string) => {
    const p = pathname.toLowerCase();
    return p === '/' ? p : p.replace(/\/+$/, '');
  }, []);

  const getCurrentTab = useCallback(() => {
    const path = normalizePath(location.pathname);
    if (path === '/' || path === '/discover') return 'discover';
    if (path === '/bets' || path === '/predictions') return 'bets';
    if (path === '/leaderboard') return 'leaderboard';
    if (path === '/profile') return 'profile';
    if (path === '/wallet') return 'wallet';
    // For non-tab routes (e.g. /create, details, callbacks), still visually
    // highlight Discover, but allow tab presses to navigate away.
    return 'discover';
  }, [location.pathname, normalizePath]);

  const handleTabChange = useCallback((tab: string) => {
    const path = normalizePath(location.pathname);
    const isOnTabRoute =
      path === '/' ||
      path === '/discover' ||
      path === '/bets' ||
      path === '/predictions' ||
      path === '/leaderboard' ||
      path === '/profile' ||
      path === '/wallet';

    // Prevent redundant navigations only when we're already on a real tab route.
    // On non-tab routes like /create or completion screens, always allow tab presses
    // so users can reliably escape back to Home/Stakes/etc.
    if (isOnTabRoute) {
      if (tab === 'discover' && (path === '/' || path === '/discover')) return;
      if (tab === 'bets' && (path === '/bets' || path === '/predictions')) return;
      if (tab === 'leaderboard' && path === '/leaderboard') return;
      if (tab === 'profile' && path === '/profile') return;
      if (tab === 'wallet' && path === '/wallet') return;
    }
    
    // Save current scroll position before navigating
    saveScrollPosition(location.pathname);
    
    // Mark as intentional navigation to prevent auto-scroll-restore
    markNavigationAsIntentional();
    
    // IMMEDIATELY scroll to top before navigation to prevent visual flash
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    
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
    
    // Scroll to top again after navigation to ensure it takes effect
    requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      // One more scroll after a short delay for slow-rendering pages
      setTimeout(() => {
        scrollToTop({ behavior: 'instant' });
      }, 50);
    });
  }, [navigate, location]);

  const requestCreateAccess = useCallback(async () => {
    if (!isAuthenticated) {
      captureReturnTo('/create');
      const result = await openAuthGate({ intent: 'create_prediction' });
      return result.status === 'success';
    }
    return true;
  }, [isAuthenticated]);

  const handleFABClick = useCallback(() => {
    const run = async () => {
      const allowed = await requestCreateAccess();
      if (!allowed) return;
      saveScrollPosition(location.pathname);
      markNavigationAsIntentional();
      navigate('/create');
    };
    void run();
  }, [navigate, location.pathname, requestCreateAccess]);

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
        containerStyle={{ zIndex: 2147483647 }}
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
            zIndex: 2147483647,
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
  
  // Initialize referral tracking
  useReferralCapture();
  useReferralAttribution();
  
  // Sync AuthSession with AuthStore
  useEffect(() => {
    if (sessionInitialized) {
      // Always sync session state to store when session is initialized
      if (sessionUser && session) {
        const currentStoreUser = useAuthStore.getState().user;
        const currentStoreAuth = useAuthStore.getState().isAuthenticated;
        
        // Only update if there's a meaningful change
        if (!currentStoreAuth || !currentStoreUser || currentStoreUser.id !== sessionUser.id) {
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
        }
      }
      // If no session user but store thinks we're authenticated, clear the store
      else if (!sessionUser && storeAuthenticated) {
        
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
    const fromPath = `${location.pathname}${location.search}${location.hash}`;
    navigate(`/prediction/${predictionId}`, {
      state: { from: fromPath }
    });
  }, [navigate, location.pathname, location.search, location.hash]);

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
  const { user: sessionUser, loading: sessionLoading } = useAuthSession();
  const isAuthenticated = !!sessionUser;
  const authPromptedRef = useRef(false);
  
  const handleNavigateBack = useCallback(() => {
    // Don't save scroll position when going back from create
    markNavigationAsIntentional();
    navigate('/');
  }, [navigate]);

  useEffect(() => {
    if (!isAuthenticated && !sessionLoading && !authPromptedRef.current) {
      authPromptedRef.current = true;
      captureReturnTo('/create');
      void openAuthGate({ intent: 'create_prediction' });
    }
  }, [isAuthenticated, sessionLoading]);

  if (!isAuthenticated) {
    return (
      <PageWrapper title="Create Prediction">
        <div className="px-4 py-12">
          <AuthRequiredState
            icon={<Sparkles className="w-10 h-10 text-emerald-500" />}
            title="Sign in to create predictions"
            description="You need to be signed in to create and publish predictions. Your progress will be saved automatically."
            intent="create_prediction"
          />
        </div>
      </PageWrapper>
    );
  }

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
  const [resolvedId, setResolvedId] = React.useState<string | null>(null);
  const [checking, setChecking] = React.useState<boolean>(true);
  
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

  React.useEffect(() => {
    const run = async () => {
      if (!id) {
        setChecking(false);
        return;
      }
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(id)) {
        setResolvedId(id);
        setChecking(false);
        return;
      }
      // Treat as SEO slug - resolve to full ID
      try {
        const apiBase = (await import('./config')).getApiUrl();
        const r = await fetch(`${apiBase}/api/v2/predictions/resolve/slug/${encodeURIComponent(id)}`, { method: 'GET' });
        if (!r.ok) throw new Error(`resolve failed ${r.status}`);
        const j = await r.json();
        if (j?.id) {
          setResolvedId(j.id);
        } else {
          console.warn('Slug resolve returned no id for', id);
        }
      } catch (e) {
        console.warn('Slug resolve errored', e);
      } finally {
        setChecking(false);
      }
    };
    run();
  }, [id]);

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

  if (checking) {
    return <LoadingSpinner message="Loading prediction..." />;
  }

  // If we couldn't resolve, show not-found state
  if (!resolvedId) {
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

  return <LazyPredictionDetailsPageV2 predictionId={resolvedId} />;
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
          <Suspense fallback={<PageLoadingSpinner />}>
            <Routes>
              {/* Admin Routes - OUTSIDE MainLayout (no bottom nav, like landing page) */}
              <Route
                path="/admin"
                element={
                  <AdminGuard>
                    <AdminLayout>
                      <LazyAdminHomePage />
                    </AdminLayout>
                  </AdminGuard>
                }
              />
              <Route
                path="/admin/audit"
                element={
                  <AdminGuard>
                    <AdminLayout>
                      <LazyAuditLogPage />
                    </AdminLayout>
                  </AdminGuard>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <AdminGuard>
                    <AdminLayout>
                      <LazyUsersPage />
                    </AdminLayout>
                  </AdminGuard>
                }
              />
              <Route
                path="/admin/users/:userId"
                element={
                  <AdminGuard>
                    <AdminLayout>
                      <LazyUserDetailPage />
                    </AdminLayout>
                  </AdminGuard>
                }
              />
              <Route
                path="/admin/wallets"
                element={
                  <AdminGuard>
                    <AdminLayout>
                      <LazyWalletsPage />
                    </AdminLayout>
                  </AdminGuard>
                }
              />
              <Route
                path="/admin/wallets/:userId"
                element={
                  <AdminGuard>
                    <AdminLayout>
                      <LazyUserWalletPage />
                    </AdminLayout>
                  </AdminGuard>
                }
              />
              <Route
                path="/admin/predictions"
                element={
                  <AdminGuard>
                    <AdminLayout>
                      <LazyAdminPredictionsPage />
                    </AdminLayout>
                  </AdminGuard>
                }
              />
              <Route
                path="/admin/predictions/:predictionId"
                element={
                  <AdminGuard>
                    <AdminLayout>
                      <LazyPredictionDetailPage />
                    </AdminLayout>
                  </AdminGuard>
                }
              />
              <Route
                path="/admin/moderation"
                element={
                  <AdminGuard>
                    <AdminLayout>
                      <LazyModerationPage />
                    </AdminLayout>
                  </AdminGuard>
                }
              />
              <Route
                path="/admin/config"
                element={
                  <AdminGuard>
                    <AdminLayout>
                      <LazyConfigPage />
                    </AdminLayout>
                  </AdminGuard>
                }
              />
              <Route
                path="/admin/settlements"
                element={
                  <AdminGuard>
                    <AdminLayout>
                      <LazySettlementsPage />
                    </AdminLayout>
                  </AdminGuard>
                }
              />
              <Route
                path="/admin/settlements/:predictionId"
                element={
                  <AdminGuard>
                    <AdminLayout>
                      <LazySettlementDetailPage />
                    </AdminLayout>
                  </AdminGuard>
                }
              />
              <Route
                path="/admin/support"
                element={
                  <AdminGuard>
                    <AdminLayout>
                      <LazySupportPage />
                    </AdminLayout>
                  </AdminGuard>
                }
              />
              <Route
                path="/admin/*"
                element={
                  <AdminGuard>
                    <AdminLayout>
                      <div className="text-center py-12">
                        <p className="text-slate-400">Page coming soon</p>
                      </div>
                    </AdminLayout>
                  </AdminGuard>
                }
              />

              {/* Main App Routes - INSIDE MainLayout (with bottom nav) */}
              <Route path="*" element={
                <MainLayout>
                  <Routes>
                    <Route path="/" element={<DiscoverPageWrapper />} />
                    <Route path="/discover" element={<DiscoverPageWrapper />} />
                    <Route path="/auth/callback" element={<LazyAuthCallback />} />
                    <Route path="/r/:code" element={<LazyReferralRedirectPage />} />
                    <Route path="/predictions" element={<PredictionsPageWrapper />} />
                    <Route path="/predictions/:id" element={<PredictionDetailsRouteWrapper />} />
                    <Route path="/bets" element={<PredictionsPageWrapper />} />
                    <Route path="/leaderboard" element={<LeaderboardPageWrapper />} />
                    <Route path="/create" element={<CreatePredictionPageWrapper />} />
                    <Route path="/profile" element={
                      <PageWrapper title="Profile"><LazyProfilePageV2 /></PageWrapper>
                    } />
                    <Route path="/profile/:userId" element={
                      <PageWrapper title="Profile"><LazyProfilePageV2 /></PageWrapper>
                    } />
                    <Route path="/wallet" element={
                      <PageWrapper title="Wallet"><LazyUnifiedWalletPage /></PageWrapper>
                    } />
                    <Route path="/rankings" element={<LeaderboardPageWrapper />} />
                    <Route path="/prediction/:id" element={<PredictionDetailsRouteWrapper />} />
                    <Route path="/download" element={<LazyDownloadPage />} />
                    <Route path="*" element={<DiscoverPageWrapper />} />
                  </Routes>
                </MainLayout>
              } />
            </Routes>
          </Suspense>
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
      <OAuthDiagnostic />
      <SupabaseProvider>
        <AuthSessionProvider>
          <RealtimeProvider>
            <AppContent />
            <ConnectWalletSheet />
          </RealtimeProvider>
        </AuthSessionProvider>
      </SupabaseProvider>
    </NetworkStatusProvider>
  );
}

export default App;