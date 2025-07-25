import React, { useState, useEffect, useCallback } from 'react'
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
import { Link, useLocation } from 'wouter'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PullToRefreshIndicator } from '@/components/ui/PullToRefreshIndicator'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useAuthStore } from '@/store/authStore'
import { useWalletStore } from '@/store/walletStore'
import { useStatsStore } from '@/store/statsStore'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'
import { formatCurrency } from '@/lib/utils'
import { KYCStatus } from '../components/kyc/KYCStatus'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { ComplianceManager } from '../components/compliance/ComplianceManager'
import { SecuritySettings } from '../components/profile/SecuritySettings'
import { NotificationSettings } from '../components/profile/NotificationSettings'
import { PaymentMethods } from '../components/profile/PaymentMethods'
import { TransactionHistory } from '../components/profile/TransactionHistory'
import { HelpSupport } from '../components/profile/HelpSupport'
import NotificationTest from '../components/NotificationTest'

export const ProfilePage: React.FC = () => {
  const { user, logout, updateUser } = useAuthStore()
  const { balance, currency } = useWalletStore()
  const { stats, loading: statsLoading, fetchStats } = useStatsStore()
  const [activeTab, setActiveTab] = useState('profile')
  const [editOpen, setEditOpen] = useState(false)
  const [securityOpen, setSecurityOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [paymentMethodsOpen, setPaymentMethodsOpen] = useState(false)
  const [transactionHistoryOpen, setTransactionHistoryOpen] = useState(false)
  const [helpSupportOpen, setHelpSupportOpen] = useState(false)
  const [editData, setEditData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    bio: user?.bio || '',
    dateOfBirth: user?.dateOfBirth ? user.dateOfBirth.slice(0, 10) : ''
  })
  const [saving, setSaving] = useState(false)
  const { success: showSuccess, error: showError } = useToast()
  const [, setLocation] = useLocation()
  const [showCompliance, setShowCompliance] = useState(false)

  // Pull-to-refresh functionality
  const handleRefresh = useCallback(async () => {
    console.log('🔄 Refreshing profile data...')
    if (user?.id) {
      await fetchStats(user.id).catch(error => {
        console.error('❌ Failed to refresh stats:', error)
      })
    }
    // Add a small delay for better UX
    await new Promise(resolve => setTimeout(resolve, 500))
  }, [user?.id, fetchStats])

  const { containerRef, isRefreshing, pullDistance, isPulling } = usePullToRefresh(handleRefresh)

  // Fetch stats when component mounts
  useEffect(() => {
    if (user?.id) {
      console.log('📈 ProfilePage: Fetching stats for user:', user.id)
      fetchStats(user.id).catch(error => {
        console.error('❌ ProfilePage: Failed to fetch stats:', error)
        // Continue without stats - don't block the UI
      })
    }
  }, [user?.id, fetchStats])

  useEffect(() => {
    if (editOpen) {
      setTimeout(() => {
        const dobInput = document.getElementById('dob-input') as HTMLInputElement | null
        if (dobInput) dobInput.focus()
      }, 300)
    }
  }, [editOpen])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('edit') === '1') {
        setEditOpen(true)
      }
    }
  }, [])

  console.log('👤 ProfilePage: Current user:', user)
  console.log('📊 ProfilePage: Stats loading:', statsLoading, 'Stats:', stats)
  console.log('💰 ProfilePage: Wallet balance:', balance, 'Currency:', currency)
  
  if (!user) {
    console.log('❌ ProfilePage: No user found, returning null')
    return null
  }

  // Calculate stats with fallbacks and proper calculations
  const totalBets = stats?.totalBets || 0
  const wonBets = stats?.wonBets || 0
  const totalWinnings = stats?.totalWinnings || 0
  const totalStaked = stats?.totalStaked || 0
  const netProfit = totalWinnings - totalStaked
  const winRate = totalBets > 0 ? (wonBets / totalBets) * 100 : 0
  
  const calculatedStats = [
    { 
      label: 'Total Bets', 
      value: totalBets.toString(), 
      icon: TrendingUp, 
      color: 'text-blue-600' 
    },
    { 
      label: 'Win Rate', 
      value: `${winRate.toFixed(1)}%`, 
      icon: Trophy, 
      color: winRate >= 50 ? 'text-green-600' : 'text-orange-600' 
    },
    { 
      label: 'Total Winnings', 
      value: formatCurrency(totalWinnings, currency), 
      icon: WalletIcon, 
      color: 'text-green-600' 
    },
    { 
      label: 'Net Profit', 
      value: formatCurrency(netProfit, currency), 
      icon: TrendingUp, 
      color: netProfit >= 0 ? 'text-green-600' : 'text-red-600' 
    },
  ]

  // Compliance re-check function
  const checkCompliance = () => {
    console.log('🔍 Checking compliance after profile update')
    console.log('🔍 Current user:', user)
    console.log('🔍 Edit data:', editData)
    // Check if user is compliant (age, etc.)
    if (editData.dateOfBirth) {
      const dob = new Date(editData.dateOfBirth)
      const age = new Date().getFullYear() - dob.getFullYear()
      console.log('🔍 Calculated age:', age)
      if (age >= 18) {
        console.log('✅ User is 18+, closing compliance modal')
        setShowCompliance(false)
        setTimeout(() => setLocation('/discover'), 300)
        return true
      }
    }
    console.log('❌ User not compliant, showing compliance modal')
    setShowCompliance(true)
    return false
  }

  return (
    <div ref={containerRef} className="min-h-screen bg-gray-50 relative">
      {/* Pull-to-refresh indicator */}
      <PullToRefreshIndicator 
        isRefreshing={isRefreshing}
        isPulling={isPulling}
        pullDistance={pullDistance}
      />
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
              <p className="text-body-sm text-gray-500">{user.email}</p>
              {user.bio && (
                <p className="text-body-sm text-gray-600 mt-1">{user.bio}</p>
              )}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {calculatedStats.map((stat, index) => {
            const Icon = stat.icon
            return (
              <div 
                key={index} 
                className="bg-white rounded-xl shadow-sm p-4 text-center"
                data-testid="stat-card"
              >
                <Icon className={`w-6 h-6 ${stat.color} mx-auto mb-2`} />
                <div className="text-title-3 font-bold text-gray-900">{stat.value}</div>
                <div className="text-body-sm text-gray-500">{stat.label}</div>
              </div>
            )
          })}
        </div>

        {/* Wallet Card */}
        <div className="bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl p-6 text-white mb-6">
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

        {/* KYC Status */}
        <div className="mb-6">
          <KYCStatus userId={user.id} />
        </div>

        {/* Notification Testing - Only for demo users */}
        {(user.email === 'demo@fanclubz.app' || user.id === 'demo-user-id') && (
          <div className="mb-6">
            <NotificationTest />
          </div>
        )}

        {/* Settings List */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-100">
            {/* Quick Actions */}
            <div className="p-4">
              <h3 className="text-title-3 font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button 
                  onClick={() => setEditOpen(true)}
                  className="flex items-center justify-between w-full p-3 rounded-[10px] hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Edit3 className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="text-body text-gray-900">Edit Profile</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </button>
                
                <Link href="/settings">
                  <button 
                    className="flex items-center justify-between w-full p-3 rounded-[10px] hover:bg-gray-50 transition-colors"
                    data-testid="access-settings"
                    aria-label="Access Settings and Preferences"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Settings className="w-4 h-4 text-gray-600" />
                      </div>
                      <span className="text-body text-gray-900">Settings & Preferences</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                  </button>
                </Link>
              </div>
            </div>
            
            {/* Account Settings */}
            <div className="p-4">
              <h3 className="text-title-3 font-semibold text-gray-900 mb-4">Account</h3>
              <div className="space-y-3">
                
                <button 
                  onClick={() => setSecurityOpen(true)}
                  className="flex items-center justify-between w-full p-3 rounded-[10px] hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <Shield className="w-4 h-4 text-green-600" />
                    </div>
                    <span className="text-body text-gray-900">Security</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>

            {/* Financial */}
            <div className="p-4">
              <h3 className="text-title-3 font-semibold text-gray-900 mb-4">Financial</h3>
              <div className="space-y-3">
                <button 
                  onClick={() => setPaymentMethodsOpen(true)}
                  className="flex items-center justify-between w-full p-3 rounded-[10px] hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                      <CreditCard className="w-4 h-4 text-orange-600" />
                    </div>
                    <span className="text-body text-gray-900">Payment Methods</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </button>
                
                <button 
                  onClick={() => setTransactionHistoryOpen(true)}
                  className="flex items-center justify-between w-full p-3 rounded-[10px] hover:bg-gray-50 transition-colors"
                >
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
                <button 
                  onClick={() => setHelpSupportOpen(true)}
                  className="flex items-center justify-between w-full p-3 rounded-[10px] hover:bg-gray-50 transition-colors"
                >
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

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Profile</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={async e => {
                e.preventDefault()
                console.log('🔄 Form submitted, saving:', editData)
                console.log('📝 Form validation check:', {
                  firstName: editData.firstName,
                  lastName: editData.lastName,
                  dateOfBirth: editData.dateOfBirth,
                  hasFirstName: !!editData.firstName,
                  hasLastName: !!editData.lastName,
                  hasDateOfBirth: !!editData.dateOfBirth
                })
                setSaving(true)
                try {
                  const updatedUser = await updateUser({
                    ...user,
                    firstName: editData.firstName,
                    lastName: editData.lastName,
                    bio: editData.bio,
                    dateOfBirth: editData.dateOfBirth
                  })
                  console.log('✅ Profile updated successfully:', updatedUser)
                  showSuccess('Profile updated successfully!')
                  setEditOpen(false)
                  setTimeout(() => {
                    checkCompliance()
                  }, 300)
                } catch (err) {
                  console.error('❌ Failed to update profile:', err)
                  showError('Failed to update profile')
                } finally {
                  setSaving(false)
                }
              }}
              onClick={() => console.log('📋 Form clicked!')}
              className="space-y-4"
            >
              <div>
                <label className="block mb-1 font-medium">First Name</label>
                <input
                  className="w-full h-11 px-4 bg-gray-100 rounded-[10px]"
                  value={editData.firstName}
                  onChange={e => setEditData({ ...editData, firstName: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block mb-1 font-medium">Last Name</label>
                <input
                  className="w-full h-11 px-4 bg-gray-100 rounded-[10px]"
                  value={editData.lastName}
                  onChange={e => setEditData({ ...editData, lastName: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block mb-1 font-medium">Bio</label>
                <textarea
                  className="w-full px-4 py-2 bg-gray-100 rounded-[10px]"
                  value={editData.bio}
                  onChange={e => setEditData({ ...editData, bio: e.target.value })}
                />
              </div>
              <div>
                <label className="block mb-1 font-medium">Date of Birth <span className="text-red-500">*</span></label>
                <input
                  id="dob-input"
                  type="date"
                  className="w-full h-11 px-4 bg-gray-100 rounded-[10px]"
                  value={editData.dateOfBirth}
                  onChange={e => setEditData({ ...editData, dateOfBirth: e.target.value })}
                  required
                />
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={saving}
                onClick={async (e) => {
                  e.preventDefault()
                  setSaving(true)
                  try {
                    const updatedUser = await updateUser({
                      ...user,
                      firstName: editData.firstName,
                      lastName: editData.lastName,
                      bio: editData.bio,
                      dateOfBirth: editData.dateOfBirth
                    })
                    showSuccess('Profile updated successfully!')
                    setEditOpen(false)
                    setTimeout(() => {
                      checkCompliance()
                    }, 300)
                  } catch (err: any) {
                    showError('Failed to update profile')
                  } finally {
                    setSaving(false)
                  }
                }}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {showCompliance && <ComplianceManager onComplete={() => setShowCompliance(false)} showOnFirstVisit={true} />}

        {/* Profile Components */}
        <SecuritySettings open={securityOpen} onOpenChange={setSecurityOpen} />
        <NotificationSettings open={notificationsOpen} onOpenChange={setNotificationsOpen} />
        <PaymentMethods open={paymentMethodsOpen} onOpenChange={setPaymentMethodsOpen} />
        <TransactionHistory open={transactionHistoryOpen} onOpenChange={setTransactionHistoryOpen} />
        <HelpSupport open={helpSupportOpen} onOpenChange={setHelpSupportOpen} />
      </div>
    </div>
  )
}

export default ProfilePage
