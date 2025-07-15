import React, { useEffect, useState } from 'react'
import { Router, Route, Switch, Redirect } from 'wouter'
import { useAuthStore, initializeAuth } from './store/authStore'
import { useWalletStore } from './store/walletStore'
import { ToastContainer } from './hooks/use-toast'
import { useScrollToTop } from './hooks/use-scroll-to-top'
import { notificationService } from './services/notificationService'
import DebugPage from './components/DebugPage'
import { ComplianceManager } from './components/compliance'
import { OnboardingFlow } from './components/onboarding'

// Layout Components
import MainHeader from './components/MainHeader'
import BottomNavigation from './components/BottomNavigation'
import ScrollToTopButton from './components/ScrollToTopButton'

// Pages
import DiscoverTab from './pages/DiscoverTab'
import BetsTab from './pages/BetsTab'
import CreateBetTab from './pages/CreateBetTab'
import ClubsTab from './pages/ClubsTab'
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
  const [showCompliance, setShowCompliance] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [authInitialized, setAuthInitialized] = useState(false)
  const [initializing, setInitializing] = useState(true)

  // Initialize auth on app startup
  useEffect(() => {
    const initAuth = async () => {
      console.log('🚀 App: Initializing authentication...')
      setInitializing(true)
      try {
        await initializeAuth()
        console.log('✅ App: Authentication initialized')
      } catch (error) {
        console.error('❌ App: Auth initialization failed:', error)
      } finally {
        setAuthInitialized(true)
        setInitializing(false)
      }
    }
    
    initAuth()
  }, [])

  // Enable automatic scroll to top on route changes
  useScrollToTop()

  // Add debugging
  console.log('🎯 App rendering...', { 
    user: user?.email, 
    isAuthenticated, 
    showCompliance, 
    authInitialized,
    initializing,
    currentPath: typeof window !== 'undefined' ? window.location.pathname : 'unknown'
  })

  // Check compliance status when user is authenticated
  useEffect(() => {
    console.log('🎯 App: Compliance check triggered', { 
      isAuthenticated, 
      userEmail: user?.email, 
      showCompliance, 
      showOnboarding,
      search: window.location.search,
      sessionStorage: sessionStorage.getItem('force_onboarding'),
      complianceStatus: localStorage.getItem('compliance_status')
    })
    
    if (isAuthenticated && user && authInitialized) {
      // Check if we should show onboarding flow instead of auto-skip
      // This needs to be checked AFTER authentication to respect query params
      const shouldShowOnboarding = window.location.search.includes('onboarding=true') ||
                                   window.location.search.includes('test-onboarding') ||
                                   window.location.search.includes('show-onboarding') ||
                                   sessionStorage.getItem('force_onboarding') === 'true'
      
      console.log('🎯 App: shouldShowOnboarding decision', { 
        shouldShowOnboarding, 
        search: window.location.search, 
        sessionForceOnboarding: sessionStorage.getItem('force_onboarding'),
        hasComplianceStatus: !!localStorage.getItem('compliance_status')
      })
      
      // For demo users, either show onboarding or auto-skip
      if (user.email === 'demo@fanclubz.app' || user.id === 'demo-user-id') {
        if (shouldShowOnboarding) {
          console.log('🎯 Demo user detected, showing compliance flow for testing')
          console.log('🎯 Setting showCompliance=true, showOnboarding=false')
          setShowCompliance(true)  // Use ComplianceManager instead of OnboardingFlow
          setShowOnboarding(false)
          // Clear any existing compliance to force the flow
          localStorage.removeItem('compliance_status')
          console.log('🎯 Cleared compliance status to force onboarding')
          return
        } else {
          console.log('🎯 Demo user detected, auto-skipping compliance')
          setShowCompliance(false)
          setShowOnboarding(false)
          // Ensure compliance status is set for demo user
          const complianceStatus = {
            ageVerified: true,
            privacyAccepted: true,
            termsAccepted: true,
            responsibleGamblingAcknowledged: true,
            completedAt: new Date().toISOString()
          }
          localStorage.setItem('compliance_status', JSON.stringify(complianceStatus))
          console.log('🎯 App: Set compliance status for demo user')
          return
        }
      }
      
      // For test environment, only auto-skip if compliance was already completed
      const isTestEnvironment = window.navigator.userAgent.includes('playwright') || 
                               window.navigator.userAgent.includes('Playwright') ||
                               typeof window.navigator.webdriver !== 'undefined' ||
                               window.location.search.includes('test')
      
      if (isTestEnvironment) {
        const existingCompliance = localStorage.getItem('compliance_status')
        if (existingCompliance) {
          try {
            const status = JSON.parse(existingCompliance)
            const isCompliant = status.ageVerified && status.privacyAccepted && 
                               status.termsAccepted && status.responsibleGamblingAcknowledged
            if (isCompliant) {
              console.log('🎯 Test environment detected, compliance already complete, skipping')
              setShowCompliance(false)
              setShowOnboarding(false)
              return
            }
          } catch (error) {
            console.error('Error parsing test compliance status:', error)
          }
        }
        console.log('🎯 Test environment detected, but no compliance status - showing compliance flow')
        // Fall through to normal compliance check
      }
      
      const complianceStatus = localStorage.getItem('compliance_status')
      if (!complianceStatus) {
        console.log('🎯 App: No compliance status found, showing compliance')
        setShowCompliance(true)
      } else {
        try {
          const status = JSON.parse(complianceStatus)
          const isCompliant = status.ageVerified && status.privacyAccepted && 
                             status.termsAccepted && status.responsibleGamblingAcknowledged
          console.log('🎯 App: Compliance status parsed', { isCompliant, status })
          if (!isCompliant) {
            setShowCompliance(true)
          } else {
            setShowCompliance(false)
          }
        } catch (error) {
          console.error('Error parsing compliance status:', error)
          setShowCompliance(true)
        }
      }
    } else {
      // If not authenticated, don't show compliance or onboarding
      console.log('🎯 App: Not authenticated, hiding compliance and onboarding')
      setShowCompliance(false)
      setShowOnboarding(false)
    }
  }, [isAuthenticated, user, authInitialized])

  // Force re-evaluation of compliance state when URL changes and we have onboarding params
  useEffect(() => {
    const handleLocationChange = () => {
      const shouldShowOnboarding = window.location.search.includes('onboarding=true') ||
                                   window.location.search.includes('test-onboarding') ||
                                   window.location.search.includes('show-onboarding') ||
                                   sessionStorage.getItem('force_onboarding') === 'true'
      
      console.log('🔄 Location change detected', {
        pathname: window.location.pathname,
        search: window.location.search,
        shouldShowOnboarding,
        isAuthenticated,
        userEmail: user?.email
      })
      
      // Force compliance check if we have onboarding params and are authenticated
      if (isAuthenticated && user && shouldShowOnboarding && (user.email === 'demo@fanclubz.app' || user.id === 'demo-user-id')) {
        console.log('🔄 Forcing compliance state due to location change with onboarding params')
        setShowCompliance(true)
        setShowOnboarding(false)
        localStorage.removeItem('compliance_status')
      }
    }
    
    // Listen for popstate events (browser navigation)
    window.addEventListener('popstate', handleLocationChange)
    
    // Check immediately in case we just navigated
    handleLocationChange()
    
    return () => {
      window.removeEventListener('popstate', handleLocationChange)
    }
  }, [isAuthenticated, user])

  // Failsafe: Force hide compliance for demo users after a delay (unless showing onboarding)
  useEffect(() => {
    if (isAuthenticated && user && (user.email === 'demo@fanclubz.app' || user.id === 'demo-user-id')) {
      const shouldShowOnboarding = window.location.search.includes('onboarding=true') ||
                                   window.location.search.includes('test-onboarding') ||
                                   window.location.search.includes('show-onboarding')
      
      if (!shouldShowOnboarding) {
        const timer = setTimeout(() => {
          if (showCompliance) {
            console.log('🎯 App: Failsafe triggered - forcing compliance off for demo user')
            setShowCompliance(false)
          }
          if (showOnboarding) {
            console.log('🎯 App: Failsafe triggered - forcing onboarding off for demo user')
            setShowOnboarding(false)
          }
        }, 1000)
        
        return () => clearTimeout(timer)
      }
    }
  }, [isAuthenticated, user, showCompliance, showOnboarding])

  // Refresh wallet balance when user logs in
  useEffect(() => {
    if (user) {
      const { refreshBalance } = useWalletStore.getState()
      refreshBalance(user.id)
      
      // Initialize notifications for demo users
      if (user.email === 'demo@fanclubz.app' || user.id === 'demo-user-id') {
        console.log('🔔 Initializing notifications for demo user')
        notificationService.initializeDemoNotifications()
        notificationService.connect()
      }
    }
  }, [user?.id])

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
    console.log('🔒 ProtectedRoute check:', { isAuthenticated, user: user?.email })
    
    if (!isAuthenticated) {
      console.log('🔒 ProtectedRoute: Not authenticated, redirecting to login')
      return <Redirect to="/auth/login" />
    }
    
    console.log('🔒 ProtectedRoute: Authenticated, rendering protected content')
    return <>{children}</>
  }

  // Public Route Component (FIXED: Only redirect if fully authenticated and initialized)
  const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Only redirect if auth is fully initialized and user is authenticated
    if (authInitialized && isAuthenticated && !showCompliance && !showOnboarding) {
      console.log('🔓 PublicRoute: User is authenticated, redirecting to /discover')
      return <Redirect to="/discover" />
    }
    console.log('🔓 PublicRoute: Showing public content')
    return <>{children}</>
  }

  return (
    <ErrorBoundary>
      <Router>
        <div className="min-h-screen bg-gray-50">
          {showCompliance ? (
            <ComplianceManager
              onComplete={() => {
                console.log('🎯 ComplianceManager onComplete called')
                setShowCompliance(false)
              }}
            />
          ) : showOnboarding ? (
            <OnboardingFlow
              onComplete={() => {
                console.log('🎯 OnboardingFlow onComplete called')
                setShowOnboarding(false)
              }}
            />
          ) : (
            <>
          {console.log('🎯 App: Rendering main app, user:', user?.email, 'showCompliance:', showCompliance, 'isAuthenticated:', isAuthenticated, 'location:', typeof window !== 'undefined' ? window.location.pathname : 'unknown')}

          {/* Demo Mode Banner */}
          {user && (user.email === 'demo@fanclubz.app' || user.id === 'demo-user-id') && (
            <div className="w-full bg-yellow-100 text-yellow-800 text-center py-2 text-sm font-medium z-50">
              Demo mode: Likes, comments, and bets are not saved.
            </div>
          )}
          <Switch>
            {/* Auth Routes - FIXED: Show login page properly */}
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
            {/* Default redirect - FIXED: Only redirect after auth is initialized */}
            <Route path="/">
              {console.log('🎯 App: Root route accessed, isAuthenticated:', isAuthenticated, 'authInitialized:', authInitialized)}
              {authInitialized ? (
                isAuthenticated ? <Redirect to="/discover" /> : <Redirect to="/auth/login" />
              ) : (
                <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-white text-2xl font-bold">Z</span>
                    </div>
                    <div className="text-lg font-semibold text-gray-900 mb-2">Loading...</div>
                  </div>
                </div>
              )}
            </Route>
            {/* Public Discovery (no auth required) */}
            <Route path="/discover">
              {console.log('🎯 App: Rendering DiscoverTab route')}
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
                </main>
                <BottomNavigation />
                <ScrollToTopButton />
              </div>
            </Route>
          </Switch>
          {/* Toast Notifications */}
          <ToastContainer />
            </>
          )}
        </div>
      </Router>
    </ErrorBoundary>
  )
}

export default App