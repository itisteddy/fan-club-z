import React, { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { usePlatform } from '@/hooks/use-platform'

// Animation variants for different platforms
const getAnimationVariants = (platform: string) => {
  switch (platform) {
    case 'ios':
      return {
        // iOS-style animations
        pageEnter: {
          opacity: 0,
          x: 20,
          transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] }
        },
        pageExit: {
          opacity: 0,
          x: -20,
          transition: { duration: 0.2, ease: [0.4, 0, 1, 1] }
        },
        cardEnter: {
          opacity: 0,
          y: 20,
          scale: 0.95,
          transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] }
        },
        buttonPress: {
          scale: 0.95,
          transition: { duration: 0.1, ease: [0.4, 0, 0.2, 1] }
        }
      }
    case 'android':
      return {
        // Material Design animations
        pageEnter: {
          opacity: 0,
          y: 20,
          transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] }
        },
        pageExit: {
          opacity: 0,
          y: -20,
          transition: { duration: 0.2, ease: [0.4, 0, 1, 1] }
        },
        cardEnter: {
          opacity: 0,
          y: 30,
          scale: 0.9,
          transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] }
        },
        buttonPress: {
          scale: 0.92,
          transition: { duration: 0.15, ease: [0.4, 0, 0.2, 1] }
        }
      }
    default:
      return {
        // Web/default animations
        pageEnter: {
          opacity: 0,
          y: 10,
          transition: { duration: 0.3, ease: 'easeOut' }
        },
        pageExit: {
          opacity: 0,
          y: -10,
          transition: { duration: 0.2, ease: 'easeIn' }
        },
        cardEnter: {
          opacity: 0,
          y: 15,
          transition: { duration: 0.2, ease: 'easeOut' }
        },
        buttonPress: {
          scale: 0.95,
          transition: { duration: 0.1, ease: 'easeOut' }
        }
      }
  }
}

// Animated Card Component
interface AnimatedCardProps {
  children: React.ReactNode
  className?: string
  delay?: number
  onClick?: () => void
  disabled?: boolean
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({
  children,
  className,
  delay = 0,
  onClick,
  disabled = false
}) => {
  const platform = usePlatform()
  const [isPressed, setIsPressed] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  const handlePressStart = () => {
    if (!disabled) setIsPressed(true)
  }

  const handlePressEnd = () => {
    setIsPressed(false)
    if (!disabled && onClick) onClick()
  }

  const variants = getAnimationVariants(platform.platform)

  return (
    <div
      className={cn(
        "transition-all duration-200 ease-out",
        isVisible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-4 scale-95",
        isPressed && "scale-95",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      style={{
        transitionDelay: `${delay}ms`,
        transform: isPressed ? 'scale(0.95)' : 'scale(1)',
        transition: `all ${isPressed ? '0.1s' : '0.2s'} ease-out`
      }}
      onTouchStart={handlePressStart}
      onTouchEnd={handlePressEnd}
      onMouseDown={handlePressStart}
      onMouseUp={handlePressEnd}
      onMouseLeave={() => setIsPressed(false)}
    >
      {children}
    </div>
  )
}

// Animated Button Component
interface AnimatedButtonProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  disabled?: boolean
  size?: 'sm' | 'default' | 'lg' | 'xl'
  variant?: 'default' | 'secondary' | 'outline'
}

export const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  children,
  className,
  onClick,
  disabled = false,
  size = 'default',
  variant = 'default'
}) => {
  const platform = usePlatform()
  const [isPressed, setIsPressed] = useState(false)

  const handlePressStart = () => {
    if (!disabled) {
      setIsPressed(true)
      // Trigger haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(10)
      }
    }
  }

  const handlePressEnd = () => {
    setIsPressed(false)
    if (!disabled && onClick) onClick()
  }

  const baseClasses = cn(
    "inline-flex items-center justify-center font-medium transition-all duration-200 ease-out",
    "focus:outline-none focus:ring-2 focus:ring-offset-2",
    "active:scale-95",
    disabled && "opacity-50 cursor-not-allowed",
    className
  )

  const sizeClasses = {
    sm: "min-h-[44px] px-4 py-2.5 text-mobile-sm rounded-lg",
    default: "min-h-[48px] px-5 py-3 text-mobile-base rounded-lg",
    lg: "min-h-[56px] px-8 py-4 text-mobile-lg rounded-lg",
    xl: "min-h-[64px] px-10 py-5 text-mobile-xl rounded-lg"
  }

  const variantClasses = {
    default: "bg-primary text-white hover:bg-primary/90 focus:ring-primary",
    secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500",
    outline: "border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-500"
  }

  return (
    <button
      className={cn(
        baseClasses,
        sizeClasses[size],
        variantClasses[variant],
        isPressed && "scale-95"
      )}
      disabled={disabled}
      onTouchStart={handlePressStart}
      onTouchEnd={handlePressEnd}
      onMouseDown={handlePressStart}
      onMouseUp={handlePressEnd}
      onMouseLeave={() => setIsPressed(false)}
    >
      {children}
    </button>
  )
}

// Fade In Animation Hook
export const useFadeIn = (delay: number = 0) => {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  return {
    isVisible,
    className: cn(
      "transition-all duration-500 ease-out",
      isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
    )
  }
}

// Stagger Animation Hook
export const useStaggerAnimation = (itemCount: number, staggerDelay: number = 100) => {
  const [visibleItems, setVisibleItems] = useState(0)

  useEffect(() => {
    const timers: number[] = []
    
    for (let i = 0; i < itemCount; i++) {
      const timer = setTimeout(() => {
        setVisibleItems(prev => prev + 1)
      }, i * staggerDelay)
      timers.push(timer)
    }

    return () => timers.forEach(timer => clearTimeout(timer))
  }, [itemCount, staggerDelay])

  return visibleItems
}

// Loading Spinner Component
export const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6", 
    lg: "w-8 h-8"
  }

  return (
    <div className={cn("animate-spin", sizeClasses[size])}>
      <svg className="w-full h-full" viewBox="0 0 24 24" fill="none">
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  )
}

// Pulse Animation Component
export const PulseAnimation: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="animate-pulse">
      {children}
    </div>
  )
}

// Bounce Animation Component
export const BounceAnimation: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="animate-bounce">
      {children}
    </div>
  )
}

// Slide In Animation Component
export const SlideInAnimation: React.FC<{
  children: React.ReactNode
  direction?: 'left' | 'right' | 'up' | 'down'
  delay?: number
  className?: string
}> = ({ children, direction = 'up', delay = 0, className }) => {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  const directionClasses = {
    left: "translate-x-4",
    right: "-translate-x-4", 
    up: "translate-y-4",
    down: "-translate-y-4"
  }

  return (
    <div
      className={cn(
        "transition-all duration-500 ease-out",
        isVisible ? "opacity-100 translate-x-0 translate-y-0" : `opacity-0 ${directionClasses[direction]}`,
        className
      )}
    >
      {children}
    </div>
  )
}

export default AnimatedCard 