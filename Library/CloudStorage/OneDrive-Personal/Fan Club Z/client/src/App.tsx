import React, { useEffect, useState } from 'react'
import { Router, Route, Switch, Redirect } from 'wouter'
import { useAuthStore, initializeAuth } from './store/authStore'
import { ToastContainer } from './hooks/use-toast'
import { useScrollToTop } from './hooks/use-scroll-to-top'
import MobileDiagnostic from './components/MobileDiagnostic'
import DebugPage from './components/DebugPage'

// Layout Components
import MainHeader from './components/MainHeader'
import BottomNavigation from './components/BottomNavigation'
import ScrollToTopButton from './components/ScrollToTopButton'

// Pages
import DiscoverTab from './pages/DiscoverTab'
import BetsTab from './pages/BetsTab'
import CreateBetTab from './pages/CreateBetTab'
import ClubsTab from './pages/ClubsTab'
import WalletTab from './pages/WalletTab'
import ProfilePage from './pages/ProfilePage'
import { SettingsPage } from './pages/settings'

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
        <div style={{ 
          padding: '20px', 
          fontFamily: 'system-ui, -apple-system, sans-serif', 
          backgroundColor: '#f8f9fa',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            maxWidth: '400px',
            width: '100%',
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>ERROR</div>
            <h1 style={{ 
              color: '#dc3545', 
              fontSize: '24px', 
              margin: '0 0 16px 0',
              fontWeight: '600'
            }}>Something went wrong!</h1>
            <p style={{ 
              color: '#6c757d', 
              fontSize: '16px', 
              margin: '0 0 24px 0',
              lineHeight: '1.5'
            }}>An unexpected error occurred. Try reloading the app.</p>
            
            <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
              <button 
                onClick={() => window.location.reload()}
                style={{
                  backgroundColor: '#007AFF',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Reload App
              </button>
              
              <button 
                onClick={() => {
                  localStorage.clear()
                  sessionStorage.clear()
                  window.location.href = '/'
                }}
                style={{
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Clear Data & Restart
              </button>
              
              <a 
                href="/test.html"
                style={{
                  color: '#007AFF',
                  textDecoration: 'none',
                  fontSize: '14px',
                  marginTop: '8px'
                }}
              >
                View Diagnostic Info
              </a>
            </div>
            
            <details style={{ 
              marginTop: '24px', 
              textAlign: 'left',
              fontSize: '12px',
              color: '#6c757d'
            }}>
              <summary style={{ cursor: 'pointer', marginBottom: '8px' }}>Error Details</summary>
              <pre style={{ 
                whiteSpace: 'pre-wrap', 
                wordBreak: 'break-word',
                backgroundColor: '#f8f9fa',
                padding: '12px',
                borderRadius: '4px',
                border: '1px solid #dee2e6'
              }}>
                {this.state.error?.message || 'Unknown error'}
                {this.state.error?.stack && '\n\n' + this.state.error.stack}
              </pre>
            </details>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function App() {
  const { user, isAuthenticated } = useAuthStore()
  const [authInitialized, setAuthInitialized] = useState(false)
  const [initializing, setInitializing] = useState(true)

  // Initialize auth on app startup
  useEffect(() => {
    const initAuth = async () => {
      console.log('App: Initializing authentication...')
      setInitializing(true)
      try {
        await new Promise(resolve => setTimeout(resolve, 100))
        await initializeAuth()
        console.log('App: Authentication initialized successfully')
      } catch (error) {
        console.error('App: Auth initialization failed:', error)
      } finally {
        setAuthInitialized(true)
        setInitializing(false)
        console.log('App: Auth initialization complete')
      }
    }
    
    const timeoutId = setTimeout(() => {
      if (!authInitialized) {
        console.warn('App: Auth initialization timeout, forcing completion')
        setAuthInitialized(true)
        setInitializing(false)
      }
    }, 5000)
    
    initAuth()
    return () => clearTimeout(timeoutId)
  }, [])

  useScrollToTop()

  console.log('App rendering...', {
    user: user?.email,
    isAuthenticated,
    authInitialized,
    initializing,
    currentPath: typeof window !== 'undefined' ? window.location.pathname : 'unknown'
  })

  // Show loading state while auth is initializing
  if (initializing || !authInitialized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl font-bold">Z</span>
          </div>
          <div className="text-lg font-semibold text-gray-900 mb-2">Loading Fan Club Z</div>
          <div className="text-gray-500">Initializing your experience...</div>
        </div>
      </div>
    )
  }

  // Show mobile diagnostic page if requested
  if (typeof window !== 'undefined' && window.location.search.includes('mobile-diagnostic')) {
    console.log('Showing mobile diagnostic page')
    return <MobileDiagnostic />
  }

  // Show debug page for mobile testing
  if (typeof window !== 'undefined' && window.location.search.includes('debug')) {
    console.log('Showing debug page')
    return <DebugPage />
  }

  // Simple fallback test
  if (typeof window !== 'undefined' && window.location.search.includes('test')) {
    console.log('Showing test page')
    return (
      <div style={{ padding: '20px', fontFamily: 'Arial' }}>
        <h1 style={{ color: 'green', fontSize: '24px' }}>React Test Page</h1>
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

  // Public Route Component
  const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    if (authInitialized && isAuthenticated) {
      return <Redirect to="/discover" />
    }
    return <>{children}</>
  }

  return (
    <ErrorBoundary>
      <Router>
        <div className="min-h-screen bg-gray-50">
          {/* Demo Mode Banner */}
          {user && (user.email === 'demo@fanclubz.app' || user.id === 'demo-user-id') && (
            <div className="w-full bg-yellow-100 text-yellow-800 text-center py-2 text-sm font-medium z-50">
              Demo mode: Likes, comments, and bets are not saved.
            </div>
          )}
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
            
            {/* Default redirect */}
            <Route path="/">
              {(() => {
                try {
                  if (!authInitialized) {
                    return (
                      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                        <div className="text-center">
                          <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-white text-2xl font-bold">Z</span>
                          </div>
                          <div className="text-lg font-semibold text-gray-900 mb-2">Loading...</div>
                          <div className="text-gray-500">Initializing Fan Club Z...</div>
                        </div>
                      </div>
                    )
                  }
                  
                  if (isAuthenticated) {
                    return <Redirect to="/discover" />
                  } else {
                    return <Redirect to="/auth/login" />
                  }
                } catch (error) {
                  console.error('Root route error:', error)
                  return (
                    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                      <div className="text-center p-4">
                        <div className="text-6xl mb-4">ERROR</div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Oops! Something went wrong</h1>
                        <p className="text-gray-600 mb-4">We're having trouble loading the app.</p>
                        <div className="space-y-2">
                          <button
                            onClick={() => window.location.reload()}
                            className="bg-blue-500 text-white px-6 py-2 rounded-lg mr-2"
                          >
                            Try Again
                          </button>
                          <a 
                            href="/test.html"
                            className="bg-gray-500 text-white px-6 py-2 rounded-lg inline-block"
                          >
                            Diagnostic
                          </a>
                        </div>
                      </div>
                    </div>
                  )
                }
              })()}
            </Route>
            
            {/* Public Discovery */}
            <Route path="/discover">
              <div className="flex flex-col min-h-screen">
                <MainHeader showBalance={true} showNotifications={true} />
                <main className="flex-1 pb-20">
                  <DiscoverTab />
                </main>
                <BottomNavigation />
                <ScrollToTopButton />
              </div>
            </Route>
            
            {/* Debug Page Route */}
            <Route path="/debug">
              <div className="flex flex-col min-h-screen">
                <MainHeader showBalance={true} showNotifications={true} />
                <main className="flex-1 pb-20">
                  <DebugPage />
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
                <div className="flex flex-col min-h-screen">
                  <MainHeader showBalance={true} showNotifications={true} />
                  <main className="flex-1 pb-20">
                    <BetDetailPage betId={params.betId} />
                  </main>
                  <BottomNavigation />
                  <ScrollToTopButton />
                </div>
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
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                      Page Not Found
                    </h1>
                    <p className="text-gray-600 mb-4">
                      The page you're looking for doesn't exist.
                    </p>
                    <button
                      onClick={() => window.history.back()}
                      className="bg-blue-500 text-white px-6 py-2 rounded-lg"
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
          
          {/* Toast Notifications */}
          <ToastContainer />
        </div>
      </Router>
    </ErrorBoundary>
  )
}

export default App