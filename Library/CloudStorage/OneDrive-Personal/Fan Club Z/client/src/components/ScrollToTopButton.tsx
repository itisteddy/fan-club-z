import React, { useState, useEffect } from 'react'
import { ChevronUp } from 'lucide-react'
import { scrollToTop } from '@/hooks/use-scroll-to-top'
import { cn } from '@/lib/utils'

interface ScrollToTopButtonProps {
  className?: string
  threshold?: number // Scroll threshold to show button (default: 300px)
}

export const ScrollToTopButton: React.FC<ScrollToTopButtonProps> = ({ 
  className,
  threshold = 300 
}) => {
  const [isVisible, setIsVisible] = useState(false)

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

  if (!isVisible) return null

  return (
    <button
      onClick={handleClick}
      className={cn(
        "fixed bottom-24 right-4 z-50 w-12 h-12 bg-blue-500 text-white rounded-full shadow-lg",
        "flex items-center justify-center transition-all duration-200",
        "hover:bg-blue-600 active:scale-95",
        "backdrop-blur-md bg-blue-500/90",
        className
      )}
      aria-label="Scroll to top"
    >
      <ChevronUp className="w-6 h-6" />
    </button>
  )
}

export default ScrollToTopButton 