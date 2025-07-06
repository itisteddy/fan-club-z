// Enhanced Notifications and Feedback System
// File: src/components/ui/enhanced-notifications.tsx

import React, { useState, useEffect, useCallback } from 'react'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { useHapticFeedback } from './enhanced-accessibility'
import { useReducedMotion } from '../../lib/theme'

// Toast Types
export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  type: ToastType
  title?: string
  message: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
  timestamp: number
}

// Toast Container Component
interface ToastContainerProps {
  toasts: Toast[]
  onRemove: (id: string) => void
  position?: 'top' | 'bottom'
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ 
  toasts, 
  onRemove, 
  position = 'top' 
}) => {
  const { feedback } = useHapticFeedback()
  const prefersReducedMotion = useReducedMotion()

  const handleRemove = useCallback((id: string) => {
    feedback('light')
    onRemove(id)
  }, [feedback, onRemove])

  if (toasts.length === 0) return null

  return (
    <div className={`fixed ${position === 'top' ? 'top-4' : 'bottom-4'} left-4 right-4 z-50 space-y-3`}>
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onRemove={handleRemove}
          prefersReducedMotion={prefersReducedMotion}
        />
      ))}
    </div>
  )
}

// Individual Toast Item
interface ToastItemProps {
  toast: Toast
  onRemove: (id: string) => void
  prefersReducedMotion: boolean
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onRemove, prefersReducedMotion }) => {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Animate in
    const timer = setTimeout(() => setIsVisible(true), 10)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false)
        setTimeout(() => onRemove(toast.id), prefersReducedMotion ? 0 : 300)
      }, toast.duration)

      return () => clearTimeout(timer)
    }
  }, [toast.id, toast.duration, onRemove, prefersReducedMotion])

  const getToastStyles = () => {
    const baseStyles = "bg-white dark:bg-dark-surface rounded-apple-lg shadow-apple-modal border border-gray-100 dark:border-gray-800 p-4"
    const animationStyles = prefersReducedMotion 
      ? "opacity-100" 
      : `${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'} transition-all duration-300 ease-apple`

    return `${baseStyles} ${animationStyles}`
  }

  const getIcon = () => {
    const iconClass = "w-5 h-5"
    switch (toast.type) {
      case 'success':
        return <CheckCircle className={`${iconClass} text-system-green`} />
      case 'error':
        return <AlertCircle className={`${iconClass} text-system-red`} />
      case 'warning':
        return <AlertTriangle className={`${iconClass} text-system-orange`} />
      case 'info':
        return <Info className={`${iconClass} text-primary`} />
      default:
        return null
    }
  }

  return (
    <div className={getToastStyles()}>
      <div className="flex items-start space-x-3">
        {getIcon()}
        <div className="flex-1 min-w-0">
          {toast.title && (
            <h4 className="text-body font-semibold text-black dark:text-white mb-1">
              {toast.title}
            </h4>
          )}
          <p className="text-body-sm text-gray-600 dark:text-gray-400">
            {toast.message}
          </p>
          {toast.action && (
            <button
              onClick={toast.action.onClick}
              className="mt-2 text-primary text-body-sm font-medium hover:underline"
            >
              {toast.action.label}
            </button>
          )}
        </div>
        <button
          onClick={() => onRemove(toast.id)}
          className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>
    </div>
  )
}

// Enhanced Toast Hook
export const useEnhancedToast = () => {
  const [toasts, setToasts] = useState<Toast[]>([])
  const { feedback } = useHapticFeedback()

  const showToast = useCallback((
    type: ToastType,
    message: string,
    options: {
      title?: string
      duration?: number
      action?: { label: string; onClick: () => void }
    } = {}
  ) => {
    const id = Date.now().toString()
    const newToast: Toast = {
      id,
      type,
      message,
      title: options.title,
      duration: options.duration ?? 5000,
      action: options.action,
      timestamp: Date.now()
    }

    setToasts(prev => [...prev, newToast])
    feedback(type === 'error' ? 'heavy' : type === 'warning' ? 'medium' : 'light')
  }, [feedback])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const clearAllToasts = useCallback(() => {
    setToasts([])
  }, [])

  return {
    toasts,
    showToast,
    removeToast,
    clearAllToasts,
    ToastContainer: () => <ToastContainer toasts={toasts} onRemove={removeToast} />
  }
}

// Alert Component
interface AlertProps {
  type: ToastType
  title?: string
  children: React.ReactNode
  onClose?: () => void
  className?: string
}

