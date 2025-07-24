import React, { useEffect, useState } from 'react'
import { useLocation } from 'wouter'
import { 
  Search, 
  TrendingUp, 
  Users, 
  User,
  LogIn,
  Wallet
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'

interface NavItem {
  path: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  badge?: number
  requiresAuth?: boolean
}

interface BottomNavigationProps {
  activeTabOverride?: string // e.g., '/bets'
  className?: string
}

const navItems: NavItem[] = [
  {
    path: '/discover',
    icon: Search,
    label: 'Discover',
  },
  {
    path: '/bets',
    icon: TrendingUp,
    label: 'My Bets',
    requiresAuth: true,
  },
  {
    path: '/wallet',
    icon: Wallet,
    label: 'Wallet',
    requiresAuth: true,
  },
  {
    path: '/clubs',
    icon: Users,
    label: 'Clubs',
  },
  {
    path: '/profile',
    icon: User,
    label: 'Profile',
  },
]

export const BottomNavigation: React.FC<BottomNavigationProps> = ({ 
  activeTabOverride, 
  className 
}) => {
  const [location, setLocation] = useLocation()
  const { isAuthenticated, user } = useAuthStore()
  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)

  // Auto-hide on scroll down, show on scroll up (optional enhancement)
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      
      // Only hide/show if scrolled enough to avoid jittery behavior
      if (Math.abs(currentScrollY - lastScrollY) > 10) {
        setIsVisible(currentScrollY < lastScrollY || currentScrollY < 100)
        setLastScrollY(currentScrollY)
      }
    }

    // Uncomment the lines below to enable auto-hide on scroll
    // window.addEventListener('scroll', handleScroll, { passive: true })
    // return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY])

  // Function to handle navigation with scroll to top
  const handleNavigation = (path: string, event?: React.MouseEvent) => {
    // Prevent default behavior and stop propagation
    if (event) {
      event.preventDefault()
      event.stopPropagation()
    }
    
    // Only scroll to top if we're actually changing tabs
    if (location !== path) {
      // Smooth scroll to top
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' })
        
        // For mobile, also ensure the body scrolls to top
        document.body.scrollTop = 0
        document.documentElement.scrollTop = 0
      })
    }
    
    // Use setTimeout to ensure state update happens after current execution
    setTimeout(() => {
      setLocation(path)
    }, 0)
  }

  // Don't render on auth pages
  if (location.includes('/auth/') || location.includes('/onboarding')) {
    return null
  }

  return (
    <nav 
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300",
        isVisible ? "translate-y-0" : "translate-y-full",
        className
      )} 
      data-testid="bottom-navigation"
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Enhanced backdrop with better blur and border */}
      <div className="bg-white/90 backdrop-blur-xl border-t border-gray-200 shadow-lg">
        {/* Safe area for devices with home indicators */}
        <div 
          className="safe-area-inset"
          style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
        >
          {/* Navigation content */}
          <div className="flex justify-around items-center h-16 px-1">
          {navItems.map((item) => {
            // Special handling for authenticated tabs
            if (item.requiresAuth && !isAuthenticated) {
              return (
                <button 
                  key={item.path} 
                  onClick={(e) => handleNavigation('/auth/login', e)}
                  className={cn(
                  "flex flex-col items-center justify-center",
                  "min-w-10 min-h-12 p-1 rounded-xl",
                  "touch-manipulation transition-all duration-200",
                  "hover:bg-gray-100 active:bg-gray-200 active:scale-95",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                    "cursor-pointer select-none"
                )}
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                  data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}-login`}
                  aria-label={`Sign in to access ${item.label}`}
                >
                  <div className="relative mb-1">
                    <LogIn className="w-5 h-5 text-gray-400" />
                  </div>
                  <span className="text-xs font-medium text-gray-400">
                    {item.label}
                  </span>
                </button>
              )
            }

            // Special handling for profile tab
            if (item.path === '/profile' && !isAuthenticated) {
              return (
                <button 
                  key={item.path} 
                  onClick={(e) => handleNavigation('/auth/login', e)}
                  className={cn(
                  "flex flex-col items-center justify-center",
                  "min-w-10 min-h-12 p-1 rounded-xl",
                  "touch-manipulation transition-all duration-200",
                  "hover:bg-gray-100 active:bg-gray-200 active:scale-95",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                    "cursor-pointer select-none"
                )}
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                  data-testid="nav-sign-in"
                  aria-label="Sign In"
                >
                  <div className="relative mb-1">
                    <LogIn className="w-5 h-5 text-gray-500" />
                  </div>
                  <span className="text-xs font-medium text-gray-500">
                    Sign In
                  </span>
                </button>
              )
            }

            const Icon = item.icon
            // Use override if provided, else fallback to location
            const currentTab = activeTabOverride || location
            const isActive = currentTab === item.path || 
              (item.path !== '/discover' && currentTab.startsWith(item.path))
            
            // Show authenticated state for profile tab
            const showUserAvatar = item.path === '/profile' && isAuthenticated && user
            
            return (
              <button 
                key={item.path} 
                onClick={(e) => handleNavigation(item.path, e)}
                className={cn(
                  "flex flex-col items-center justify-center",
                  "min-w-10 min-h-12 p-1 rounded-xl",
                  "touch-manipulation transition-all duration-200",
                  "hover:bg-gray-100 active:bg-gray-200 active:scale-95",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                  "cursor-pointer select-none",
                  isActive && "bg-blue-50"
                )}
                style={{ WebkitTapHighlightColor: 'transparent' }}
                data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                aria-label={`Navigate to ${item.label}`}
                aria-current={isActive ? 'page' : undefined}
              >
                <div className="relative mb-1">
                  {showUserAvatar ? (
                    <div className={cn(
                      "w-5 h-5 rounded-full overflow-hidden ring-2 transition-all duration-200", 
                      isActive ? "ring-blue-500" : "ring-gray-300"
                    )}>
                      {user.profileImage ? (
                        <img 
                          src={user.profileImage} 
                          alt={user.firstName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-blue-500 flex items-center justify-center">
                          <span className="text-white text-xs font-medium">
                            {user.firstName?.[0]?.toUpperCase() || 'U'}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <Icon className={cn(
                      "w-5 h-5 transition-colors duration-200", 
                      isActive ? "text-blue-500" : "text-gray-500"
                    )} />
                  )}
                  {item.badge && (
                    <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-medium shadow-sm min-w-4">
                      {item.badge > 99 ? '99+' : item.badge}
                    </div>
                  )}
                </div>
                <span className={cn(
                  "text-xs font-medium transition-colors duration-200", 
                  isActive ? "text-blue-500" : "text-gray-500"
                )}>
                  {item.label}
                </span>
              </button>
            )
          })}
          </div>
        </div>
      </div>
      
      {/* Force hardware acceleration for smooth animations */}
      <style jsx>{`
        @media (prefers-reduced-motion: no-preference) {
          nav {
            transform: translateZ(0);
            will-change: transform;
          }
        }
      `}</style>
    </nav>
  )
}

export default BottomNavigation