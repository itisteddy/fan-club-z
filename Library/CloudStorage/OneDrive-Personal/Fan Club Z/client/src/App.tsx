import React, { useEffect, useState } from 'react';
import { Router, Route, Switch, Redirect } from 'wouter';
import { useAuthStore, initializeAuth } from './store/authStore';
import { ToastContainer } from './hooks/use-toast';
import { useScrollToTop } from './hooks/use-scroll-to-top';
import useWalletInitialization from './hooks/useWalletInitialization';

// Layout Components
import MainHeader from './components/MainHeader';
import BottomNavigation from './components/BottomNavigation';
import ScrollToTopButton from './components/ScrollToTopButton';

// Pages
import DiscoverTab from './pages/DiscoverTab';
import BetsTab from './pages/BetsTab';
import CreateBetTab from './pages/CreateBetTab';
import ClubsTab from './pages/ClubsTab';
import WalletTab from './pages/WalletTab';
import ProfilePage from './pages/ProfilePage';
import { SettingsPage } from './pages/settings';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

// Onboarding
import { OnboardingFlow } from './components/onboarding/OnboardingFlow';
import { InstallPrompt } from './components/InstallPrompt';

// Detail Pages
import BetDetailPage from './pages/BetDetailPage';
import ClubDetailPage from './pages/ClubDetailPage';

// Simple Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full text-center shadow-lg">
            <div className="text-4xl mb-4">⚠️</div>
            <h1 className="text-xl font-bold text-gray-900 mb-4">Something went wrong</h1>
            <p className="text-gray-600 mb-6">The app encountered an error. Please try refreshing the page.</p>
            <div className="space-y-3">
              <button 
                onClick={() => window.location.reload()}
                className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600"
              >
                Reload App
              </button>
              <button 
                onClick={() => {
                  localStorage.clear();
                  window.location.href = '/';
                }}
                className="w-full bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600"
              >
                Clear Data & Restart
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, onboardingCompleted } = useAuthStore();
  
  if (!isAuthenticated) {
    return <Redirect to="/auth/login" />;
  }
  
  if (!onboardingCompleted) {
    return <Redirect to="/onboarding" />;
  }
  
  return <>{children}</>;
};

// Public Route Component  
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, onboardingCompleted } = useAuthStore();
  
  if (isAuthenticated) {
    if (!onboardingCompleted) {
      return <Redirect to="/onboarding" />;
    }
    return <Redirect to="/discover" />;
  }
  
  return <>{children}</>;
};

