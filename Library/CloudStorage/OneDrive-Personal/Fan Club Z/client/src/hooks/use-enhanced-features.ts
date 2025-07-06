// Enhanced Features Integration Hook
// File: src/hooks/use-enhanced-features.ts

import { useAppleTheme } from '../lib/theme'
import { useHapticFeedback, useScreenReaderAnnouncement } from '../components/ui/enhanced-accessibility'
import { useEnhancedToast } from '../components/ui/enhanced-notifications'
import { useReducedMotion, useHighContrastMode } from '../lib/theme'

// Comprehensive hook that provides access to all enhanced features
export const useEnhancedFeatures = () => {
  // Theme management
  const { theme, updateTheme } = useAppleTheme()
  
  // Accessibility features
  const { feedback } = useHapticFeedback()
  const { announce, AnnouncementRegion } = useScreenReaderAnnouncement()
  
  // Notifications
  const { showToast, removeToast, clearAllToasts, toasts, ToastContainer } = useEnhancedToast()
  
  // System preferences
  const prefersReducedMotion = useReducedMotion()
  const isHighContrast = useHighContrastMode()

  // Enhanced interaction helpers
  const enhancedInteraction = {
    // Haptic feedback with different intensities
    lightFeedback: () => feedback('light'),
    mediumFeedback: () => feedback('medium'),
    heavyFeedback: () => feedback('heavy'),
    successFeedback: () => feedback('success'),
    warningFeedback: () => feedback('warning'),
    errorFeedback: () => feedback('error'),
    
    // Screen reader announcements
    announceSuccess: (message: string) => {
      announce(message, 'polite')
      showToast('success', message)
    },
    
    announceError: (message: string) => {
      announce(message, 'assertive')
      showToast('error', message)
    },
    
    announceInfo: (message: string) => {
      announce(message, 'polite')
      showToast('info', message)
    },
    
    // Toast helpers
    showSuccess: (message: string, title?: string) => {
      showToast('success', message, { title })
    },
    
    showError: (message: string, title?: string) => {
      showToast('error', message, { title })
    },
    
    showWarning: (message: string, title?: string) => {
      showToast('warning', message, { title })
    },
    
    showInfo: (message: string, title?: string) => {
      showToast('info', message, { title })
    },
  }

  // Theme helpers
  const themeHelpers = {
    // Quick theme updates
    setAccentColor: (color: 'blue' | 'purple' | 'green' | 'orange' | 'red' | 'indigo') => {
      updateTheme({ accentColor: color })
      enhancedInteraction.lightFeedback()
    },
    
    setDarkMode: (mode: 'light' | 'dark' | 'auto') => {
      updateTheme({ mode })
      enhancedInteraction.lightFeedback()
    },
    
    setFontSize: (size: 'small' | 'default' | 'large') => {
      updateTheme({ fontSize: size })
      enhancedInteraction.lightFeedback()
    },
    
    toggleReducedMotion: () => {
      updateTheme({ reducedMotion: !theme.reducedMotion })
      enhancedInteraction.lightFeedback()
    },
    
    toggleHighContrast: () => {
      updateTheme({ highContrast: !theme.highContrast })
      enhancedInteraction.lightFeedback()
    },
  }

  // Animation helpers
  const animationHelpers = {
    // Check if animations should be disabled
    shouldAnimate: !prefersReducedMotion && !theme.reducedMotion,
    
    // Get appropriate animation classes
    getAnimationClass: (type: 'fade' | 'slide' | 'scale' | 'spring') => {
      if (!animationHelpers.shouldAnimate) return ''
      
      const classes = {
        fade: 'animate-apple-in',
        slide: 'animate-apple-spring',
        scale: 'animate-apple-spring',
        spring: 'animate-apple-spring'
      }
      
      return classes[type] || ''
    },
    
    // Get transition duration based on preferences
    getTransitionDuration: (defaultDuration: string = '0.3s') => {
      return animationHelpers.shouldAnimate ? defaultDuration : '0s'
    }
  }

  // Accessibility helpers
  const accessibilityHelpers = {
    // High contrast mode
    isHighContrast,
    
    // Reduced motion
    prefersReducedMotion,
    
    // Get appropriate styles for high contrast
    getHighContrastStyles: () => ({
      borderWidth: isHighContrast ? '2px' : '1px',
      borderColor: isHighContrast ? 'currentColor' : undefined
    }),
    
    // Announce page changes
    announcePageChange: (pageTitle: string) => {
      announce(`Navigated to ${pageTitle}`, 'polite')
    },
    
    // Announce loading states
    announceLoading: (message: string = 'Loading...') => {
      announce(message, 'polite')
    },
    
    // Announce completion
    announceComplete: (message: string = 'Complete') => {
      announce(message, 'polite')
    }
  }

  // Mobile-specific helpers
  const mobileHelpers = {
    // Check if device supports haptic feedback
    supportsHaptics: typeof navigator !== 'undefined' && 'vibrate' in navigator,
    
    // Check if device is touch-based
    isTouchDevice: typeof window !== 'undefined' && 
      ('ontouchstart' in window || navigator.maxTouchPoints > 0),
    
    // Get appropriate touch target size
    getTouchTargetSize: () => '44px',
    
    // Get appropriate spacing for touch devices
    getTouchSpacing: () => '12px'
  }

  return {
    // Core features
    theme,
    updateTheme,
    feedback,
    announce,
    AnnouncementRegion,
    showToast,
    removeToast,
    clearAllToasts,
    toasts,
    ToastContainer,
    
    // System preferences
    prefersReducedMotion,
    isHighContrast,
    
    // Enhanced interactions
    enhancedInteraction,
    
    // Theme helpers
    themeHelpers,
    
    // Animation helpers
    animationHelpers,
    
    // Accessibility helpers
    accessibilityHelpers,
    
    // Mobile helpers
    mobileHelpers,
    
    // Utility functions
    utils: {
      // Debounced feedback for rapid interactions
      debouncedFeedback: (() => {
        let timeout: NodeJS.Timeout
        return (type: 'light' | 'medium' | 'heavy' = 'light', delay: number = 100) => {
          clearTimeout(timeout)
          timeout = setTimeout(() => feedback(type), delay)
        }
      })(),
      
      // Batch multiple announcements
      batchAnnounce: (messages: string[], delay: number = 500) => {
        messages.forEach((message, index) => {
          setTimeout(() => announce(message, 'polite'), index * delay)
        })
      },
      
      // Create a loading sequence
      createLoadingSequence: (steps: string[]) => {
        return {
          start: () => {
            enhancedInteraction.announceInfo('Starting process...')
            steps.forEach((step, index) => {
              setTimeout(() => {
                enhancedInteraction.announceInfo(step)
              }, (index + 1) * 1000)
            })
          },
          complete: () => {
            enhancedInteraction.announceSuccess('Process completed successfully')
          },
          error: (errorMessage: string) => {
            enhancedInteraction.announceError(`Error: ${errorMessage}`)
          }
        }
      }
    }
  }
}

// Export individual hooks for specific use cases
export { useAppleTheme } from '../lib/theme'
export { useHapticFeedback, useScreenReaderAnnouncement } from '../components/ui/enhanced-accessibility'
export { useEnhancedToast } from '../components/ui/enhanced-notifications'
export { useReducedMotion, useHighContrastMode } from '../lib/theme' 