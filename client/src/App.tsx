import React, { useEffect, useCallback, memo, Suspense } from 'react';
import { Router, Route, Switch, useLocation } from 'wouter';
import { useWalletStore } from './store/walletStore';
import { useAuthStore } from './store/authStore';
import { Toaster } from 'react-hot-toast';
import { scrollToTop } from './utils/scroll';
import NotificationContainer from './components/ui/NotificationContainer';
import PWAInstallManager from './components/PWAInstallManager';
import PageWrapper from './components/PageWrapper';

// Import all page components
import DiscoverPage from './pages/DiscoverPage';
import CreatePredictionPage from './pages/CreatePredictionPage';
import { PredictionsPage } from './pages/PredictionsPage';
import SimpleProfilePage from './pages/SimpleProfilePage';
import SimpleWalletPage from './pages/SimpleWalletPage';
import AuthPage from './pages/auth/AuthPage';
import AuthCallbackPage from './pages/auth/AuthCallbackPage';
import PredictionDetailsPage from './pages/PredictionDetailsPage';
import BottomNavigation from './components/BottomNavigation';

// Simple Loading Component
const LoadingSpinner: React.FC<{ message?: string }> = ({ message = "Loading..." }) => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
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

// Main Layout Component with proper navigation
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
    console.log('🔄 Navigating to tab:', tab);
    
    // Scroll to top
    scrollToTop();
    
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
  }, [navigate]);

  const handleFABClick = useCallback(() => {
    console.log('➕ FAB clicked - navigating to create');
    navigate('/create');
  }, [navigate]);

  const showFAB = getCurrentTab() === 'discover';

  console.log('🏗️ MainLayout render - activeTab:', getCurrentTab(), 'showFAB:', showFAB, 'location:', location);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
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

// Page Wrapper Components with proper props
const DiscoverPageWrapper: React.FC = () => {
  const [, navigate] = useLocation();
  
  const handleNavigateToProfile = useCallback(() => {
    navigate('/profile');
  }, [navigate]);

  const handleNavigateToPrediction = useCallback((predictionId: string) => {
    navigate(`/prediction/${predictionId}`);
  }, [navigate]);

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
  const [, navigate] = useLocation();
  
  const handleNavigateToDiscover = useCallback(() => {
    navigate('/');
  }, [navigate]);

  return (
    <PageWrapper title="My Predictions">
      <PredictionsPage />
    </PageWrapper>
  );
};

const CreatePredictionPageWrapper: React.FC = () => {
  const [, navigate] = useLocation();
  
  const handleNavigateBack = useCallback(() => {
    navigate('/');
  }, [navigate]);

  const handleComplete = useCallback(() => {
    navigate('/');
  }, [navigate]);

  return (
    <PageWrapper title="Create Prediction">
      <CreatePredictionPage 
        onNavigateBack={handleNavigateBack}
        onComplete={handleComplete}
      />
    </PageWrapper>
  );
};

const ProfilePageWrapper: React.FC = () => {
  const [, navigate] = useLocation();
  
  const handleNavigateBack = useCallback(() => {
    navigate('/');
  }, [navigate]);

  return (
    <PageWrapper title="Profile">
      <SimpleProfilePage onNavigateBack={handleNavigateBack} />
    </PageWrapper>
  );
};

const WalletPageWrapper: React.FC = () => {
  return (
    <PageWrapper title="Wallet">
      <SimpleWalletPage />
    </PageWrapper>
  );
};

const PredictionDetailsWrapper: React.FC<{ params: { id: string } }> = ({ params }) => {
  const [, navigate] = useLocation();
  
  const handleNavigateBack = useCallback(() => {
    navigate('/');
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

// Main App Component with simplified routing
function App() {
  const { initializeWallet } = useWalletStore();
  const { initializeAuth, isAuthenticated, loading, initialized } = useAuthStore();

  // Initialize auth once on app start
  useEffect(() => {
    console.log('🚀 Initializing Fan Club Z v2.0...');
    
    try {
      if (!initialized && !loading) {
        console.log('🔐 Starting auth initialization...');
        initializeAuth();
      }
    } catch (error) {
      console.error('❌ Auth initialization failed:', error);
    }
  }, [initializeAuth, initialized, loading]);

  // Initialize wallet after auth is ready
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

  // Log auth state changes (less verbose)
  useEffect(() => {
    if (!loading) {
      console.log('🔐 Auth state settled:', { isAuthenticated, initialized });
    }
  }, [isAuthenticated, loading, initialized]);

  return (
    <Router>
      <Switch>
        {/* Public auth routes */}
        <Route path="/auth/callback">
          <PageWrapper title="Authentication">
            <AuthCallbackPage />
          </PageWrapper>
        </Route>
        
        {/* Protected app routes */}
        <Route path="/">
          <AuthGuard>
            <MainLayout>
              <Switch>
                <Route path="/" component={DiscoverPageWrapper} />
                <Route path="/discover" component={DiscoverPageWrapper} />
                <Route path="/predictions" component={PredictionsPageWrapper} />
                <Route path="/bets" component={PredictionsPageWrapper} />
                <Route path="/create" component={CreatePredictionPageWrapper} />
                <Route path="/profile" component={ProfilePageWrapper} />
                <Route path="/wallet" component={WalletPageWrapper} />
                <Route path="/prediction/:id" component={PredictionDetailsWrapper} />
                
                {/* Fallback */}
                <Route component={DiscoverPageWrapper} />
              </Switch>
            </MainLayout>
          </AuthGuard>
        </Route>
      </Switch>
    </Router>
  );
}

export default App;
