import React, { useEffect, useCallback, memo, Suspense } from 'react';
import { Router, Route, Switch, useLocation } from 'wouter';
import { useWalletStore } from './store/walletStore';
import { useAuthStore } from './store/authStore';
import { Toaster } from 'react-hot-toast';
import { scrollToTop } from './utils/scroll';
import NotificationContainer from './components/ui/NotificationContainer';
import PWAInstallManager from './components/PWAInstallManager';
import PageWrapper from './components/PageWrapper';

// Import all page components with better error boundaries
import DiscoverPage from './pages/DiscoverPage';
import CreatePredictionPage from './pages/CreatePredictionPage';
import BetsTab from './pages/BetsTab';
import ProfilePage from './pages/ProfilePage';
import WalletPage from './pages/WalletPage';
import AuthPage from './pages/auth/AuthPage';
import AuthCallbackPage from './pages/auth/AuthCallbackPage';
import PredictionDetailsPage from './pages/PredictionDetailsPage';
import BottomNavigation from './components/BottomNavigation';

// Enhanced Loading Component
const LoadingSpinner: React.FC<{ message?: string }> = ({ message = "Loading..." }) => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
      <p className="mt-2 text-gray-600">{message}</p>
    </div>
  </div>
);

// Enhanced Auth Guard Component with better state handling
const AuthGuard: React.FC<{ children: React.ReactNode }> = memo(({ children }) => {
  const { isAuthenticated, loading, initialized, initializeAuth } = useAuthStore();
  
  // Force re-initialization if needed
  useEffect(() => {
    if (!initialized && !loading) {
      console.log('🔄 AuthGuard: Force initializing auth...');
      initializeAuth();
    }
  }, [initialized, loading, initializeAuth]);
  
  // Show loading only when actually loading and not initialized
  if (!initialized || (loading && !isAuthenticated)) {
    return <LoadingSpinner message="Authenticating..." />;
  }
  
  if (!isAuthenticated) {
    return <AuthPage />;
  }
  
  return <>{children}</>;
});

AuthGuard.displayName = 'AuthGuard';

// Enhanced Route Component for better error handling with forced re-mounting
const SafeRoute: React.FC<{ 
  component: React.ComponentType<any>; 
  title: string;
  path: string; // Add path for proper keying
  [key: string]: any;
}> = ({ component: Component, title, path, ...props }) => {
  return (
    <Suspense fallback={<LoadingSpinner message={`Loading ${title}...`} />}>
      <PageWrapper title={title}>
        {/* Key by path to force re-mount when route changes */}
        <Component key={path} {...props} />
      </PageWrapper>
    </Suspense>
  );
};