export const Alert: React.FC<AlertProps> = ({ 
  type, 
  title, 
  children, 
  onClose, 
  className = '' 
}) => {
  const getAlertStyles = () => {
    const baseStyles = "rounded-apple-lg p-4 border"
    let typeStyles = ""

    switch (type) {
      case 'success':
        typeStyles = "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
        break
      case 'error':
        typeStyles = "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
        break
      case 'warning':
        typeStyles = "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800"
        break
      case 'info':
        typeStyles = "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
        break
    }

    return `${baseStyles} ${typeStyles} ${className}`
  }

  const getIcon = () => {
    const iconClass = "w-5 h-5"
    switch (type) {
      case 'success':
        return <CheckCircle className={`${iconClass} text-system-green`} />
      case 'error':
        return <AlertCircle className={`${iconClass} text-system-red`} />
      case 'warning':
        return <AlertTriangle className={`${iconClass} text-system-orange`} />
      case 'info':
        return <Info className={`${iconClass} text-primary`} />
      default:
        return null
    }
  }

  return (
    <div className={getAlertStyles()}>
      <div className="flex items-start space-x-3">
        {getIcon()}
        <div className="flex-1 min-w-0">
          {title && (
            <h4 className="text-body font-semibold text-black dark:text-white mb-1">
              {title}
            </h4>
          )}
          <div className="text-body-sm text-gray-600 dark:text-gray-400">
            {children}
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        )}
      </div>
    </div>
  )
}

// Progress Indicator Component
interface ProgressIndicatorProps {
  value: number
  max?: number
  size?: 'small' | 'medium' | 'large'
  variant?: 'linear' | 'circular'
  showLabel?: boolean
  className?: string
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  value,
  max = 100,
  size = 'medium',
  variant = 'linear',
  showLabel = false,
  className = ''
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)
  const prefersReducedMotion = useReducedMotion()

  if (variant === 'circular') {
    const sizeClasses = {
      small: 'w-8 h-8',
      medium: 'w-12 h-12',
      large: 'w-16 h-16'
    }

    const strokeWidth = size === 'small' ? 2 : size === 'medium' ? 3 : 4
    const radius = size === 'small' ? 12 : size === 'medium' ? 18 : 24
    const circumference = 2 * Math.PI * radius
    const strokeDasharray = circumference
    const strokeDashoffset = circumference - (percentage / 100) * circumference

    return (
      <div className={`relative ${sizeClasses[size]} ${className}`}>
        <svg className="w-full h-full transform -rotate-90" viewBox={`0 0 ${radius * 2 + strokeWidth} ${radius * 2 + strokeWidth}`}>
          {/* Background circle */}
          <circle
            cx={radius + strokeWidth / 2}
            cy={radius + strokeWidth / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            className="text-gray-200 dark:text-gray-700"
          />
          {/* Progress circle */}
          <circle
            cx={radius + strokeWidth / 2}
            cy={radius + strokeWidth / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            className="text-primary transition-all duration-300 ease-apple"
            style={{
              transition: prefersReducedMotion ? 'none' : 'stroke-dashoffset 0.3s ease'
            }}
          />
        </svg>
        {showLabel && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-caption-1 font-medium text-black dark:text-white">
              {Math.round(percentage)}%
            </span>
          </div>
        )}
      </div>
    )
  }

  // Linear variant
  const sizeClasses = {
    small: 'h-1',
    medium: 'h-2',
    large: 'h-3'
  }

  return (
    <div className={`w-full ${className}`}>
      <div className={`bg-gray-200 dark:bg-gray-700 rounded-full ${sizeClasses[size]} overflow-hidden`}>
        <div
          className="bg-primary h-full rounded-full transition-all duration-300 ease-apple"
          style={{
            width: `${percentage}%`,
            transition: prefersReducedMotion ? 'none' : 'width 0.3s ease'
          }}
        />
      </div>
      {showLabel && (
        <div className="mt-2 text-caption-1 text-gray-500 dark:text-gray-400 text-center">
          {Math.round(percentage)}%
        </div>
      )}
    </div>
  )
}

// Loading Spinner Component
interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large'
  color?: 'primary' | 'white' | 'gray'
  className?: string
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  color = 'primary',
  className = ''
}) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-6 h-6',
    large: 'w-8 h-8'
  }

  const colorClasses = {
    primary: 'text-primary',
    white: 'text-white',
    gray: 'text-gray-400'
  }

  const prefersReducedMotion = useReducedMotion()

  return (
    <div className={`${sizeClasses[size]} ${colorClasses[color]} ${className}`}>
      <svg
        className="animate-spin"
        style={{ animation: prefersReducedMotion ? 'none' : 'spin 1s linear infinite' }}
        fill="none"
        viewBox="0 0 24 24"
      >
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

// Status Badge Component
interface StatusBadgeProps {
  status: 'success' | 'error' | 'warning' | 'info' | 'pending'
  children: React.ReactNode
  size?: 'small' | 'medium'
  className?: string
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  children,
  size = 'medium',
  className = ''
}) => {
  const sizeClasses = {
    small: 'px-2 py-1 text-caption-2',
    medium: 'px-3 py-1 text-caption-1'
  }

  const statusClasses = {
    success: 'bg-green-100 dark:bg-green-900/20 text-system-green',
    error: 'bg-red-100 dark:bg-red-900/20 text-system-red',
    warning: 'bg-orange-100 dark:bg-orange-900/20 text-system-orange',
    info: 'bg-blue-100 dark:bg-blue-900/20 text-primary',
    pending: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
  }

  return (
    <span className={`inline-flex items-center rounded-apple-sm font-medium ${sizeClasses[size]} ${statusClasses[status]} ${className}`}>
      {children}
    </span>
  )
} 