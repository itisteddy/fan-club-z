// Enhanced Navigation and Modal Components
// File: src/components/ui/enhanced-navigation.tsx

import React, { useState, useEffect, useRef } from 'react'
import { X, ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react'
import { useHapticFeedback } from './enhanced-accessibility'
import { useReducedMotion } from '../../lib/theme'

// Navigation Bar Component
interface NavigationBarProps {
  title: string
  variant?: 'large' | 'small'
  scrollBehavior?: 'none' | 'collapse' | 'hide'
  leftActions?: Array<{
    icon: React.ComponentType<{ className?: string }>
    label: string
    onClick: () => void
  }>
  rightActions?: Array<{
    icon: React.ComponentType<{ className?: string }>
    label: string
    onClick: () => void
  }>
  onBack?: () => void
  className?: string
}

export const NavigationBar: React.FC<NavigationBarProps> = ({
  title,
  variant = 'large',
  scrollBehavior = 'none',
  leftActions = [],
  rightActions = [],
  onBack,
  className = ''
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const { feedback } = useHapticFeedback()
  const prefersReducedMotion = useReducedMotion()

  // Handle scroll behavior
  useEffect(() => {
    if (scrollBehavior === 'none') return

    const handleScroll = () => {
      const scrollTop = window.scrollY
      const shouldCollapse = scrollTop > 50

      if (shouldCollapse !== isCollapsed) {
        setIsCollapsed(shouldCollapse)
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [scrollBehavior, isCollapsed])

  const handleActionClick = (onClick: () => void) => {
    feedback('light')
    onClick()
  }

  const getHeightClass = () => {
    if (variant === 'large' && !isCollapsed) {
      return 'h-nav-bar pt-safe'
    }
    return 'h-nav-bar-collapsed pt-safe'
  }

  const getTitleClass = () => {
    if (variant === 'large' && !isCollapsed) {
      return 'text-display font-bold'
    }
    return 'text-body-lg font-semibold'
  }

  return (
    <header className={`sticky top-0 z-40 nav-apple ${getHeightClass()} ${className}`}>
      <div className="flex items-center justify-between px-4 h-full">
        {/* Left side */}
        <div className="flex items-center space-x-3">
          {onBack && (
            <button
              onClick={() => handleActionClick(onBack)}
              className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              aria-label="Go back"
            >
              <ChevronLeft className="w-5 h-5 text-black dark:text-white" />
            </button>
          )}
          
          {leftActions.map((action, index) => {
            const Icon = action.icon
            return (
              <button
                key={index}
                onClick={() => handleActionClick(action.onClick)}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                aria-label={action.label}
              >
                <Icon className="w-5 h-5 text-black dark:text-white" />
              </button>
            )
          })}
        </div>

        {/* Title */}
        <h1 className={`${getTitleClass()} text-black dark:text-white text-center flex-1 px-4`}>
          {title}
        </h1>

        {/* Right side */}
        <div className="flex items-center space-x-3">
          {rightActions.map((action, index) => {
            const Icon = action.icon
            return (
              <button
                key={index}
                onClick={() => handleActionClick(action.onClick)}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                aria-label={action.label}
              >
                <Icon className="w-5 h-5 text-black dark:text-white" />
              </button>
            )
          })}
        </div>
      </div>
    </header>
  )
}

// Sheet Modal Component
interface SheetModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: 'small' | 'medium' | 'large' | 'full'
  showCloseButton?: boolean
  className?: string
}

export const SheetModal: React.FC<SheetModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'medium',
  showCloseButton = true,
  className = ''
}) => {
  const { feedback } = useHapticFeedback()
  const prefersReducedMotion = useReducedMotion()
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const handleClose = () => {
    feedback('light')
    setIsAnimating(false)
    setTimeout(onClose, prefersReducedMotion ? 0 : 300)
  }

  const getSizeClass = () => {
    switch (size) {
      case 'small':
        return 'max-h-[40vh]'
      case 'medium':
        return 'max-h-[60vh]'
      case 'large':
        return 'max-h-[80vh]'
      case 'full':
        return 'max-h-[100vh]'
      default:
        return 'max-h-[60vh]'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
        style={{
          animation: prefersReducedMotion ? 'none' : 'fadeIn 0.3s ease'
        }}
      />
      
      {/* Sheet */}
      <div
        className={`relative w-full bg-white dark:bg-dark-surface rounded-t-apple-2xl shadow-apple-modal border-t border-gray-100 dark:border-gray-800 ${getSizeClass()} ${className}`}
        style={{
          animation: prefersReducedMotion ? 'none' : 'slideUp 0.3s ease'
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
        </div>

        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            {title && (
              <h2 className="text-title-3 font-semibold text-black dark:text-white">
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-black dark:text-white" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  )
}

// Action Sheet Component
interface ActionSheetItem {
  label: string
  icon?: React.ComponentType<{ className?: string }>
  onClick: () => void
  variant?: 'default' | 'destructive' | 'cancel'
}

interface ActionSheetProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  items: ActionSheetItem[]
  showCancel?: boolean
  cancelLabel?: string
}

export const ActionSheet: React.FC<ActionSheetProps> = ({
  isOpen,
  onClose,
  title,
  items,
  showCancel = true,
  cancelLabel = 'Cancel'
}) => {
  const { feedback } = useHapticFeedback()
  const prefersReducedMotion = useReducedMotion()

  const handleItemClick = (item: ActionSheetItem) => {
    feedback(item.variant === 'destructive' ? 'heavy' : 'medium')
    item.onClick()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        style={{
          animation: prefersReducedMotion ? 'none' : 'fadeIn 0.3s ease'
        }}
      />
      
      {/* Action Sheet */}
      <div
        className="relative w-full bg-white dark:bg-dark-surface rounded-t-apple-2xl shadow-apple-modal border-t border-gray-100 dark:border-gray-800 pb-safe"
        style={{
          animation: prefersReducedMotion ? 'none' : 'slideUp 0.3s ease'
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
        </div>

        {/* Title */}
        {title && (
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-body font-semibold text-black dark:text-white text-center">
              {title}
            </h2>
          </div>
        )}

        {/* Action Items */}
        <div className="px-4 py-2">
          {items.map((item, index) => {
            const Icon = item.icon
            const isDestructive = item.variant === 'destructive'
            
            return (
              <button
                key={index}
                onClick={() => handleItemClick(item)}
                className={`w-full flex items-center justify-center space-x-3 h-12 rounded-apple-md font-medium transition-colors ${
                  isDestructive
                    ? 'text-system-red hover:bg-red-50 dark:hover:bg-red-900/20'
                    : 'text-black dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                {Icon && <Icon className="w-5 h-5" />}
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>

        {/* Cancel Button */}
        {showCancel && (
          <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={onClose}
              className="w-full h-12 rounded-apple-md font-medium text-black dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              {cancelLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// Enhanced Tab Bar Component
interface TabItem {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  badge?: number | string
}

interface EnhancedTabBarProps {
  tabs: TabItem[]
  activeTab: string
  onTabChange: (tabId: string) => void
  variant?: 'default' | 'segmented' | 'pill'
  className?: string
}

export const EnhancedTabBar: React.FC<EnhancedTabBarProps> = ({
  tabs,
  activeTab,
  onTabChange,
  variant = 'default',
  className = ''
}) => {
  const { feedback } = useHapticFeedback()

  const handleTabClick = (tabId: string) => {
    feedback('light')
    onTabChange(tabId)
  }

  if (variant === 'segmented') {
    return (
      <div className={`bg-gray-100 dark:bg-gray-800 rounded-apple-lg p-1 ${className}`}>
        <div className="flex">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`flex-1 flex items-center justify-center space-x-2 h-10 rounded-apple-md font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-white dark:bg-dark-surface text-black dark:text-white shadow-apple-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-body-sm">{tab.label}</span>
                {tab.badge && (
                  <span className="bg-primary text-white text-caption-2 px-1.5 py-0.5 rounded-full min-w-[16px] text-center">
                    {tab.badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  if (variant === 'pill') {
    return (
      <div className={`flex space-x-2 overflow-x-auto scrollbar-hidden ${className}`}>
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-full font-medium transition-all duration-200 whitespace-nowrap ${
                isActive
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-body-sm">{tab.label}</span>
              {tab.badge && (
                <span className={`text-caption-2 px-1.5 py-0.5 rounded-full min-w-[16px] text-center ${
                  isActive ? 'bg-white/20' : 'bg-gray-300 dark:bg-gray-600'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>
    )
  }

  // Default variant (bottom tab bar)
  return (
    <div className={`tab-bar-apple ${className}`}>
      <div className="flex justify-around items-center h-tab-bar">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className="tab-item-apple"
            >
              <div className="relative">
                <Icon className={`w-6 h-6 mb-1 ${isActive ? 'text-primary' : 'text-gray-400'}`} />
                {tab.badge && (
                  <span className="absolute -top-1 -right-1 bg-system-red text-white text-caption-2 px-1 rounded-full min-w-[16px] text-center">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] ${isActive ? 'text-primary' : 'text-gray-400'}`}>
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// CSS Animations
const styles = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes slideUp {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
  }
`

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style')
  styleSheet.textContent = styles
  document.head.appendChild(styleSheet)
} 