import { useEffect } from 'react'
import { useLocation } from 'wouter'

/**
 * Custom hook that scrolls to top when the route changes
 * This ensures users always start at the top of new pages
 */
export const useScrollToTop = () => {
  const [location] = useLocation()

  useEffect(() => {
    // Scroll to top on route change
    const scrollToTop = () => {
      // Smooth scroll for better UX
      window.scrollTo({ top: 0, behavior: 'smooth' })
      
      // Fallback for mobile browsers
      document.body.scrollTop = 0
      document.documentElement.scrollTop = 0
    }

    // Small delay to ensure DOM is ready
    const timeoutId = setTimeout(scrollToTop, 100)
    
    return () => clearTimeout(timeoutId)
  }, [location])
}

/**
 * Utility function to manually scroll to top
 * Useful for button clicks or other interactions
 */
export const scrollToTop = (behavior: ScrollBehavior = 'smooth') => {
  window.scrollTo({ top: 0, behavior })
  document.body.scrollTop = 0
  document.documentElement.scrollTop = 0
} 