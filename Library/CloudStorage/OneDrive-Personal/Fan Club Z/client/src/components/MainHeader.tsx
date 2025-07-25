import React, { useState } from 'react'
import { Link, useLocation } from 'wouter'
import { Bell, Coins, Wallet as WalletIcon } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useWalletStore } from '@/store/walletStore'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useUnreadNotifications } from '@/hooks/use-notifications'
import NotificationCenter from './NotificationCenter'

interface MainHeaderProps {
  title?: string
  showBalance?: boolean
  showNotifications?: boolean
}

export const MainHeader: React.FC<MainHeaderProps> = ({
  title = 'Fan Club Z',
  showBalance = true,
  showNotifications = true,
}) => {
  const { user } = useAuthStore()
  const { balance, currency } = useWalletStore()
  const [showNotificationCenter, setShowNotificationCenter] = useState(false)
  const [location, setLocation] = useLocation()
  const unreadCount = useUnreadNotifications()

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between px-4 h-14">
        {/* Left side - Logo/Title */}
        <div className="flex items-center flex-1 min-w-0">
          <Link href="/discover">
            <div className="flex items-center space-x-3 p-2 -m-2 active:scale-95 transition-transform">
              <div className="w-8 h-8 bg-gradient-to-r from-primary to-primary-600 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                <span className="text-white font-bold text-lg leading-none">Z</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900 leading-none whitespace-nowrap">
                {title}
              </h1>
            </div>
          </Link>
        </div>

        {/* Right side - Balance & Notifications */}
        <div className="flex items-center space-x-1 flex-shrink-0">
          {/* Balance - Always visible on mobile when user is authenticated */}
          {showBalance && user && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="relative px-2 hover:bg-gray-100 transition-colors cursor-pointer"
              onClick={async (e) => {
                e.preventDefault()
                e.stopPropagation()
                
                console.log('💰 MainHeader: Wallet button clicked')
                
                // Navigate to wallet using wouter
                setTimeout(() => {
                  setLocation('/wallet')
                }, 0)
                
                // Don't refresh balance on click - let the wallet page handle it
              }}
            >
              <WalletIcon className="w-4 h-4 mr-1" />
              <span className="font-semibold text-sm">
                {formatCurrency(balance, currency)}
              </span>
            </Button>
          )}

          {/* Notifications */}
          {showNotifications && user && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="relative w-9 h-9"
              onClick={() => setShowNotificationCenter(true)}
              data-testid="notification-bell"
              aria-label="Open notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span 
                  className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white text-xs text-white flex items-center justify-center font-medium"
                  data-testid="notification-badge"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Notification Center */}
      <NotificationCenter 
        isOpen={showNotificationCenter}
        onClose={() => setShowNotificationCenter(false)}
      />
    </header>
  )
}

export default MainHeader
