import React, { useEffect } from 'react';
import { Router, Route, Switch, useLocation, useRoute } from 'wouter';
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
import PageWrapper from './components/PageWrapper';

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

// Main Layout Component
const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [location, navigate] = useLocation();
  
  // Get current tab from route
  const getCurrentTab = () => {
    if (location === '/' || location === '/discover') return 'discover';
    if (location === '/bets') return 'bets';
    if (location === '/profile') return 'profile';
    if (location === '/wallet') return 'wallet';
    if (location === '/create') return 'create';
    return 'discover'; // default
  };

  const handleTabChange = (tab: string) => {
    console.log('🔄 Tab change requested:', tab);
    
    // Navigate to the appropriate route
    switch (tab) {
      case 'discover':
        navigate('/');
        break;
      case 'bets':
        navigate('/bets');
        break;
      case 'profile':
        navigate('/profile');
        break;
      case 'wallet':
        navigate('/wallet');
        break;
      case 'create':
        navigate('/create');
        break;
      default:
        navigate('/');
    }
    
    // Scroll to top after navigation
    setTimeout(() => scrollToTop({ delay: 100 }), 50);
  };

  const handleFABClick = () => {
    console.log('🎯 FAB clicked - navigating to create prediction');
    navigate('/create');
  };

  const activeTab = getCurrentTab();
  const showFAB = activeTab === 'discover';

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      <PWAInstallManager />
      
      <main className="page-content">
        <div style={{
          width: '100%',
          maxWidth: '100%',
          overflow: 'hidden',
          paddingBottom: 'calc(4rem + env(safe-area-inset-bottom, 1rem))'
        }}>
          {children}
        </div>
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
          duration: 4000,
          style: {
            background: '#ffffff',
            color: '#111827',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            fontSize: '14px',
            fontWeight: '500',
            maxWidth: '400px',
            padding: '16px',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#22c55e',
              secondary: '#fff',
            },
            style: {
              background: '#ffffff',
              color: '#111827',
              border: '1px solid #22c55e',
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
            style: {
              background: '#ffffff',
              color: '#111827',
              border: '1px solid #ef4444',
            },
          },
        }}
      />
    </div>
  );
};

// Page wrapper components that handle navigation properly
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

// Prediction details wrapper
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

// Main App Component
function App() {
  const { initializeWallet } = useWalletStore();
  const { initializeAuth, isAuthenticated, loading } = useAuthStore();

  // Initialize auth and wallet on app start
  useEffect(() => {
    console.log('🚀 Initializing Fan Club Z...');
    initializeAuth();
    console.log('✅ App initialization started');
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
        {/* Public routes */}
        <Route path="/auth/callback" component={AuthCallbackPage} />
        
        {/* Protected routes */}
        <Route path="/">
          <AuthGuard>
            <MainLayout>
              <Switch>
                {/* Main app routes */}
                <Route path="/" component={DiscoverPageWrapper} />
                <Route path="/discover" component={DiscoverPageWrapper} />
                <Route path="/bets" component={BetsPageWrapper} />
                <Route path="/create" component={CreatePredictionPageWrapper} />
                <Route path="/profile" component={ProfilePageWrapper} />
                <Route path="/wallet" component={WalletPageWrapper} />
                
                {/* Dynamic routes */}
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