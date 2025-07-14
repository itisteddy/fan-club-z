import React, { useState, useEffect } from 'react'
import { 
  Settings as SettingsIcon, 
  User, 
  Shield, 
  Bell, 
  CreditCard, 
  Smartphone, 
  Moon, 
  Sun, 
  Globe,
  Eye,
  EyeOff,
  ChevronRight,
  ArrowLeft,
  Save,
  Check
} from 'lucide-react'
import { Link, useLocation } from 'wouter'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/store/authStore'
import { useSettingsStore } from '@/store/settingsStore'
import { useToast } from '@/hooks/use-toast'

export const SettingsPage: React.FC = () => {
  const { user } = useAuthStore()
  const settings = useSettingsStore()
  const [, setLocation] = useLocation()
  const { success: showSuccess, error: showError } = useToast()
  
  const [hasChanges, setHasChanges] = useState(false)
  const [saving, setSaving] = useState(false)
  
  // Load user settings when component mounts
  useEffect(() => {
    if (user?.id) {
      console.log('🔧 SettingsPage: Loading settings for user:', user.id)
      // Update settings from user data
      settings.updateSettings({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        bio: user.bio || '',
      })
      
      // Load additional settings from API
      settings.loadUserSettings(user.id).catch(error => {
        console.log('Settings load failed, using defaults:', error.message)
      })
    }
  }, [user?.id])
  
  const updateSetting = (key: string, value: any) => {
    settings.updateSetting(key, value)
    setHasChanges(true)
  }
  
  const saveSettings = async () => {
    if (!user?.id) return
    
    setSaving(true)
    try {
      await settings.saveUserSettings(user.id)
      showSuccess('Settings saved successfully!')
      setHasChanges(false)
    } catch (error) {
      showError('Failed to save settings. Please try again.')
    } finally {
      setSaving(false)
    }
  }
  
  const SettingToggle: React.FC<{
    label: string
    description?: string
    checked: boolean
    onChange: (checked: boolean) => void
    testId?: string
  }> = ({ label, description, checked, onChange, testId }) => (
    <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
      <div className="flex-1">
        <div className="font-medium text-gray-900">{label}</div>
        {description && <div className="text-sm text-gray-500 mt-1">{description}</div>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative inline-flex w-11 h-6 items-center rounded-full transition-colors ${
          checked ? 'bg-blue-500' : 'bg-gray-300'
        }`}
        data-testid={testId}
        role="switch"
        aria-checked={checked}
        aria-label={`Toggle ${label}`}
      >
        <span
          className={`inline-block w-4 h-4 bg-white rounded-full transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  )
  
  const SettingSelect: React.FC<{
    label: string
    description?: string
    value: string
    options: { value: string; label: string }[]
    onChange: (value: string) => void
    testId?: string
  }> = ({ label, description, value, options, onChange, testId }) => (
    <div className="p-4 bg-white rounded-lg border border-gray-200">
      <div className="mb-3">
        <div className="font-medium text-gray-900">{label}</div>
        {description && <div className="text-sm text-gray-500 mt-1">{description}</div>}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-11 px-4 bg-gray-50 rounded-lg border border-gray-200 text-gray-900"
        data-testid={testId}
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
  
  const SettingInput: React.FC<{
    label: string
    description?: string
    value: string
    onChange: (value: string) => void
    type?: string
    placeholder?: string
    testId?: string
  }> = ({ label, description, value, onChange, type = 'text', placeholder, testId }) => (
    <div className="p-4 bg-white rounded-lg border border-gray-200">
      <div className="mb-3">
        <div className="font-medium text-gray-900">{label}</div>
        {description && <div className="text-sm text-gray-500 mt-1">{description}</div>}
      </div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-11 px-4 bg-gray-50 rounded-lg border border-gray-200 text-gray-900"
        data-testid={testId}
      />
    </div>
  )
  
  const SettingsSection: React.FC<{
    icon: React.ComponentType<{ className?: string }>
    title: string
    description?: string
    children: React.ReactNode
    isOpen?: boolean
    onClick?: () => void
    testId?: string
  }> = ({ icon: Icon, title, description, children, isOpen, onClick, testId }) => (
    <Card className="mb-4">
      <CardHeader 
        className={`cursor-pointer ${onClick ? 'hover:bg-gray-50' : ''}`}
        onClick={onClick}
      >
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Icon className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <div className="font-semibold text-gray-900" data-testid={testId}>{title}</div>
              {description && <div className="text-sm text-gray-500 font-normal">{description}</div>}
            </div>
          </div>
          {onClick && <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />}
        </CardTitle>
      </CardHeader>
      {(!onClick || isOpen) && (
        <CardContent className="space-y-4">
          {children}
        </CardContent>
      )}
    </Card>
  )
  
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-900 mb-2">Access Denied</div>
          <div className="text-gray-500 mb-4">Please log in to access settings</div>
          <Button onClick={() => setLocation('/auth/login')}>
            Go to Login
          </Button>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-40">
        <div className="bg-white/80 backdrop-blur-md border-b border-gray-100">
          <div className="px-4 pt-12 pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setLocation('/profile')}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100"
                  data-testid="back-to-profile"
                  aria-label="Back to Profile"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <h1 className="text-display font-bold">Settings</h1>
              </div>
              {hasChanges && (
                <button
                  onClick={saveSettings}
                  disabled={saving}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                  data-testid="save-settings"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Saving...' : 'Save'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="px-4 pb-24 pt-6">
        {/* Account Settings */}
        <SettingsSection
          icon={User}
          title="Account Settings"
          description="Manage your account information and profile"
          testId="account-settings"
        >
          <SettingInput
            label="First Name"
            value={settings.firstName}
            onChange={(value) => updateSetting('firstName', value)}
            placeholder="Enter your first name"
            testId="first-name-input"
          />
          
          <SettingInput
            label="Last Name"
            value={settings.lastName}
            onChange={(value) => updateSetting('lastName', value)}
            placeholder="Enter your last name"
            testId="last-name-input"
          />
          
          <SettingInput
            label="Email Address"
            value={settings.email}
            onChange={(value) => updateSetting('email', value)}
            type="email"
            placeholder="Enter your email"
            testId="email-input"
          />
          
          <SettingInput
            label="Bio"
            value={settings.bio}
            onChange={(value) => updateSetting('bio', value)}
            placeholder="Tell others about yourself"
            testId="bio-input"
          />
        </SettingsSection>

        {/* Privacy Settings */}
        <SettingsSection
          icon={Eye}
          title="Privacy & Visibility"
          description="Control who can see your information"
          testId="privacy-settings"
        >
          <SettingSelect
            label="Profile Visibility"
            description="Choose who can view your profile"
            value={settings.profileVisibility}
            options={[
              { value: 'public', label: 'Public' },
              { value: 'friends', label: 'Friends Only' },
              { value: 'private', label: 'Private' }
            ]}
            onChange={(value) => updateSetting('profileVisibility', value)}
            testId="profile-visibility-select"
          />
          
          <SettingToggle
            label="Show Email Address"
            description="Allow others to see your email"
            checked={settings.showEmail}
            onChange={(checked) => updateSetting('showEmail', checked)}
            testId="show-email-toggle"
          />
          
          <SettingToggle
            label="Show Betting Statistics"
            description="Display your win rate and betting stats"
            checked={settings.showStats}
            onChange={(checked) => updateSetting('showStats', checked)}
            testId="show-stats-toggle"
          />
        </SettingsSection>

        {/* Notification Settings */}
        <SettingsSection
          icon={Bell}
          title="Notifications"
          description="Manage how and when you receive notifications"
          testId="notification-settings"
        >
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-900">Delivery Methods</h4>
            
            <SettingToggle
              label="Push Notifications"
              description="Receive notifications on your device"
              checked={settings.pushNotifications}
              onChange={(checked) => updateSetting('pushNotifications', checked)}
              testId="push-notifications-toggle"
            />
            
            <SettingToggle
              label="Email Notifications"
              description="Receive notifications via email"
              checked={settings.emailNotifications}
              onChange={(checked) => updateSetting('emailNotifications', checked)}
              testId="email-notifications-toggle"
            />
            
            <SettingToggle
              label="SMS Notifications"
              description="Receive notifications via text message"
              checked={settings.smsNotifications}
              onChange={(checked) => updateSetting('smsNotifications', checked)}
              testId="sms-notifications-toggle"
            />
          </div>
          
          <hr className="border-gray-200" />
          
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-900">Notification Types</h4>
            
            <SettingToggle
              label="Bet Updates"
              description="Get notified when your bets are updated"
              checked={settings.betUpdates}
              onChange={(checked) => updateSetting('betUpdates', checked)}
              testId="bet-updates-toggle"
            />
            
            <SettingToggle
              label="Bet Results"
              description="Get notified when your bets are settled"
              checked={settings.betResults}
              onChange={(checked) => updateSetting('betResults', checked)}
              testId="bet-results-toggle"
            />
            
            <SettingToggle
              label="New Trending Bets"
              description="Get notified about popular new bets"
              checked={settings.newBets}
              onChange={(checked) => updateSetting('newBets', checked)}
              testId="new-bets-toggle"
            />
            
            <SettingToggle
              label="Club Activity"
              description="Get notified about activity in your clubs"
              checked={settings.clubActivity}
              onChange={(checked) => updateSetting('clubActivity', checked)}
              testId="club-activity-toggle"
            />
            
            <SettingToggle
              label="Social Updates"
              description="Get notified about likes, comments, and follows"
              checked={settings.socialUpdates}
              onChange={(checked) => updateSetting('socialUpdates', checked)}
              testId="social-updates-toggle"
            />
            
            <SettingToggle
              label="Marketing Emails"
              description="Receive promotional offers and updates"
              checked={settings.marketingEmails}
              onChange={(checked) => updateSetting('marketingEmails', checked)}
              testId="marketing-emails-toggle"
            />
          </div>
        </SettingsSection>

        {/* Security Settings */}
        <SettingsSection
          icon={Shield}
          title="Security & Authentication"
          description="Protect your account and manage security settings"
          testId="security-settings"
        >
          <SettingToggle
            label="Two-Factor Authentication"
            description="Add an extra layer of security to your account"
            checked={settings.twoFactorAuth}
            onChange={(checked) => updateSetting('twoFactorAuth', checked)}
            testId="two-factor-toggle"
          />
          
          <SettingToggle
            label="Login Alerts"
            description="Get notified when your account is accessed"
            checked={settings.loginAlerts}
            onChange={(checked) => updateSetting('loginAlerts', checked)}
            testId="login-alerts-toggle"
          />
          
          <SettingSelect
            label="Session Timeout"
            description="Automatically log out after inactivity"
            value={settings.sessionTimeout}
            options={[
              { value: '1h', label: '1 hour' },
              { value: '6h', label: '6 hours' },
              { value: '24h', label: '24 hours' },
              { value: 'never', label: 'Never' }
            ]}
            onChange={(value) => updateSetting('sessionTimeout', value)}
            testId="session-timeout-select"
          />
        </SettingsSection>

        {/* App Preferences */}
        <SettingsSection
          icon={Smartphone}
          title="App Preferences"
          description="Customize your app experience"
          testId="app-preferences"
        >
          <SettingSelect
            label="Theme"
            description="Choose your preferred color scheme"
            value={settings.theme}
            options={[
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
              { value: 'auto', label: 'Auto (System)' }
            ]}
            onChange={(value) => updateSetting('theme', value)}
            testId="theme-select"
          />
          
          <SettingSelect
            label="Language"
            description="Choose your preferred language"
            value={settings.language}
            options={[
              { value: 'en', label: 'English' },
              { value: 'es', label: 'Español' },
              { value: 'fr', label: 'Français' },
              { value: 'de', label: 'Deutsch' }
            ]}
            onChange={(value) => updateSetting('language', value)}
            testId="language-select"
          />
          
          <SettingSelect
            label="Currency"
            description="Choose your preferred currency for display"
            value={settings.currency}
            options={[
              { value: 'USD', label: 'US Dollar (USD)' },
              { value: 'EUR', label: 'Euro (EUR)' },
              { value: 'GBP', label: 'British Pound (GBP)' },
              { value: 'CAD', label: 'Canadian Dollar (CAD)' }
            ]}
            onChange={(value) => updateSetting('currency', value)}
            testId="currency-select"
          />
          
          <SettingSelect
            label="Timezone"
            description="Choose your timezone for bet deadlines"
            value={settings.timezone}
            options={[
              { value: 'auto', label: 'Auto-detect' },
              { value: 'UTC', label: 'UTC' },
              { value: 'EST', label: 'Eastern Time' },
              { value: 'PST', label: 'Pacific Time' },
              { value: 'GMT', label: 'Greenwich Mean Time' }
            ]}
            onChange={(value) => updateSetting('timezone', value)}
            testId="timezone-select"
          />
        </SettingsSection>

        {/* Betting Preferences */}
        <SettingsSection
          icon={CreditCard}
          title="Betting Preferences"
          description="Customize your betting experience and limits"
          testId="betting-preferences"
        >
          <SettingInput
            label="Default Stake Amount"
            description="Default amount when placing bets"
            value={settings.defaultStakeAmount}
            onChange={(value) => updateSetting('defaultStakeAmount', value)}
            type="number"
            placeholder="10"
            testId="default-stake-input"
          />
          
          <SettingInput
            label="Maximum Daily Spend"
            description="Limit your daily betting amount"
            value={settings.maxDailySpend}
            onChange={(value) => updateSetting('maxDailySpend', value)}
            type="number"
            placeholder="500"
            testId="max-daily-spend-input"
          />
          
          <SettingSelect
            label="Risk Level"
            description="Choose your preferred risk level"
            value={settings.riskLevel}
            options={[
              { value: 'low', label: 'Conservative' },
              { value: 'medium', label: 'Moderate' },
              { value: 'high', label: 'Aggressive' }
            ]}
            onChange={(value) => updateSetting('riskLevel', value)}
            testId="risk-level-select"
          />
          
          <SettingToggle
            label="Auto-settle Bets"
            description="Automatically settle bets when results are available"
            checked={settings.autoSettle}
            onChange={(checked) => updateSetting('autoSettle', checked)}
            testId="auto-settle-toggle"
          />
        </SettingsSection>

        {/* Accessibility Settings */}
        <SettingsSection
          icon={Globe}
          title="Accessibility"
          description="Make the app easier to use"
          testId="accessibility-settings"
        >
          <SettingToggle
            label="High Contrast Mode"
            description="Increase color contrast for better visibility"
            checked={settings.highContrast}
            onChange={(checked) => updateSetting('highContrast', checked)}
            testId="high-contrast-toggle"
          />
          
          <SettingToggle
            label="Large Text"
            description="Use larger text sizes throughout the app"
            checked={settings.largeText}
            onChange={(checked) => updateSetting('largeText', checked)}
            testId="large-text-toggle"
          />
          
          <SettingToggle
            label="Reduce Motion"
            description="Minimize animations and transitions"
            checked={settings.reduceMotion}
            onChange={(checked) => updateSetting('reduceMotion', checked)}
            testId="reduce-motion-toggle"
          />
          
          <SettingToggle
            label="Screen Reader Support"
            description="Optimize for screen reader accessibility"
            checked={settings.screenReader}
            onChange={(checked) => updateSetting('screenReader', checked)}
            testId="screen-reader-toggle"
          />
        </SettingsSection>

        {/* Settings Actions */}
        <Card className="mt-6">
          <CardContent className="p-4">
            <div className="space-y-3">
              <Button
                onClick={saveSettings}
                className="w-full"
                disabled={!hasChanges || saving}
                data-testid="update-preferences"
              >
                <Check className="w-4 h-4 mr-2" />
                {saving ? 'Saving Settings...' : 'Update Preferences'}
              </Button>
              
              <div className="text-center">
                <button
                  onClick={() => setLocation('/profile')}
                  className="text-sm text-gray-500 hover:text-gray-700"
                  data-testid="back-to-profile-link"
                >
                  Back to Profile
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default SettingsPage