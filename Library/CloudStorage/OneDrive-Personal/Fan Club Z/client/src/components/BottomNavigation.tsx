import React from 'react'
import { Link, useLocation } from 'wouter'
import { 
  Search, 
  TrendingUp, 
  Plus, 
  Users, 
  Wallet, 
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
    path: '/create',
    icon: Plus,
    label: 'Create',
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
      <div className="bg-white/75 backdrop-blur-xl border-t border-gray-100 pb-safe">
        <div className="flex justify-around items-center h-[49px] px-2">
          {navItems.map((item) => {
            // Special handling for profile tab
            if (item.path === '/profile' && !isAuthenticated) {
              return (
                <button 
                  key={item.path} 
                  onClick={() => handleNavigation('/auth/login')}
                  className="flex flex-col items-center justify-center min-w-[64px] h-full touch-manipulation"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                    <div className="relative">
                      <LogIn className="w-6 h-6" />
                    </div>
                    <span className={cn("text-[10px]", "text-gray-400")}>
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
                className="flex flex-col items-center justify-center min-w-[64px] h-full touch-manipulation"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                  <div className="relative">
                    {showUserAvatar ? (
                      <div className={cn("w-6 h-6 rounded-full overflow-hidden ring-2 transition-all duration-200", isActive ? "ring-primary" : "ring-gray-300")}>
                        {user.profileImage ? (
                          <img 
                            src={user.profileImage} 
                            alt={user.firstName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-primary flex items-center justify-center">
                            <span className="text-white text-xs font-medium">
                              {user.firstName?.[0]?.toUpperCase() || 'U'}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <Icon className={cn("w-6 h-6 mb-1", isActive ? "text-blue-500" : "text-gray-400")} />
                    )}
                    {item.badge && (
                      <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                        {item.badge > 99 ? '99+' : item.badge}
                      </div>
                    )}
                  </div>
                  <span className={cn("text-[10px]", isActive ? "text-blue-500" : "text-gray-400")}>
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
