import { useState, useEffect } from 'react'

export type Platform = 'ios' | 'android' | 'web' | 'unknown'

interface PlatformInfo {
  platform: Platform
  isIOS: boolean
  isAndroid: boolean
  isMobile: boolean
  isStandalone: boolean
  hasNotch: boolean
  hasHomeIndicator: boolean
  safeAreaInsets: {
    top: number
    bottom: number
    left: number
    right: number
  }
}

export const usePlatform = (): PlatformInfo => {
  const [platformInfo, setPlatformInfo] = useState<PlatformInfo>({
    platform: 'unknown',
    isIOS: false,
    isAndroid: false,
    isMobile: false,
    isStandalone: false,
    hasNotch: false,
    hasHomeIndicator: false,
    safeAreaInsets: { top: 0, bottom: 0, left: 0, right: 0 }
  })

  useEffect(() => {
    const detectPlatform = () => {
      const userAgent = navigator.userAgent.toLowerCase()
      const isIOS = /iphone|ipad|ipod/.test(userAgent)
      const isAndroid = /android/.test(userAgent)
      const isMobile = isIOS || isAndroid || /mobile|tablet/.test(userAgent)
      
      let platform: Platform = 'web'
      if (isIOS) platform = 'ios'
      else if (isAndroid) platform = 'android'

      // Check if running as standalone PWA
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                          (window.navigator as any).standalone === true

      // Detect notch and home indicator
      const hasNotch = isIOS && (
        window.screen.height >= 812 || // iPhone X and later
        window.screen.width >= 812
      )

      const hasHomeIndicator = isIOS && (
        window.screen.height >= 844 || // iPhone 12 and later
        window.screen.width >= 844
      )

      // Get safe area insets
      const getSafeAreaInsets = () => {
        const style = getComputedStyle(document.documentElement)
        return {
          top: parseInt(style.getPropertyValue('--sat') || '0'),
          bottom: parseInt(style.getPropertyValue('--sab') || '0'),
          left: parseInt(style.getPropertyValue('--sal') || '0'),
          right: parseInt(style.getPropertyValue('--sar') || '0')
        }
      }

      // Set CSS custom properties for safe areas
      if (isIOS || isAndroid) {
        document.documentElement.style.setProperty('--sat', 'env(safe-area-inset-top)')
        document.documentElement.style.setProperty('--sab', 'env(safe-area-inset-bottom)')
        document.documentElement.style.setProperty('--sal', 'env(safe-area-inset-left)')
        document.documentElement.style.setProperty('--sar', 'env(safe-area-inset-right)')
      }

      setPlatformInfo({
        platform,
        isIOS,
        isAndroid,
        isMobile,
        isStandalone,
        hasNotch,
        hasHomeIndicator,
        safeAreaInsets: getSafeAreaInsets()
      })
    }

    detectPlatform()

    // Listen for orientation changes
    const handleOrientationChange = () => {
      setTimeout(detectPlatform, 100) // Small delay to ensure proper detection
    }

    window.addEventListener('orientationchange', handleOrientationChange)
    window.addEventListener('resize', handleOrientationChange)

    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange)
      window.removeEventListener('resize', handleOrientationChange)
    }
  }, [])

  return platformInfo
}

// Platform-specific utility functions
export const getPlatformStyles = (platform: Platform) => {
  switch (platform) {
    case 'ios':
      return {
        // iOS-specific styles
        scrollBehavior: 'auto' as const,
        overscrollBehavior: 'contain' as const,
        WebkitOverflowScrolling: 'touch' as const,
        // iOS-style shadows
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
        // iOS-style border radius
        borderRadius: '12px',
        // iOS-style transitions
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
      }
    case 'android':
      return {
        // Android-specific styles
        scrollBehavior: 'smooth' as const,
        overscrollBehavior: 'auto' as const,
        // Material Design shadows
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
        // Material Design border radius
        borderRadius: '8px',
        // Material Design transitions
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
      }
    default:
      return {
        // Web/default styles
        scrollBehavior: 'smooth' as const,
        overscrollBehavior: 'auto' as const,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        borderRadius: '8px',
        transition: 'all 0.2s ease'
      }
  }
}

// Platform-specific haptic feedback
export const useHapticFeedback = (platform: Platform) => {
  const triggerHaptic = (type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error') => {
    if (!navigator.vibrate) return

    const patterns = {
      light: [10],
      medium: [20],
      heavy: [30],
      success: [10, 50, 10],
      warning: [20, 50, 20],
      error: [30, 50, 30, 50, 30]
    }

    navigator.vibrate(patterns[type])
  }

  return { triggerHaptic }
}

export default usePlatform 