// Main App Content Component
const AppContent: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  
  // Initialize wallet for authenticated users
  const { isWalletReady } = useWalletInitialization();

  return (
    <Switch>
      {/* Auth Routes */}
      <Route path="/auth/login">
        <PublicRoute>
          <LoginPage />
        </PublicRoute>
      </Route>
      
      <Route path="/auth/register">
        <PublicRoute>
          <RegisterPage />
        </PublicRoute>
      </Route>
      
      {/* Onboarding Route */}
      <Route path="/onboarding">
        <OnboardingFlow 
          onComplete={() => {
            console.log('🎉 App: Onboarding completed successfully');
          }}
        />
      </Route>
      
      {/* Default redirect */}
      <Route path="/">
        {isAuthenticated ? <Redirect to="/discover" /> : <Redirect to="/auth/login" />}
      </Route>
      
      {/* Discovery Page */}
      <Route path="/discover">
        <div className="flex flex-col min-h-screen">
          <MainHeader showBalance={isAuthenticated} showNotifications={isAuthenticated} />
          <main className="flex-1 pb-20">
            <DiscoverTab />
          </main>
          <BottomNavigation />
          <ScrollToTopButton />
        </div>
      </Route>
      
      {/* Protected Routes */}
      <Route path="/bets">
        <ProtectedRoute>
          <div className="flex flex-col min-h-screen">
            <MainHeader showBalance={true} showNotifications={true} />
            <main className="flex-1 pb-20">
              <BetsTab />
            </main>
            <BottomNavigation />
            <ScrollToTopButton />
          </div>
        </ProtectedRoute>
      </Route>

      <Route path="/create-bet">
        <ProtectedRoute>
          <div className="flex flex-col min-h-screen">
            <MainHeader showBalance={true} showNotifications={true} />
            <main className="flex-1 pb-20">
              <CreateBetTab />
            </main>
            <BottomNavigation />
            <ScrollToTopButton />
          </div>
        </ProtectedRoute>
      </Route>
      
      <Route path="/clubs">
        <div className="flex flex-col min-h-screen">
          <MainHeader showBalance={true} showNotifications={true} />
          <main className="flex-1 pb-20">
            <ClubsTab />
          </main>
          <BottomNavigation />
          <ScrollToTopButton />
        </div>
      </Route>

      <Route path="/wallet">
        <ProtectedRoute>
          <div className="flex flex-col min-h-screen">
            <main className="flex-1">
              <WalletTab />
            </main>
            <BottomNavigation />
            <ScrollToTopButton />
          </div>
        </ProtectedRoute>
      </Route>

      <Route path="/profile">
        <ProtectedRoute>
          <div className="flex flex-col min-h-screen">
            <MainHeader showBalance={true} showNotifications={true} />
            <main className="flex-1 pb-20">
              <ProfilePage />
            </main>
            <BottomNavigation />
            <ScrollToTopButton />
          </div>
        </ProtectedRoute>
      </Route>
      
      <Route path="/settings">
        <ProtectedRoute>
          <div className="flex flex-col min-h-screen">
            <main className="flex-1">
              <SettingsPage />
            </main>
          </div>
        </ProtectedRoute>
      </Route>
      
      {/* Detail Pages */}
      <Route path="/bets/:betId">
        {(params) => (
          <ProtectedRoute>
            <div className="flex flex-col min-h-screen">
              <MainHeader showBalance={true} showNotifications={true} />
              <main className="flex-1 pb-20">
                <BetDetailPage betId={params.betId} />
              </main>
              <BottomNavigation />
              <ScrollToTopButton />
            </div>
          </ProtectedRoute>
        )}
      </Route>
      
      <Route path="/clubs/:clubId">
        {(params) => (
          <div className="flex flex-col min-h-screen">
            <MainHeader showBalance={true} showNotifications={true} />
            <main className="flex-1 pb-20">
              <ClubDetailPage clubId={params.clubId} />
            </main>
            <BottomNavigation />
            <ScrollToTopButton />
          </div>
        )}
      </Route>
      
      {/* 404 Fallback */}
      <Route>
        <div className="flex flex-col min-h-screen">
          <MainHeader showBalance={true} showNotifications={true} />
          <main className="flex-1 pb-20">
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
              <div className="text-6xl mb-4">404</div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Page Not Found</h1>
              <p className="text-gray-600 mb-4">The page you're looking for doesn't exist.</p>
              <button
                onClick={() => window.history.back()}
                className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600"
              >
                Go Back
              </button>
            </div>
          </main>
          <BottomNavigation />
          <ScrollToTopButton />
        </div>
      </Route>
    </Switch>
  );
};

function App() {
  const { isAuthenticated } = useAuthStore();
  const [authInitialized, setAuthInitialized] = useState(false);

  // Initialize auth on app startup
  useEffect(() => {
    const initAuth = async () => {
      try {
        await initializeAuth();
      } catch (error) {
        console.error('Auth initialization failed:', error);
      } finally {
        setAuthInitialized(true);
      }
    };
    
    initAuth();
  }, []);

  useScrollToTop();

  // Show loading state while auth is initializing
  if (!authInitialized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-white text-2xl font-bold">Z</span>
          </div>
          <div className="text-lg font-semibold text-gray-900 mb-2">Loading Fan Club Z</div>
          <div className="text-gray-500">Getting things ready...</div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <AppContent />
          <ToastContainer />
          <InstallPrompt />
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
