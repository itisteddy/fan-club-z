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
    <div className="flex-1 bg-gray-50 min-h-screen">
      {/* Cover Photo */}
      <div className="h-32 bg-gradient-to-r from-primary to-primary-600 relative">
        <div className="absolute inset-0 bg-black/20"></div>
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 text-white hover:bg-white/20"
        >
          <Settings className="w-5 h-5" />
        </Button>
      </div>

      <div className="px-4 pb-20">
        {/* Profile Header */}
        <div className="relative -mt-16 mb-6">
          <div className="flex items-end space-x-4">
            {/* Profile Picture */}
            <div className="relative">
              {user.profileImage ? (
                <img
                  src={user.profileImage}
                  alt={user.firstName}
                  className="w-24 h-24 rounded-full border-4 border-white object-cover shadow-lg"
                />
              ) : (
                <div className="w-24 h-24 rounded-full border-4 border-white bg-primary flex items-center justify-center shadow-lg">
                  <span className="text-white text-2xl font-bold">
                    {user.firstName?.[0]?.toUpperCase() || 'U'}
                  </span>
                </div>
              )}
              <Button
                size="icon"
                variant="secondary"
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full shadow-md"
              >
                <Edit3 className="w-4 h-4" />
              </Button>
            </div>

            {/* Profile Info */}
            <div className="flex-1 pb-2">
              <h1 className="text-2xl font-bold text-gray-900">
                {user.firstName} {user.lastName}
              </h1>
              <p className="text-gray-600">@{user.username}</p>
              {user.bio && (
                <p className="text-sm text-gray-600 mt-1">{user.bio}</p>
              )}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {stats.map((stat, index) => {
            const Icon = stat.icon
            return (
              <Card key={index}>
                <CardContent className="p-4 text-center">
                  <Icon className={`w-6 h-6 ${stat.color} mx-auto mb-2`} />
                  <div className="text-xl font-bold text-gray-900">{stat.value}</div>
                  <div className="text-sm text-gray-600">{stat.label}</div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <div className="space-y-4">
              {/* Wallet Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span>Wallet</span>
                    <Link href="/wallet">
                      <ArrowRight className="w-5 h-5 text-gray-400" />
                    </Link>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Link href="/wallet">
                    <div className="bg-gradient-to-r from-primary to-primary-600 rounded-xl p-6 text-white">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm opacity-90">Available Balance</span>
                        <WalletIcon className="w-5 h-5 opacity-80" />
                      </div>
                      <div className="text-3xl font-bold mb-1">
                        {formatCurrency(balance, currency)}
                      </div>
                      <div className="text-sm opacity-80">
                        Tap to manage wallet
                      </div>
                    </div>
                  </Link>
                </CardContent>
              </Card>

              {/* Account Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Account Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">First Name</label>
                      <p className="text-gray-900">{user.firstName}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Last Name</label>
                      <p className="text-gray-900">{user.lastName}</p>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Email</label>
                    <p className="text-gray-900">{user.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Phone</label>
                    <p className="text-gray-900">{user.phone}</p>
                  </div>
                  <Button variant="outline" className="w-full">
                    <Edit3 className="w-4 h-4 mr-2" />
                    Edit Profile
                  </Button>
                </CardContent>
              </Card>

              {/* Verification Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Verification Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Email Verification</span>
                      <span className="text-green-600 font-medium text-sm">Verified</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Phone Verification</span>
                      <span className="text-green-600 font-medium text-sm">Verified</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">KYC Level</span>
                      <span className="text-blue-600 font-medium text-sm capitalize">
                        {user.kycLevel}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="activity">
            <div className="space-y-4">
              {/* Recent Bets */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-gray-500">
                    <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No recent activity</p>
                    <p className="text-sm">Your betting activity will appear here</p>
                  </div>
                </CardContent>
              </Card>

              {/* Achievements */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Achievements</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-gray-500">
                    <Trophy className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No achievements yet</p>
                    <p className="text-sm">Start betting to unlock achievements</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="settings">
            <div className="space-y-4">
              {/* Account Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Account Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <button className="flex items-center justify-between w-full p-3 text-left hover:bg-gray-50 rounded-lg transition-colors">
                    <div className="flex items-center space-x-3">
                      <Shield className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="font-medium">Security</p>
                        <p className="text-sm text-gray-500">Password & 2FA</p>
                      </div>
                    </div>
                    <span className="text-gray-400">›</span>
                  </button>

                  <button className="flex items-center justify-between w-full p-3 text-left hover:bg-gray-50 rounded-lg transition-colors">
                    <div className="flex items-center space-x-3">
                      <Bell className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="font-medium">Notifications</p>
                        <p className="text-sm text-gray-500">Manage preferences</p>
                      </div>
                    </div>
                    <span className="text-gray-400">›</span>
                  </button>

                  <Link href="/wallet">
                    <button className="flex items-center justify-between w-full p-3 text-left hover:bg-gray-50 rounded-lg transition-colors">
                      <div className="flex items-center space-x-3">
                        <WalletIcon className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="font-medium">Wallet & Payments</p>
                          <p className="text-sm text-gray-500">Balance & transactions</p>
                        </div>
                      </div>
                      <span className="text-gray-400">›</span>
                    </button>
                  </Link>
                </CardContent>
              </Card>

              {/* Support */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Support</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <button className="flex items-center justify-between w-full p-3 text-left hover:bg-gray-50 rounded-lg transition-colors">
                    <div className="flex items-center space-x-3">
                      <HelpCircle className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="font-medium">Help Center</p>
                        <p className="text-sm text-gray-500">FAQ & guides</p>
                      </div>
                    </div>
                    <span className="text-gray-400">›</span>
                  </button>
                </CardContent>
              </Card>

              {/* Logout */}
              <Card>
                <CardContent className="p-4">
                  <Button
                    onClick={logout}
                    variant="destructive"
                    className="w-full"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default ProfilePage
