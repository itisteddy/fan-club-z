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

export const BottomNavigation: React.FC = () => {
  const [location] = useLocation()
  const { isAuthenticated, user } = useAuthStore()

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 safe-area-inset">
      <div className="bg-white border-t border-gray-200">
        <div className="flex items-center justify-around px-1 py-2">
          {navItems.map((item) => {
            // Special handling for profile tab
            if (item.path === '/profile' && !isAuthenticated) {
              return (
                <Link key={item.path} href="/auth/login">
                  <div className="flex flex-col items-center justify-center px-3 py-2 min-w-[64px] min-h-[56px] rounded-lg transition-all duration-200 text-gray-500 hover:text-gray-700 active:scale-95">
                    <div className="relative">
                      <LogIn className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-medium mt-1">
                      Sign In
                    </span>
                  </div>
                </Link>
              )
            }

            const Icon = item.icon
            const isActive = location === item.path || 
              (item.path !== '/discover' && location.startsWith(item.path))
            
            // Show authenticated state for profile tab
            const showUserAvatar = item.path === '/profile' && isAuthenticated && user
            
            return (
              <Link key={item.path} href={item.path}>
                <div className={cn(
                  "flex flex-col items-center justify-center px-3 py-2 min-w-[64px] min-h-[56px] rounded-lg transition-all duration-200",
                  isActive 
                    ? "text-primary bg-primary/10" 
                    : "text-gray-500 hover:text-gray-700 active:scale-95"
                )}>
                  <div className="relative">
                    {showUserAvatar ? (
                      <div className={cn(
                        "w-6 h-6 rounded-full overflow-hidden ring-2 transition-all duration-200",
                        isActive ? "ring-primary" : "ring-gray-300"
                      )}>
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
                      <Icon className={cn(
                        "w-6 h-6 transition-transform duration-200",
                        isActive && "scale-110"
                      )} />
                    )}
                    {item.badge && (
                      <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                        {item.badge > 99 ? '99+' : item.badge}
                      </div>
                    )}
                  </div>
                  <span className={cn(
                    "text-xs font-medium mt-1 transition-all duration-200",
                    isActive ? "text-primary" : "text-gray-500"
                  )}>
                    {item.label}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default BottomNavigation
