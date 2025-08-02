import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWalletStore } from './stores/walletStore';
import { useAuthStore } from './store/authStore';
import { Toaster } from 'react-hot-toast';
import { scrollToTop } from './utils/scroll';
import NotificationContainer from './components/ui/NotificationContainer';

// Import all page components
import DiscoverPage from './pages/DiscoverPage';
import CreatePredictionPage from './pages/CreatePredictionPage';
import BetsTab from './pages/BetsTab';
import ClubsPage from './pages/ClubsPage';
import ProfilePage from './pages/ProfilePage';
import WalletPage from './pages/WalletPage';
import AuthPage from './pages/auth/AuthPage';

import BottomNavigation from './components/BottomNavigation';

// Create the missing page components
const MyPredictionsPage: React.FC<{ onNavigateToDiscover?: () => void }> = ({ onNavigateToDiscover }) => {
  return <BetsTab onNavigateToDiscover={onNavigateToDiscover} />;
};

// Navigation History Manager
class NavigationHistory {
  private history: string[] = ['discover'];
  private previousTab: string = 'discover';
  
  push(tab: string) {
    // Store previous tab before updating
    if (this.history.length > 0) {
      this.previousTab = this.history[this.history.length - 1];
    }
    // Remove if already exists to avoid duplicates
    this.history = this.history.filter(t => t !== tab);
    this.history.push(tab);
  }
  
  pop(): string {
    if (this.history.length > 1) {
      this.history.pop(); // Remove current
      return this.history[this.history.length - 1]; // Return previous
    }
    return this.previousTab || 'discover'; // Use stored previous or default fallback
  }
  
  getCurrent(): string {
    return this.history[this.history.length - 1] || 'discover';
  }
  
  getPrevious(): string {
    return this.previousTab || 'discover';
  }
  
  clear() {
    this.history = ['discover'];
    this.previousTab = 'discover';
  }
}

// Main App Component
function App() {
  const [activeTab, setActiveTab] = useState('discover');
  const [navigationHistory] = useState(new NavigationHistory());
  const { initializeWallet } = useWalletStore();
  const { initializeAuth, isAuthenticated, loading, initialized } = useAuthStore();

  // Initialize auth and wallet on app start
  useEffect(() => {
    console.log('🚀 Initializing Fan Club Z...');
    
    // Initialize authentication first
    initializeAuth();
    
    console.log('✅ App initialization started');
  }, [initializeAuth]);

  // Initialize wallet only after authentication is complete
  useEffect(() => {
    if (initialized && isAuthenticated) {
      console.log('🏦 Initializing wallet for authenticated user...');
      initializeWallet();
    }
  }, [initialized, isAuthenticated, initializeWallet]);

  const handleTabChange = (tab: string) => {
    navigationHistory.push(tab);
    setActiveTab(tab);
    // Scroll to top when changing tabs (UI/UX best practice)
    scrollToTop({ delay: 100 });
  };

  const handleNavigateToProfile = () => {
    navigationHistory.push('profile');
    setActiveTab('profile');
    scrollToTop({ delay: 100 });
  };

  const handleNavigateBackFromProfile = () => {
    const previousTab = navigationHistory.getPrevious();
    setActiveTab(previousTab);
    scrollToTop({ delay: 100 });
  };

  const handleNavigateToDiscover = () => {
    navigationHistory.push('discover');
    setActiveTab('discover');
    scrollToTop({ delay: 100 });
  };

  const handleNavigateBackFromCreate = () => {
    const previousTab = navigationHistory.getPrevious();
    setActiveTab(previousTab);
    scrollToTop({ delay: 100 });
  };

  // NEW: Handle navigation to create prediction from clubs
  const handleNavigateToCreateFromClubs = () => {
    navigationHistory.push('create');
    setActiveTab('create');
    scrollToTop({ delay: 100 });
  };

  const renderPage = () => {
    switch (activeTab) {
      case 'discover':
        return <DiscoverPage onNavigateToProfile={handleNavigateToProfile} />;
      case 'predictions':
        return <MyPredictionsPage onNavigateToDiscover={handleNavigateToDiscover} />;
      case 'create':
        return <CreatePredictionPage onNavigateBack={handleNavigateBackFromCreate} />;
      case 'clubs':
        return <ClubsPage onNavigateToCreate={handleNavigateToCreateFromClubs} />;
      case 'wallet':
        return <WalletPage />;
      case 'profile':
        return <ProfilePage onNavigateBack={handleNavigateBackFromProfile} />;
      default:
        return <DiscoverPage onNavigateToProfile={handleNavigateToProfile} />;
    }
  };

  // Show loading screen while initializing
  if (!initialized || loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: '#f9fafb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '4px solid #e5e7eb',
          borderTop: '4px solid #22c55e',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <p style={{ 
          fontSize: '16px', 
          color: '#6b7280',
          fontWeight: '500'
        }}>
          Initializing Fan Club Z...
        </p>
        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    );
  }

  // Show auth page if not authenticated
  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      <main className="page-content">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ 
              duration: 0.2,
              ease: "easeInOut"
            }}
            style={{
              width: '100%',
              paddingBottom: 'calc(4rem + env(safe-area-inset-bottom, 1rem))'
            }}
          >
            {renderPage()}
          </motion.div>
        </AnimatePresence>
      </main>

      <BottomNavigation activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Custom notification system */}
      <NotificationContainer />

      {/* Toast notifications */}
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
}

export default App;