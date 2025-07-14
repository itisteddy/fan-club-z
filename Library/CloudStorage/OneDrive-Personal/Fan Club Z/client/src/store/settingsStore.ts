import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface SettingsState {
  // Profile settings
  firstName: string
  lastName: string
  email: string
  bio: string
  
  // Privacy settings
  profileVisibility: 'public' | 'friends' | 'private'
  showEmail: boolean
  showStats: boolean
  
  // Notification settings
  pushNotifications: boolean
  emailNotifications: boolean
  smsNotifications: boolean
  betUpdates: boolean
  betResults: boolean
  newBets: boolean
  clubActivity: boolean
  socialUpdates: boolean
  marketingEmails: boolean
  
  // App preferences
  theme: 'light' | 'dark' | 'auto'
  language: string
  currency: string
  timezone: string
  
  // Security settings
  twoFactorAuth: boolean
  loginAlerts: boolean
  sessionTimeout: string
  
  // Betting preferences  
  defaultStakeAmount: string
  maxDailySpend: string
  riskLevel: 'low' | 'medium' | 'high'
  autoSettle: boolean
  
  // Accessibility
  highContrast: boolean
  largeText: boolean
  reduceMotion: boolean
  screenReader: boolean
  
  // Actions
  updateSetting: (key: string, value: any) => void
  updateSettings: (settings: Partial<SettingsState>) => void
  resetSettings: () => void
  loadUserSettings: (userId: string) => Promise<void>
  saveUserSettings: (userId: string) => Promise<void>
}

const defaultSettings = {
  // Profile settings
  firstName: '',
  lastName: '',
  email: '',
  bio: '',
  
  // Privacy settings
  profileVisibility: 'public' as const,
  showEmail: false,
  showStats: true,
  
  // Notification settings
  pushNotifications: true,
  emailNotifications: true,
  smsNotifications: false,
  betUpdates: true,
  betResults: true,
  newBets: false,
  clubActivity: true,
  socialUpdates: true,
  marketingEmails: false,
  
  // App preferences
  theme: 'light' as const,
  language: 'en',
  currency: 'USD',
  timezone: 'auto',
  
  // Security settings
  twoFactorAuth: false,
  loginAlerts: true,
  sessionTimeout: '24h',
  
  // Betting preferences  
  defaultStakeAmount: '10',
  maxDailySpend: '500',
  riskLevel: 'medium' as const,
  autoSettle: true,
  
  // Accessibility
  highContrast: false,
  largeText: false,
  reduceMotion: false,
  screenReader: false,
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...defaultSettings,
      
      updateSetting: (key: string, value: any) => {
        console.log(`🔧 Settings: Updating ${key} to:`, value)
        set(state => ({ ...state, [key]: value }))
      },
      
      updateSettings: (settings: Partial<SettingsState>) => {
        console.log('🔧 Settings: Bulk update:', settings)
        set(state => ({ ...state, ...settings }))
      },
      
      resetSettings: () => {
        console.log('🔧 Settings: Resetting to defaults')
        set(defaultSettings)
      },
      
      loadUserSettings: async (userId: string) => {
        try {
          console.log(`🔧 Settings: Loading settings for user ${userId}`)
          
          // Simulate API call to load user settings
          const response = await fetch(`/api/users/${userId}/settings`)
          if (response.ok) {
            const userSettings = await response.json()
            set(state => ({ ...state, ...userSettings }))
            console.log('✅ Settings: User settings loaded successfully')
          }
        } catch (error) {
          console.error('❌ Settings: Failed to load user settings:', error)
          // Continue with default/persisted settings
        }
      },
      
      saveUserSettings: async (userId: string) => {
        try {
          console.log(`🔧 Settings: Saving settings for user ${userId}`)
          
          const settings = get()
          const settingsToSave = {
            ...settings,
            // Exclude store methods from save
            updateSetting: undefined,
            updateSettings: undefined,
            resetSettings: undefined,
            loadUserSettings: undefined,
            saveUserSettings: undefined,
          }
          
          // Simulate API call to save user settings
          const response = await fetch(`/api/users/${userId}/settings`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(settingsToSave),
          })
          
          if (response.ok) {
            console.log('✅ Settings: User settings saved successfully')
            return true
          } else {
            throw new Error('Failed to save settings')
          }
        } catch (error) {
          console.error('❌ Settings: Failed to save user settings:', error)
          throw error
        }
      },
    }),
    {
      name: 'fanclubz-settings',
      // Only persist user preferences, not profile data
      partialize: (state) => ({
        // Privacy settings
        profileVisibility: state.profileVisibility,
        showEmail: state.showEmail,
        showStats: state.showStats,
        
        // Notification settings
        pushNotifications: state.pushNotifications,
        emailNotifications: state.emailNotifications,
        smsNotifications: state.smsNotifications,
        betUpdates: state.betUpdates,
        betResults: state.betResults,
        newBets: state.newBets,
        clubActivity: state.clubActivity,
        socialUpdates: state.socialUpdates,
        marketingEmails: state.marketingEmails,
        
        // App preferences
        theme: state.theme,
        language: state.language,
        currency: state.currency,
        timezone: state.timezone,
        
        // Security settings
        twoFactorAuth: state.twoFactorAuth,
        loginAlerts: state.loginAlerts,
        sessionTimeout: state.sessionTimeout,
        
        // Betting preferences  
        defaultStakeAmount: state.defaultStakeAmount,
        maxDailySpend: state.maxDailySpend,
        riskLevel: state.riskLevel,
        autoSettle: state.autoSettle,
        
        // Accessibility
        highContrast: state.highContrast,
        largeText: state.largeText,
        reduceMotion: state.reduceMotion,
        screenReader: state.screenReader,
      }),
    }
  )
)