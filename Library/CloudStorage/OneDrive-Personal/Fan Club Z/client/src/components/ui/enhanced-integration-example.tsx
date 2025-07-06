// Enhanced Integration Example
// File: src/components/ui/enhanced-integration-example.tsx

import React, { useState } from 'react'
import { useEnhancedFeatures } from '../../hooks/use-enhanced-features'
import { EnhancedInput, EnhancedSelect, EnhancedTextarea, EnhancedToggle } from './enhanced-forms'
import { NavigationBar, SheetModal, ActionSheet, EnhancedTabBar } from './enhanced-navigation'
import { Alert, ProgressIndicator, LoadingSpinner, StatusBadge } from './enhanced-notifications'
import { useGestures } from './enhanced-accessibility'

// Example component demonstrating all enhanced features
export const EnhancedIntegrationExample: React.FC = () => {
  const {
    theme,
    enhancedInteraction,
    themeHelpers,
    animationHelpers,
    accessibilityHelpers,
    mobileHelpers,
    utils
  } = useEnhancedFeatures()

  const [showModal, setShowModal] = useState(false)
  const [showActionSheet, setShowActionSheet] = useState(false)
  const [activeTab, setActiveTab] = useState('home')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    category: '',
    message: '',
    notifications: true
  })

  // Gesture handlers
  const gestureProps = useGestures({
    onSwipeLeft: () => {
      enhancedInteraction.mediumFeedback()
      enhancedInteraction.announceInfo('Swiped left')
    },
    onSwipeRight: () => {
      enhancedInteraction.mediumFeedback()
      enhancedInteraction.announceInfo('Swiped right')
    },
    onDoubleTap: () => {
      enhancedInteraction.heavyFeedback()
      enhancedInteraction.announceSuccess('Double tapped!')
    },
    onLongPress: () => {
      enhancedInteraction.heavyFeedback()
      setShowActionSheet(true)
    }
  })

  // Tab items for demonstration
  const tabItems = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'search', label: 'Search', icon: '🔍' },
    { id: 'profile', label: 'Profile', icon: '👤' }
  ]

  // Action sheet items
  const actionSheetItems = [
    { label: 'Share', onClick: () => enhancedInteraction.showInfo('Shared!') },
    { label: 'Save', onClick: () => enhancedInteraction.showSuccess('Saved!') },
    { label: 'Delete', onClick: () => enhancedInteraction.showError('Deleted!'), variant: 'destructive' as const }
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg">
      {/* Enhanced Navigation Bar */}
      <NavigationBar
        title="Enhanced Features Demo"
        variant="large"
        scrollBehavior="collapse"
        rightActions={[
          {
            icon: () => <span>⚙️</span>,
            label: "Settings",
            onClick: () => {
              enhancedInteraction.lightFeedback()
              setShowModal(true)
            }
          }
        ]}
      />

      {/* Main Content */}
      <div className="p-apple-md space-y-apple-lg">
        {/* Theme Controls */}
        <div className="card-apple p-apple-md">
          <h2 className="text-apple-title-2 mb-apple-md">Theme Controls</h2>
          <div className="space-y-apple-sm">
            <div className="flex items-center justify-between">
              <span className="text-apple-body">Accent Color</span>
              <div className="flex space-x-apple-xs">
                {(['blue', 'purple', 'green', 'orange', 'red', 'indigo'] as const).map(color => (
                  <button
                    key={color}
                    onClick={() => themeHelpers.setAccentColor(color)}
                    className={`w-8 h-8 rounded-full border-2 ${
                      theme.accentColor === color ? 'border-black dark:border-white' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: `var(--accent-${color === 'blue' ? '500' : '500'})` }}
                    aria-label={`Set accent color to ${color}`}
                  />
                ))}
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-apple-body">Dark Mode</span>
              <EnhancedToggle
                checked={theme.mode === 'dark'}
                onChange={() => themeHelpers.setDarkMode(theme.mode === 'dark' ? 'light' : 'dark')}
                color="primary"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-apple-body">Large Text</span>
              <EnhancedToggle
                checked={theme.fontSize === 'large'}
                onChange={() => themeHelpers.setFontSize(theme.fontSize === 'large' ? 'default' : 'large')}
                color="green"
              />
            </div>
          </div>
        </div>

        {/* Enhanced Form Components */}
        <div className="card-apple p-apple-md">
          <h2 className="text-apple-title-2 mb-apple-md">Enhanced Forms</h2>
          <div className="space-y-apple-md">
            <EnhancedInput
              label="Name"
              value={formData.name}
              onChange={(value) => setFormData(prev => ({ ...prev, name: value }))}
              variant="floating"
              placeholder="Enter your name"
            />
            
            <EnhancedInput
              label="Email"
              type="email"
              value={formData.email}
              onChange={(value) => setFormData(prev => ({ ...prev, email: value }))}
              variant="floating"
              placeholder="Enter your email"
            />
            
            <EnhancedSelect
              label="Category"
              value={formData.category}
              onChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
              options={[
                { value: 'sports', label: 'Sports' },
                { value: 'crypto', label: 'Crypto' },
                { value: 'politics', label: 'Politics' }
              ]}
              placeholder="Select a category"
            />
            
            <EnhancedTextarea
              label="Message"
              value={formData.message}
              onChange={(value) => setFormData(prev => ({ ...prev, message: value }))}
              placeholder="Enter your message"
              maxLength={200}
              showCharacterCount
            />
            
            <div className="flex items-center justify-between">
              <span className="text-apple-body">Enable Notifications</span>
              <EnhancedToggle
                checked={formData.notifications}
                onChange={(checked) => setFormData(prev => ({ ...prev, notifications: checked }))}
                color="blue"
              />
            </div>
          </div>
        </div>

        {/* Enhanced Notifications */}
        <div className="card-apple p-apple-md">
          <h2 className="text-apple-title-2 mb-apple-md">Enhanced Notifications</h2>
          <div className="space-y-apple-md">
            <div className="flex space-x-apple-sm">
              <button
                onClick={() => enhancedInteraction.showSuccess('Success message!')}
                className="btn-apple-primary"
              >
                Success
              </button>
              <button
                onClick={() => enhancedInteraction.showError('Error message!')}
                className="btn-apple-secondary"
              >
                Error
              </button>
              <button
                onClick={() => enhancedInteraction.showInfo('Info message!')}
                className="btn-apple-text"
              >
                Info
              </button>
            </div>
            
            <Alert
              type="success"
              title="Success Alert"
            >
              This is a success alert with enhanced styling.
            </Alert>
            
            <ProgressIndicator
              value={65}
              max={100}
              showLabel
              size="medium"
            />
            
            <div className="flex items-center space-x-apple-sm">
              <StatusBadge status="success">Active</StatusBadge>
              <StatusBadge status="pending">Pending</StatusBadge>
              <StatusBadge status="error">Error</StatusBadge>
            </div>
          </div>
        </div>

        {/* Enhanced Tab Bar */}
        <div className="card-apple p-apple-md">
          <h2 className="text-apple-title-2 mb-apple-md">Enhanced Tab Bar</h2>
          <EnhancedTabBar
            tabs={tabItems}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            variant="segmented"
          />
        </div>

        {/* Gesture Demo */}
        <div 
          {...gestureProps}
          className="card-apple-interactive p-apple-md text-center"
        >
          <h2 className="text-apple-title-2 mb-apple-sm">Gesture Demo</h2>
          <p className="text-apple-body text-gray-600 dark:text-gray-400">
            Try swiping left/right, double tapping, or long pressing this card!
          </p>
        </div>

        {/* Accessibility Info */}
        <div className="card-apple p-apple-md">
          <h2 className="text-apple-title-2 mb-apple-md">Accessibility Status</h2>
          <div className="space-y-apple-sm text-apple-body-sm">
            <div className="flex items-center justify-between">
              <span>High Contrast Mode:</span>
              <StatusBadge status={accessibilityHelpers.isHighContrast ? 'success' : 'pending'}>
                {accessibilityHelpers.isHighContrast ? 'Enabled' : 'Disabled'}
              </StatusBadge>
            </div>
            <div className="flex items-center justify-between">
              <span>Reduced Motion:</span>
              <StatusBadge status={accessibilityHelpers.prefersReducedMotion ? 'success' : 'pending'}>
                {accessibilityHelpers.prefersReducedMotion ? 'Enabled' : 'Disabled'}
              </StatusBadge>
            </div>
            <div className="flex items-center justify-between">
              <span>Touch Device:</span>
              <StatusBadge status={mobileHelpers.isTouchDevice ? 'success' : 'pending'}>
                {mobileHelpers.isTouchDevice ? 'Yes' : 'No'}
              </StatusBadge>
            </div>
            <div className="flex items-center justify-between">
              <span>Haptic Support:</span>
              <StatusBadge status={mobileHelpers.supportsHaptics ? 'success' : 'pending'}>
                {mobileHelpers.supportsHaptics ? 'Available' : 'Not Available'}
              </StatusBadge>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Modals */}
      <SheetModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Settings"
        size="medium"
      >
        <div className="p-apple-md space-y-apple-md">
          <p className="text-apple-body">
            This is an enhanced sheet modal with Apple-style design.
          </p>
          <button
            onClick={() => {
              setShowModal(false)
              enhancedInteraction.showSuccess('Settings saved!')
            }}
            className="btn-apple-primary w-full"
          >
            Save Settings
          </button>
        </div>
      </SheetModal>

      <ActionSheet
        isOpen={showActionSheet}
        onClose={() => setShowActionSheet(false)}
        title="Card Actions"
        items={actionSheetItems}
      />
    </div>
  )
}

export default EnhancedIntegrationExample 