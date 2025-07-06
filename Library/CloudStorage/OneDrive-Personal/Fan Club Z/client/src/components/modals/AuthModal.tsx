import React, { useState } from 'react'
import { X, Mail, Lock, Eye, EyeOff, Gift, Apple as AppleIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/hooks/use-toast'
import { validateEmail } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface AuthModalProps {
  show: boolean
  onClose: () => void
  context?: {
    action?: string
    betTitle?: string
    potentialReturn?: string
    incentive?: string
  }
  onSuccess?: () => void
}

export const AuthModal: React.FC<AuthModalProps> = ({
  show,
  onClose,
  context,
  onSuccess
}) => {
  const { login, register, isLoading, error, clearError } = useAuthStore()
  const { success, error: showError } = useToast()
  
  const [isLogin, setIsLogin] = useState(true)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    username: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }

    if (!isLogin) {
      if (!formData.firstName) {
        newErrors.firstName = 'First name is required'
      }
      if (!formData.lastName) {
        newErrors.lastName = 'Last name is required'
      }
      if (!formData.username) {
        newErrors.username = 'Username is required'
      }
      if (!formData.phone) {
        newErrors.phone = 'Phone number is required'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()

    if (!validateForm()) return

    try {
      if (isLogin) {
        await login({ email: formData.email, password: formData.password })
        success('Welcome back!')
      } else {
        await register({
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          username: formData.username
        })
        success('Account created successfully!')
      }
      
      onSuccess?.()
      onClose()
    } catch (err: any) {
      showError(err.message || `${isLogin ? 'Login' : 'Registration'} failed`)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleSocialLogin = (provider: string) => {
    // TODO: Implement social login
    showError(`${provider} login not implemented yet`)
  }

  if (!show) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-md bg-white dark:bg-dark-surface rounded-t-apple-2xl sm:rounded-apple-2xl shadow-apple-modal transform transition-transform duration-300 ease-out">
        {/* Handle for mobile */}
        <div className="flex justify-center pt-4 pb-2 sm:hidden">
          <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-2">
          <div className="flex-1">
            <h2 className="text-title-1 font-bold text-black dark:text-white">
              {isLogin ? 'Welcome Back' : 'Join Fan Club Z'}
            </h2>
            <p className="text-body-sm text-gray-600 dark:text-gray-400 mt-1">
              {isLogin ? 'Sign in to continue' : 'Create your account'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors touch-manipulation"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Context Banner */}
        {context?.incentive && (
          <div className="mx-6 mb-6 bg-gradient-to-r from-primary/10 to-system-indigo/10 border border-primary/20 rounded-apple-lg p-4">
            <div className="flex items-center mb-2">
              <Gift className="w-5 h-5 text-primary mr-2" />
              <span className="font-semibold text-primary text-body">Welcome Bonus!</span>
            </div>
            <p className="text-body-sm text-gray-700 dark:text-gray-300">
              {context.incentive}
            </p>
            {context.betTitle && (
              <p className="text-body-sm text-gray-600 dark:text-gray-400 mt-1">
                Bet: "{context.betTitle}"
              </p>
            )}
          </div>
        )}

        {/* App Icon & Welcome */}
        <div className="text-center px-6 mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-system-indigo rounded-apple-xl mx-auto mb-4 flex items-center justify-center shadow-apple">
            <span className="text-white font-bold text-2xl">Z</span>
          </div>
          <p className="text-body text-gray-600 dark:text-gray-400">
            Bet on what matters to you
          </p>
        </div>

        {/* Social Login */}
        <div className="px-6 mb-6">
          <div className="space-y-3">
            <Button
              type="button"
              className="w-full h-[50px] bg-black dark:bg-white text-white dark:text-black rounded-apple-md font-semibold text-body transition-apple touch-manipulation active:scale-95"
              onClick={() => handleSocialLogin('Apple')}
              disabled={isLoading}
            >
              <AppleIcon className="w-5 h-5 mr-3" />
              Continue with Apple
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full h-[50px] bg-white dark:bg-dark-tertiary border border-gray-200 dark:border-gray-700 text-black dark:text-white rounded-apple-md font-semibold text-body transition-apple touch-manipulation active:scale-95"
              onClick={() => handleSocialLogin('Google')}
              disabled={isLoading}
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </Button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-gray-700" />
              </div>
              <div className="relative flex justify-center text-caption-1">
                <span className="px-4 bg-white dark:bg-dark-surface text-gray-500 dark:text-gray-400 font-medium">
                  or
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 pb-6">
          <div className="space-y-4">
            {!isLogin && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      className={cn(
                        "input-apple",
                        errors.firstName && "border-system-red focus:border-system-red focus:ring-system-red"
                      )}
                      placeholder="First name"
                    />
                    {errors.firstName && (
                      <p className="text-system-red text-caption-1 mt-1">{errors.firstName}</p>
                    )}
                  </div>
                  <div>
                    <Input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      className={cn(
                        "input-apple",
                        errors.lastName && "border-system-red focus:border-system-red focus:ring-system-red"
                      )}
                      placeholder="Last name"
                    />
                    {errors.lastName && (
                      <p className="text-system-red text-caption-1 mt-1">{errors.lastName}</p>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Input
                      type="text"
                      value={formData.username}
                      onChange={(e) => handleInputChange('username', e.target.value)}
                      className={cn(
                        "input-apple",
                        errors.username && "border-system-red focus:border-system-red focus:ring-system-red"
                      )}
                      placeholder="Username"
                    />
                    {errors.username && (
                      <p className="text-system-red text-caption-1 mt-1">{errors.username}</p>
                    )}
                  </div>
                  <div>
                    <Input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className={cn(
                        "input-apple",
                        errors.phone && "border-system-red focus:border-system-red focus:ring-system-red"
                      )}
                      placeholder="Phone"
                    />
                    {errors.phone && (
                      <p className="text-system-red text-caption-1 mt-1">{errors.phone}</p>
                    )}
                  </div>
                </div>
              </>
            )}

            <div>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={cn(
                  "input-apple",
                  errors.email && "border-system-red focus:border-system-red focus:ring-system-red"
                )}
                placeholder="Email address"
                autoComplete="email"
              />
              {errors.email && (
                <p className="text-system-red text-caption-1 mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className={cn(
                    "input-apple pr-12",
                    errors.password && "border-system-red focus:border-system-red focus:ring-system-red"
                  )}
                  placeholder="Password"
                  autoComplete={isLogin ? "current-password" : "new-password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors w-8 h-8 flex items-center justify-center rounded-apple-sm hover:bg-gray-100 dark:hover:bg-gray-800 touch-manipulation"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-system-red text-caption-1 mt-1">{errors.password}</p>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-system-red/10 border border-system-red/20 rounded-apple-md p-3">
                <p className="text-system-red text-body-sm font-medium">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full btn-apple-primary"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  {isLogin ? 'Signing In...' : 'Creating Account...'}
                </div>
              ) : (
                isLogin ? 'Sign In' : 'Create Account'
              )}
            </Button>

            {/* Toggle Mode */}
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-primary font-medium text-body hover:underline transition-colors touch-manipulation"
              >
                {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
              </button>
            </div>
          </div>
        </form>

        {/* Safe area padding */}
        <div className="safe-bottom" />
      </div>
    </div>
  )
}

export default AuthModal