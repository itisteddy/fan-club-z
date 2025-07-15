import React from 'react'
import { Link, useLocation } from 'wouter'
import { 
  Search, 
  TrendingUp, 
  Users, 
  User,
  LogIn
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

export const BottomNavigation: React.FC<BottomNavigationProps> = ({ activeTabOverride }) => {
  const [location, setLocation] = useLocation()
  const { isAuthenticated, user } = useAuthStore()

  console.log('📱 BottomNavigation rendering:', { isAuthenticated, user: user?.email, location, activeTabOverride })
  console.log('📱 BottomNavigation: Component is rendering at path:', location)

  // Function to handle navigation with scroll to top
  const handleNavigation = (path: string) => {
    console.log('📱 BottomNavigation: Navigating to', path)
    // Only scroll to top if we're actually changing tabs
    if (location !== path) {
      // Smooth scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' })
      
      // For mobile, also ensure the body scrolls to top
      document.body.scrollTop = 0
      document.documentElement.scrollTop = 0
    }
    
    setLocation(path)
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40" data-testid="bottom-navigation">
      {/* Enhanced backdrop with better blur and border */}
      <div className="bg-white/85 backdrop-blur-xl border-t border-gray-200 pb-safe shadow-lg">
        {/* Increased height and better touch targets */}
        <div className="flex justify-around items-center h-[76px] px-1">
          {navItems.map((item) => {
            // Special handling for profile tab
            if (item.path === '/profile' && !isAuthenticated) {
              return (
                <button 
                  key={item.path} 
                  onClick={() => handleNavigation('/auth/login')}
                  className="flex flex-col items-center justify-center min-w-[52px] min-h-[52px] rounded-xl touch-manipulation transition-all duration-200 hover:bg-gray-100 active:bg-gray-200 active:scale-95"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                  data-testid="nav-sign-in"
                  aria-label="Sign In"
                >
                  <div className="relative mb-1">
                    <LogIn className="w-7 h-7" />
                  </div>
                  <span className={cn("text-[11px] font-medium", "text-gray-500")}>
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
                onClick={() => handleNavigation(item.path)}
                className={cn(
                  "flex flex-col items-center justify-center min-w-[52px] min-h-[52px] rounded-xl touch-manipulation transition-all duration-200",
                  "hover:bg-gray-100 active:bg-gray-200 active:scale-95",
                  isActive && "bg-blue-50"
                )}
                style={{ WebkitTapHighlightColor: 'transparent' }}
                data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                aria-label={`Navigate to ${item.label}`}
              >
                <div className="relative mb-1">
                  {showUserAvatar ? (
                    <div className={cn(
                      "w-7 h-7 rounded-full overflow-hidden ring-2 transition-all duration-200", 
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
                          <span className="text-white text-sm font-medium">
                            {user.firstName?.[0]?.toUpperCase() || 'U'}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <Icon className={cn(
                      "w-7 h-7 transition-colors duration-200", 
                      isActive ? "text-blue-500" : "text-gray-500"
                    )} />
                  )}
                  {item.badge && (
                    <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium shadow-sm">
                      {item.badge > 99 ? '99+' : item.badge}
                    </div>
                  )}
                </div>
                <span className={cn(
                  "text-[11px] font-medium transition-colors duration-200", 
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
  )
}

export default BottomNavigation