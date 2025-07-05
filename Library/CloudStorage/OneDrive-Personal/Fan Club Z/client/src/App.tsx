import React, { useEffect } from 'react'
import { Router, Route, Switch, Redirect } from 'wouter'
import { useAuthStore } from './store/authStore'
import { useWalletStore } from './store/walletStore'
import { ToastContainer } from './hooks/use-toast'
import DebugPage from './components/DebugPage'

// Layout Components
import MainHeader from './components/MainHeader'
import BottomNavigation from './components/BottomNavigation'

// Pages
import DiscoverTab from './pages/DiscoverTab'
import BetsTab from './pages/BetsTab'
import CreateBetTab from './pages/CreateBetTab'
import ClubsTab from './pages/ClubsTab'
import WalletTab from './pages/WalletTab'
import ProfilePage from './pages/ProfilePage'

// Auth Pages
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'

// Detail Pages
import BetDetailPage from './pages/BetDetailPage'
import ClubDetailPage from './pages/ClubDetailPage'

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', fontFamily: 'Arial', color: 'red' }}>
          <h1>Something went wrong.</h1>
          <p>Error: {this.state.error?.message}</p>
          <button onClick={() => window.location.reload()}>
            Reload Page
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

function App() {
  const { user, isAuthenticated } = useAuthStore()
  const { refreshBalance } = useWalletStore()

  // Add debugging
  console.log('🎯 App rendering...', { user, isAuthenticated })

  // Refresh wallet balance when user logs in
  useEffect(() => {
    if (user) {
      refreshBalance(user.id)
    }
  }, [user, refreshBalance])

  // Show debug page for mobile testing
  if (typeof window !== 'undefined' && window.location.search.includes('debug')) {
    console.log('🐛 Showing debug page')
    return <DebugPage />
  }

  // Simple fallback test
  if (typeof window !== 'undefined' && window.location.search.includes('test')) {
    console.log('🧪 Showing test page')
    return (
      <div style={{ padding: '20px', fontFamily: 'Arial' }}>
        <h1 style={{ color: 'green', fontSize: '24px' }}>✅ React Test Page</h1>
        <p>If you see this, React is working!</p>
        <p>User: {user ? user.firstName : 'Not logged in'}</p>
        <p>Auth: {isAuthenticated ? 'Yes' : 'No'}</p>
        <button onClick={() => window.location.href = '/discover'}>
          Go to Main App
        </button>
      </div>
    )
  }

  // Protected Route Component
  const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    if (!isAuthenticated) {
      return <Redirect to="/auth/login" />
    }
    return <>{children}</>
  }

  // Public Route Component (redirect if authenticated)
  const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    if (isAuthenticated) {
      return <Redirect to="/discover" />
    }
    return <>{children}</>
  }

  return (
    <ErrorBoundary>
      <Router>
        <div className="min-h-screen bg-gray-50">
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

            {/* Main App Routes */}
            <Route>
              <div className="flex flex-col min-h-screen">
                {/* Header */}
                <MainHeader 
                  showBalance={true}
                  showNotifications={true}
                />

                {/* Main Content */}
                <main className="flex-1 pb-20">
                  <Switch>
                    {/* Default redirect */}
                    <Route path="/">
                      <Redirect to="/discover" />
                    </Route>

                    {/* Public Discovery (no auth required) */}
                    <Route path="/discover">
                      <DiscoverTab />
                    </Route>

                    {/* Protected Routes */}
                    <Route path="/bets">
                      <ProtectedRoute>
                        <BetsTab />
                      </ProtectedRoute>
                    </Route>

                    <Route path="/create">
                      <ProtectedRoute>
                        <CreateBetTab />
                      </ProtectedRoute>
                    </Route>

                    <Route path="/clubs">
                      <ClubsTab />
                    </Route>

                    <Route path="/wallet">
                      <ProtectedRoute>
                        <WalletTab />
                      </ProtectedRoute>
                    </Route>

                    <Route path="/profile">
                      <ProtectedRoute>
                        <ProfilePage />
                      </ProtectedRoute>
                    </Route>

                    {/* Detail Pages */}
                    <Route path="/bets/:betId">
                      {(params) => <BetDetailPage betId={params.betId} />}
                    </Route>

                    <Route path="/clubs/:clubId">
                      {(params) => <ClubDetailPage clubId={params.clubId} />}
                    </Route>

                    {/* 404 Fallback */}
                    <Route>
                      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
                        <div className="text-6xl mb-4">🤔</div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">
                          Page Not Found
                        </h1>
                        <p className="text-gray-600 mb-4">
                          The page you're looking for doesn't exist.
                        </p>
                        <button
                          onClick={() => window.history.back()}
                          className="btn-primary"
                        >
                          Go Back
                        </button>
                      </div>
                    </Route>
                  </Switch>
                </main>

                {/* Bottom Navigation */}
                <BottomNavigation />
              </div>
            </Route>
          </Switch>

          {/* Toast Notifications */}
          <ToastContainer />
        </div>
      </Router>
    </ErrorBoundary>
  )
}

export default App
