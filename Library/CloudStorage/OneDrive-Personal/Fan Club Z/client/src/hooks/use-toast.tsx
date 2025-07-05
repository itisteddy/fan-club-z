import { useState, useCallback } from 'react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  title?: string
  description: string
  type: ToastType
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

interface ToastState {
  toasts: Toast[]
}

interface ToastActions {
  toast: (toast: Omit<Toast, 'id'>) => void
  success: (message: string, title?: string) => void
  error: (message: string, title?: string) => void
  info: (message: string, title?: string) => void
  warning: (message: string, title?: string) => void
  dismiss: (id: string) => void
  dismissAll: () => void
}

let toastCount = 0

export const useToast = (): ToastState & ToastActions => {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((toastData: Omit<Toast, 'id'>) => {
    const id = (++toastCount).toString()
    const toast: Toast = {
      id,
      duration: 5000,
      ...toastData,
    }

    setToasts((prevToasts) => [...prevToasts, toast])

    // Auto dismiss after duration
    if (toast.duration && toast.duration > 0) {
      setTimeout(() => {
        setToasts((prevToasts) => prevToasts.filter((t) => t.id !== id))
      }, toast.duration)
    }
  }, [])

  const success = useCallback((description: string, title?: string) => {
    addToast({
      type: 'success',
      title: title || 'Success',
      description,
    })
  }, [addToast])

  const error = useCallback((description: string, title?: string) => {
    addToast({
      type: 'error',
      title: title || 'Error',
      description,
      duration: 7000, // Longer duration for errors
    })
  }, [addToast])

  const info = useCallback((description: string, title?: string) => {
    addToast({
      type: 'info',
      title: title || 'Info',
      description,
    })
  }, [addToast])

  const warning = useCallback((description: string, title?: string) => {
    addToast({
      type: 'warning',
      title: title || 'Warning',
      description,
    })
  }, [addToast])

  const dismiss = useCallback((id: string) => {
    setToasts((prevToasts) => prevToasts.filter((t) => t.id !== id))
  }, [])

  const dismissAll = useCallback(() => {
    setToasts([])
  }, [])

  return {
    toasts,
    toast: addToast,
    success,
    error,
    info,
    warning,
    dismiss,
    dismissAll,
  }
}

// Toast component for rendering
export const ToastContainer = () => {
  const { toasts, dismiss } = useToast()

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <ToastComponent key={toast.id} toast={toast} onDismiss={dismiss} />
      ))}
    </div>
  )
}

interface ToastComponentProps {
  toast: Toast
  onDismiss: (id: string) => void
}

const ToastComponent = ({ toast, onDismiss }: ToastComponentProps) => {
  const getToastStyles = (type: ToastType) => {
    const baseStyles = "relative flex w-full max-w-sm items-center space-x-4 overflow-hidden rounded-lg border p-4 shadow-lg transition-all animate-slide-in"
    
    const typeStyles = {
      success: "border-green-200 bg-green-50 text-green-800",
      error: "border-red-200 bg-red-50 text-red-800",
      info: "border-blue-200 bg-blue-50 text-blue-800",
      warning: "border-yellow-200 bg-yellow-50 text-yellow-800",
    }
    
    return `${baseStyles} ${typeStyles[type]}`
  }

  const getIconForType = (type: ToastType) => {
    switch (type) {
      case 'success':
        return (
          <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )
      case 'error':
        return (
          <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )
      case 'info':
        return (
          <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'warning':
        return (
          <svg className="h-5 w-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        )
    }
  }

  return (
    <div className={getToastStyles(toast.type)}>
      <div className="flex-shrink-0">
        {getIconForType(toast.type)}
      </div>
      
      <div className="flex-1 min-w-0">
        {toast.title && (
          <p className="font-medium text-sm">{toast.title}</p>
        )}
        <p className={`text-sm ${toast.title ? 'text-opacity-90' : ''}`}>
          {toast.description}
        </p>
        
        {toast.action && (
          <button
            className="mt-2 text-sm font-medium underline hover:no-underline"
            onClick={toast.action.onClick}
          >
            {toast.action.label}
          </button>
        )}
      </div>
      
      <button
        className="flex-shrink-0 ml-4 text-sm font-medium hover:opacity-75"
        onClick={() => onDismiss(toast.id)}
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

export default useToast
