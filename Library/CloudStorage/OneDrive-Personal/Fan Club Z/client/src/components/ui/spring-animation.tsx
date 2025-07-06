import React, { useRef, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface SpringProps {
  children: React.ReactNode
  trigger?: boolean
  delay?: number
  className?: string
  springConfig?: {
    tension?: number
    friction?: number
    mass?: number
  }
}

export const Spring: React.FC<SpringProps> = ({
  children,
  trigger = true,
  delay = 0,
  className,
  springConfig = { tension: 280, friction: 60, mass: 1 }
}) => {
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (trigger) {
      const timer = setTimeout(() => {
        setIsVisible(true)
      }, delay)
      return () => clearTimeout(timer)
    }
  }, [trigger, delay])

  const springStyle = {
    transform: isVisible ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
    opacity: isVisible ? 1 : 0,
    transition: `all 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) ${delay}ms`
  }

  return (
    <div
      ref={ref}
      className={cn('will-change-transform', className)}
      style={springStyle}
    >
      {children}
    </div>
  )
}

interface PressableSpringProps {
  children: React.ReactNode
  onPress?: () => void
  className?: string
  disabled?: boolean
}

export const PressableSpring: React.FC<PressableSpringProps> = ({
  children,
  onPress,
  className,
  disabled = false
}) => {
  const [isPressed, setIsPressed] = useState(false)

  const handlePressStart = () => {
    if (!disabled) {
      setIsPressed(true)
      // Add haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(10)
      }
    }
  }

  const handlePressEnd = () => {
    setIsPressed(false)
    if (!disabled && onPress) {
      onPress()
    }
  }

  const springStyle = {
    transform: isPressed ? 'scale(0.95)' : 'scale(1)',
    transition: 'transform 0.1s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
  }

  return (
    <div
      className={cn(
        'cursor-pointer select-none will-change-transform',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      style={springStyle}
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

interface StaggeredSpringProps {
  children: React.ReactNode[]
  delay?: number
  staggerDelay?: number
  className?: string
}

export const StaggeredSpring: React.FC<StaggeredSpringProps> = ({
  children,
  delay = 0,
  staggerDelay = 100,
  className
}) => {
  return (
    <div className={className}>
      {children.map((child, index) => (
        <Spring
          key={index}
          delay={delay + (index * staggerDelay)}
          trigger={true}
        >
          {child}
        </Spring>
      ))}
    </div>
  )
} 