// Optimized Main Layout Component with enhanced navigation
const MainLayout: React.FC<{ children: React.ReactNode }> = memo(({ children }) => {
  const [location, navigate] = useLocation();
  
  // Memoized function to get current tab with better path matching
  const getCurrentTab = useCallback(() => {
    const path = location.toLowerCase();
    console.log('🗺️ Current path:', path);
    
    if (path === '/' || path === '/discover') return 'discover';
    if (path.startsWith('/bets')) return 'bets';
    if (path.startsWith('/profile')) return 'profile';
    if (path.startsWith('/wallet')) return 'wallet';
    if (path.startsWith('/create')) return 'create';
    return 'discover';
  }, [location]);

  // Enhanced tab change handler with forced navigation
  const handleTabChange = useCallback((tab: string) => {
    console.log('🔄 Tab change requested:', tab, 'from:', location);
    
    const routes = {
      discover: '/',
      bets: '/bets',
      profile: '/profile',
      wallet: '/wallet',
      create: '/create'
    };
    
    const targetRoute = routes[tab as keyof typeof routes] || '/';
    
    console.log('🚀 Navigating to:', targetRoute);
    
    // Always use replace: false to ensure proper navigation history
    navigate(targetRoute, { replace: false });
    
    // Scroll to top with slight delay for better UX
    setTimeout(() => scrollToTop({ delay: 0 }), 100);
  }, [navigate, location]);

  // Enhanced FAB click handler with better modal/route handling
  const handleFABClick = useCallback(() => {
    console.log('🎯 FAB clicked - opening create prediction');
    
    // Always navigate to create page
    console.log('Navigating to create page...');
    navigate('/create', { replace: false });
    
    // Ensure scroll to top
    setTimeout(() => scrollToTop({ delay: 0 }), 100);
  }, [navigate]);

  const activeTab = getCurrentTab();
  const showFAB = activeTab === 'discover';

  console.log('🎯 MainLayout render - activeTab:', activeTab, 'showFAB:', showFAB, 'location:', location);

  return (
    <div className="min-h-screen bg-gray-50">
      <PWAInstallManager />
      
      {/* Main content area with proper padding for bottom nav */}
      <main className="pb-20" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>
        {/* Key the children by location to force re-render */}
        <div key={location}>
          {children}
        </div>
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation 
        activeTab={activeTab} 
        onTabChange={handleTabChange}
        showFAB={showFAB}
        onFABClick={handleFABClick}
      />

      {/* Notification Container */}
      <NotificationContainer />
      
      {/* Enhanced Toast Notifications */}
      <Toaster 
        position="top-center"
        containerStyle={{
          top: 20,
          zIndex: 9999,
        }}
        toastOptions={{
          duration: 3000,
          style: {
            background: '#ffffff',
            color: '#111827',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            fontSize: '14px',
            fontWeight: '500',
            maxWidth: '400px',
            padding: '16px',
          },
          success: {
            duration: 2500,
            iconTheme: {
              primary: '#22c55e',
              secondary: '#fff',
            },
            style: {
              border: '1px solid #22c55e',
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
            style: {
              border: '1px solid #ef4444',
            },
          },
        }}
      />
    </div>
  );
});

MainLayout.displayName = 'MainLayout';

// Enhanced page wrapper components with proper keying for re-mounting
const DiscoverPageWrapper: React.FC = memo(() => {
  const [location, navigate] = useLocation();
  
  const handleNavigateToProfile = useCallback(() => {
    console.log('🚀 Navigating to profile from discover...');
    navigate('/profile');
  }, [navigate]);

  return (
    <SafeRoute 
      component={DiscoverPage} 
      title="Discover"
      path={location}
      onNavigateToProfile={handleNavigateToProfile}
    />
  );
});

DiscoverPageWrapper.displayName = 'DiscoverPageWrapper';

const BetsPageWrapper: React.FC = memo(() => {
  const [location, navigate] = useLocation();
  
  const handleNavigateToDiscover = useCallback(() => {
    console.log('🚀 Navigating to discover from bets...');
    navigate('/');
  }, [navigate]);

  return (
    <SafeRoute 
      component={BetsTab} 
      title="My Predictions"
      path={location}
      onNavigateToDiscover={handleNavigateToDiscover}
    />
  );
});

BetsPageWrapper.displayName = 'BetsPageWrapper';

const ProfilePageWrapper: React.FC = memo(() => {
  const [location, navigate] = useLocation();
  
  const handleNavigateBack = useCallback(() => {
    console.log('🚀 Navigating back from profile...');
    navigate('/');
  }, [navigate]);

  return (
    <SafeRoute 
      component={ProfilePage} 
      title="Profile"
      path={location}
      onNavigateBack={handleNavigateBack}
    />
  );
});

ProfilePageWrapper.displayName = 'ProfilePageWrapper';

const WalletPageWrapper: React.FC = memo(() => {
  const [location] = useLocation();
  
  return (
    <SafeRoute 
      component={WalletPage} 
      title="Wallet"
      path={location}
    />
  );
});

WalletPageWrapper.displayName = 'WalletPageWrapper';

const CreatePredictionPageWrapper: React.FC = memo(() => {
  const [location, navigate] = useLocation();
  
  const handleNavigateBack = useCallback(() => {
    console.log('🚀 Navigating back from create...');
    navigate('/');
  }, [navigate]);

  const handleComplete = useCallback(() => {
    console.log('🎉 Prediction created, navigating to discover...');
    navigate('/');
  }, [navigate]);

  return (
    <SafeRoute 
      component={CreatePredictionPage} 
      title="Create Prediction"
      path={location}
      onNavigateBack={handleNavigateBack}
      onComplete={handleComplete}
    />
  );
});

CreatePredictionPageWrapper.displayName = 'CreatePredictionPageWrapper';

// Enhanced prediction details wrapper with proper routing
const PredictionDetailsWrapper: React.FC<{ params: { id: string } }> = memo(({ params }) => {
  const [location, navigate] = useLocation();
  
  const handleNavigateBack = useCallback(() => {
    console.log('🚀 Navigating back from prediction details...');
    navigate('/');
  }, [navigate]);

  return (
    <SafeRoute 
      component={PredictionDetailsPage} 
      title="Prediction Details"
      path={location}
      predictionId={params.id}
      onNavigateBack={handleNavigateBack}
    />
  );
});

PredictionDetailsWrapper.displayName = 'PredictionDetailsWrapper';

// User profile wrapper with proper routing
const UserProfileWrapper: React.FC<{ params: { id: string } }> = memo(({ params }) => {
  const [location, navigate] = useLocation();
  
  const handleNavigateBack = useCallback(() => {
    console.log('🚀 Navigating back from user profile...');
    navigate('/');
  }, [navigate]);

  return (
    <SafeRoute 
      component={ProfilePage} 
      title="User Profile"
      path={location}
      userId={params.id}
      onNavigateBack={handleNavigateBack}
    />
  );
});

UserProfileWrapper.displayName = 'UserProfileWrapper';

// Main App Component with optimized initialization and error handling
function App() {
  const { initializeWallet } = useWalletStore();
  const { initializeAuth, isAuthenticated, loading, initialized } = useAuthStore();

  // Initialize auth once on app start with better error handling
  useEffect(() => {
    console.log('🚀 Initializing Fan Club Z v2.0...');
    
    try {
      // Only initialize if not already done
      if (!initialized && !loading) {
        console.log('🔐 Starting auth initialization...');
        initializeAuth();
      }
    } catch (error) {
      console.error('❌ Auth initialization failed:', error);
    }
  }, [initializeAuth, initialized, loading]);

  // Initialize wallet after auth is ready and user is authenticated
  useEffect(() => {
    if (isAuthenticated && !loading && initialized) {
      console.log('💰 Initializing wallet...');
      try {
        initializeWallet();
      } catch (error) {
        console.error('❌ Wallet initialization failed:', error);
      }
    }
  }, [isAuthenticated, loading, initialized, initializeWallet]);

  // Log auth state changes for debugging (less verbose)
  useEffect(() => {
    console.log('🔐 Auth state:', { isAuthenticated, loading, initialized });
  }, [isAuthenticated, loading, initialized]);

  return (
    <Router>
      <Switch>
        {/* Public auth routes */}
        <Route path="/auth/callback">
          <SafeRoute component={AuthCallbackPage} title="Authentication" path="/auth/callback" />
        </Route>
        
        {/* Protected app routes */}
        <Route path="/">
          <AuthGuard>
            <MainLayout>
              <Switch>
                {/* Main navigation routes - each with unique path for proper keying */}
                <Route path="/" component={DiscoverPageWrapper} />
                <Route path="/discover" component={DiscoverPageWrapper} />
                <Route path="/bets" component={BetsPageWrapper} />
                <Route path="/create" component={CreatePredictionPageWrapper} />
                <Route path="/profile" component={ProfilePageWrapper} />
                <Route path="/wallet" component={WalletPageWrapper} />
                
                {/* Dynamic detail routes */}
                <Route path="/prediction/:id" component={PredictionDetailsWrapper} />
                <Route path="/profile/:id" component={UserProfileWrapper} />
                
                {/* Fallback to discover with logging */}
                <Route>
                  {(params) => {
                    console.log('🔄 Fallback route hit with params:', params);
                    return <DiscoverPageWrapper />;
                  }}
                </Route>
              </Switch>
            </MainLayout>
          </AuthGuard>
        </Route>
      </Switch>
    </Router>
  );
}

export default App;
