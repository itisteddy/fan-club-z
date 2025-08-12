import React, { useEffect } from 'react';
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
import BetsTab from './pages/BetsTab';
import ProfilePage from './pages/ProfilePage';
import WalletPage from './pages/WalletPage';
import AuthPage from './pages/auth/AuthPage';
import AuthCallbackPage from './pages/auth/AuthCallbackPage';
import PredictionDetailsPage from './pages/PredictionDetailsPage';
import BottomNavigation from './components/BottomNavigation';

// Auth Guard Component
const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuthStore();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <AuthPage />;
  }
  
  return <>{children}</>;
};

// Main Layout Component with simplified navigation
const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [location, navigate] = useLocation();
  
  // Get current tab from route
  const getCurrentTab = () => {
    const path = location.toLowerCase();
    if (path === '/' || path === '/discover') return 'discover';
    if (path.startsWith('/bets')) return 'bets';
    if (path.startsWith('/profile')) return 'profile';
    if (path.startsWith('/wallet')) return 'wallet';
    if (path.startsWith('/create')) return 'create';
    return 'discover';
  };

  const handleTabChange = (tab: string) => {
    console.log('🔄 Tab change requested:', tab);
    
    const routes = {
      discover: '/',
      bets: '/bets',
      profile: '/profile',
      wallet: '/wallet',
      create: '/create'
    };
    
    const targetRoute = routes[tab as keyof typeof routes] || '/';
    navigate(targetRoute);
    
    // Immediate scroll to top
    scrollToTop({ delay: 0 });
  };

  const handleFABClick = () => {
    console.log('🎯 FAB clicked - navigating to create prediction');
    navigate('/create');
  };

  const activeTab = getCurrentTab();
  const showFAB = activeTab === 'discover';

  return (
    <div className="min-h-screen bg-gray-50">
      <PWAInstallManager />
      
      <main className="pb-20">
        {children}
      </main>

      <BottomNavigation 
        activeTab={activeTab} 
        onTabChange={handleTabChange}
        showFAB={showFAB}
        onFABClick={handleFABClick}
      />

      <NotificationContainer />
      
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
};

// Optimized page wrapper components
const DiscoverPageWrapper: React.FC = () => {
  const [, navigate] = useLocation();
  return (
    <PageWrapper title="Discover">
      <DiscoverPage 
        onNavigateToProfile={() => navigate('/profile')}
      />
    </PageWrapper>
  );
};

const BetsPageWrapper: React.FC = () => {
  const [, navigate] = useLocation();
  return (
    <PageWrapper title="My Predictions">
      <BetsTab 
        onNavigateToDiscover={() => navigate('/')}
      />
    </PageWrapper>
  );
};

const ProfilePageWrapper: React.FC = () => {
  const [, navigate] = useLocation();
  return (
    <PageWrapper title="Profile">
      <ProfilePage 
        onNavigateBack={() => navigate('/')}
      />
    </PageWrapper>
  );
};

const WalletPageWrapper: React.FC = () => {
  return (
    <PageWrapper title="Wallet">
      <WalletPage />
    </PageWrapper>
  );
};

const CreatePredictionPageWrapper: React.FC = () => {
  const [, navigate] = useLocation();
  return (
    <PageWrapper title="Create Prediction">
      <CreatePredictionPage 
        onNavigateBack={() => navigate('/')}
      />
    </PageWrapper>
  );
};

// Prediction details wrapper with proper routing
const PredictionDetailsWrapper: React.FC<{ params: { id: string } }> = ({ params }) => {
  return (
    <PageWrapper title="Prediction Details">
      <PredictionDetailsPage predictionId={params.id} />
    </PageWrapper>
  );
};

// User profile wrapper
const UserProfileWrapper: React.FC<{ params: { id: string } }> = ({ params }) => {
  const [, navigate] = useLocation();
  return (
    <PageWrapper title="User Profile">
      <ProfilePage 
        userId={params.id}
        onNavigateBack={() => navigate('/')}
      />
    </PageWrapper>
  );
};

// Main App Component with optimized initialization
function App() {
  const { initializeWallet } = useWalletStore();
  const { initializeAuth, isAuthenticated, loading } = useAuthStore();

  // Initialize auth on app start
  useEffect(() => {
    console.log('🚀 Initializing Fan Club Z...');
    initializeAuth();
  }, [initializeAuth]);

  // Initialize wallet after auth is ready
  useEffect(() => {
    if (isAuthenticated && !loading) {
      initializeWallet();
    }
  }, [isAuthenticated, loading, initializeWallet]);

  return (
    <Router>
      <Switch>
        {/* Public auth routes */}
        <Route path="/auth/callback" component={AuthCallbackPage} />
        
        {/* Protected app routes */}
        <Route path="/">
          <AuthGuard>
            <MainLayout>
              <Switch>
                {/* Main navigation routes */}
                <Route path="/" component={DiscoverPageWrapper} />
                <Route path="/discover" component={DiscoverPageWrapper} />
                <Route path="/bets" component={BetsPageWrapper} />
                <Route path="/create" component={CreatePredictionPageWrapper} />
                <Route path="/profile" component={ProfilePageWrapper} />
                <Route path="/wallet" component={WalletPageWrapper} />
                
                {/* Dynamic detail routes */}
                <Route path="/prediction/:id" component={PredictionDetailsWrapper} />
                <Route path="/profile/:id" component={UserProfileWrapper} />
                
                {/* Fallback to discover */}
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