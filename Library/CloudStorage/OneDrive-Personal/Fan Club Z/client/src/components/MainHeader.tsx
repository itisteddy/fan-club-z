import React from 'react'
import { Link } from 'wouter'
import { Bell, Coins, Wallet as WalletIcon } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useWalletStore } from '@/store/walletStore'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'

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

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between px-4 h-14">
        {/* Left side - Logo/Title */}
        <div className="flex items-center">
          <Link href="/discover">
            <div className="flex items-center space-x-2 p-2 -m-2 active:scale-95 transition-transform">
              <div className="w-8 h-8 bg-gradient-to-r from-primary to-primary-600 rounded-lg flex items-center justify-center shadow-sm">
                <span className="text-white font-bold text-lg">Z</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900">
                {title}
              </h1>
            </div>
          </Link>
        </div>

        {/* Right side - Balance & Notifications */}
        <div className="flex items-center space-x-2">
          {/* Balance - Always visible on mobile when user is authenticated */}
          {showBalance && user && (
            <Link href="/wallet">
              <Button variant="ghost" size="sm" className="relative px-3">
                <WalletIcon className="w-4 h-4 mr-1.5" />
                <span className="font-semibold">
                  {formatCurrency(balance, currency)}
                </span>
              </Button>
            </Link>
          )}

          {/* Notifications */}
          {showNotifications && user && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="relative w-10 h-10"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white" />
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}

export default MainHeader
