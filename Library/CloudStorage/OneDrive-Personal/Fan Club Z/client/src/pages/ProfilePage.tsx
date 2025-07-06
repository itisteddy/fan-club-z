import React, { useState } from 'react'
import { 
  Settings, 
  Edit3, 
  Trophy, 
  TrendingUp, 
  Users, 
  Star, 
  LogOut,
  Shield,
  Bell,
  CreditCard,
  HelpCircle,
  Wallet as WalletIcon,
  ArrowRight
} from 'lucide-react'
import { Link } from 'wouter'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useAuthStore } from '@/store/authStore'
import { useWalletStore } from '@/store/walletStore'
import { formatCurrency } from '@/lib/utils'

export const ProfilePage: React.FC = () => {
  const { user, logout } = useAuthStore()
  const { balance, currency } = useWalletStore()
  const [activeTab, setActiveTab] = useState('profile')

  if (!user) return null

  const stats = [
    { label: 'Total Bets', value: '24', icon: TrendingUp, color: 'text-blue-600' },
    { label: 'Win Rate', value: '68%', icon: Trophy, color: 'text-green-600' },
    { label: 'Clubs Joined', value: '3', icon: Users, color: 'text-purple-600' },
    { label: 'Reputation', value: '4.8', icon: Star, color: 'text-yellow-600' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Large Title Navigation */}
      <header className="sticky top-0 z-40">
        <div className="bg-white/80 backdrop-blur-md border-b border-gray-100">
          <div className="px-4 pt-12 pb-2">
            <h1 className="text-display font-bold">Profile</h1>
          </div>
        </div>
      </header>

      <div className="px-4 pb-24">
        {/* Profile Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center space-x-4">
            {/* Profile Picture */}
            <div className="relative">
              {user.profileImage ? (
                <img
                  src={user.profileImage}
                  alt={user.firstName}
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-blue-500 flex items-center justify-center">
                  <span className="text-white text-2xl font-bold">
                    {user.firstName?.[0]?.toUpperCase() || 'U'}
                  </span>
                </div>
              )}
              <Button
                size="icon"
                variant="apple-secondary"
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full shadow-sm"
              >
                <Edit3 className="w-4 h-4" />
              </Button>
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              <h2 className="text-title-2 font-bold text-gray-900">
                {user.firstName} {user.lastName}
              </h2>
              <p className="text-body text-gray-500">@{user.username}</p>
              {user.bio && (
                <p className="text-body-sm text-gray-600 mt-1">{user.bio}</p>
              )}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon
            return (
              <div key={index} className="bg-white rounded-xl shadow-sm p-4 text-center">
                <Icon className={`w-6 h-6 ${stat.color} mx-auto mb-2`} />
                <div className="text-title-3 font-bold text-gray-900">{stat.value}</div>
                <div className="text-body-sm text-gray-500">{stat.label}</div>
              </div>
            )
          })}
        </div>

        {/* Wallet Card */}
        <div className="bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl p-6 text-white mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-body opacity-90">Available Balance</span>
            <WalletIcon className="w-5 h-5 opacity-80" />
          </div>
          <div className="text-title-1 font-bold mb-1">
            {formatCurrency(balance, currency)}
          </div>
          <div className="text-body-sm opacity-80">
            Tap to manage wallet
          </div>
        </div>

        {/* Settings List */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-100">
            {/* Account Settings */}
            <div className="p-4">
              <h3 className="text-title-3 font-semibold text-gray-900 mb-4">Account</h3>
              <div className="space-y-3">
                <button className="flex items-center justify-between w-full p-3 rounded-[10px] hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Edit3 className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="text-body text-gray-900">Edit Profile</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </button>
                
                <button className="flex items-center justify-between w-full p-3 rounded-[10px] hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <Shield className="w-4 h-4 text-green-600" />
                    </div>
                    <span className="text-body text-gray-900">Security</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </button>
                
                <button className="flex items-center justify-between w-full p-3 rounded-[10px] hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Bell className="w-4 h-4 text-purple-600" />
                    </div>
                    <span className="text-body text-gray-900">Notifications</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>

            {/* Financial */}
            <div className="p-4">
              <h3 className="text-title-3 font-semibold text-gray-900 mb-4">Financial</h3>
              <div className="space-y-3">
                <button className="flex items-center justify-between w-full p-3 rounded-[10px] hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                      <CreditCard className="w-4 h-4 text-orange-600" />
                    </div>
                    <span className="text-body text-gray-900">Payment Methods</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </button>
                
                <button className="flex items-center justify-between w-full p-3 rounded-[10px] hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-indigo-600" />
                    </div>
                    <span className="text-body text-gray-900">Transaction History</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>

            {/* Support */}
            <div className="p-4">
              <h3 className="text-title-3 font-semibold text-gray-900 mb-4">Support</h3>
              <div className="space-y-3">
                <button className="flex items-center justify-between w-full p-3 rounded-[10px] hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                      <HelpCircle className="w-4 h-4 text-gray-600" />
                    </div>
                    <span className="text-body text-gray-900">Help & Support</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>

            {/* Logout */}
            <div className="p-4">
              <button 
                onClick={logout}
                className="flex items-center justify-center w-full p-3 rounded-[10px] bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
              >
                <LogOut className="w-4 h-4 mr-2" />
                <span className="text-body font-medium">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProfilePage
