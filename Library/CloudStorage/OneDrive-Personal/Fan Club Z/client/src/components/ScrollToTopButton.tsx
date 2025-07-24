import React, { useState, useEffect } from 'react'
import { ChevronUp } from 'lucide-react'
import { scrollToTop } from '@/hooks/use-scroll-to-top'
import { cn } from '@/lib/utils'
import { useLocation } from 'wouter'

interface ScrollToTopButtonProps {
  className?: string
  threshold?: number // Scroll threshold to show button (default: 300px)
}

export const ScrollToTopButton: React.FC<ScrollToTopButtonProps> = ({ 
  className,
  threshold = 300 
}) => {
  const [isVisible, setIsVisible] = useState(false)
  const [location] = useLocation()

  // Hide button on club detail pages where chat is active
  const shouldHide = location.includes('/clubs/') || location.includes('/chat')

  useEffect(() => {
    const toggleVisibility = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      setIsVisible(scrollTop > threshold)
    }

    window.addEventListener('scroll', toggleVisibility)
    return () => window.removeEventListener('scroll', toggleVisibility)
  }, [threshold])

  const handleClick = () => {
    scrollToTop('smooth')
  }

  if (!isVisible || shouldHide) return null

  return (
    <button
      onClick={handleClick}
      className={cn(
        "fixed bottom-28 left-4 z-40 w-11 h-11 bg-white/95 text-gray-600 rounded-full shadow-md",
        "flex items-center justify-center transition-all duration-200",
        "hover:bg-white hover:text-gray-900 active:scale-95",
        "backdrop-blur-sm border border-gray-200",
        className
      )}
      aria-label="Scroll to top"
    >
      <ChevronUp className="w-6 h-6" />
    </button>
  )
}

export default ScrollToTopButton 