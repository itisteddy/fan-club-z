import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'wouter'
import { Eye, EyeOff, Mail, Lock, AlertCircle, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/hooks/use-toast'
import { validateEmail } from '@/lib/utils'
import { socialAuthService } from '@/services/socialAuthService'

const ValidationError: React.FC<{ error: string }> = ({ error }) => (
  <div className="text-red-500 text-sm mt-1 flex items-center space-x-1">
    <AlertCircle className="w-4 h-4 flex-shrink-0" />
    <span>{error}</span>
  </div>
)

export const LoginPage: React.FC = () => {
  const [, setLocation] = useLocation()
  const { login, isLoading, error, clearError } = useAuthStore()
  const { success, error: showError } = useToast()
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [socialLoading, setSocialLoading] = useState<'apple' | 'google' | null>(null)

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Please enter your email address'
    } else if (!validateEmail(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address'
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Please enter your password'
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters long'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()

    if (!validateForm()) {
      showError('Please check your information and try again')
      return
    }

    try {
      const loginData = {
        email: formData.email.trim().toLowerCase(),
        password: formData.password
      }
      
      await login(loginData)
      success('Welcome back!')
      setLocation('/discover')
    } catch (err: any) {
      console.error('Login error:', err)
      
      let userFriendlyMessage = 'Unable to sign in. Please try again.'
      
      if (err.message) {
        if (err.message.includes('Invalid credentials') || 
            err.message.includes('invalid email or password') ||
            err.message.includes('User not found') || 
            err.message.includes('No user found')) {
          userFriendlyMessage = 'Email or password is incorrect. Please check and try again.'
        } else if (err.message.includes('Account locked') || err.message.includes('locked')) {
          userFriendlyMessage = 'Your account is temporarily locked. Please try again in a few minutes.'
        } else if (err.message.includes('Network') || 
                   err.message.includes('fetch') || 
                   err.message.includes('Failed to fetch') || 
                   err.message.includes('timed out') ||
                   err.message.includes('ECONNREFUSED') ||
                   err.message.includes('Backend server is not running')) {
          userFriendlyMessage = 'Connection problem. Please check your internet connection and try again.'
        } else if (err.message.includes('500') || err.message.includes('Internal Server Error')) {
          userFriendlyMessage = 'Something went wrong on our end. Please try again in a moment.'
        }
      }
      
      showError(userFriendlyMessage)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleSocialLogin = async (provider: 'apple' | 'google') => {
    try {
      setSocialLoading(provider)
      clearError()

      const response = provider === 'apple' 
        ? await socialAuthService.signInWithApple()
        : await socialAuthService.signInWithGoogle()

      if (response.success && response.user) {
        success(`Welcome back, ${response.user.firstName || response.user.email}!`)
        setLocation('/discover')
      } else {
        showError(response.error || 'Unable to sign in. Please try again.')
      }
    } catch (error: any) {
      showError('Unable to sign in. Please try again.')
    } finally {
      setSocialLoading(null)
    }
  }

  const getInputClassName = (fieldName: string) => {
    if (errors[fieldName]) {
      return "border-red-300 focus:border-red-500 focus:ring-red-500 bg-red-50"
    } else if (formData[fieldName as keyof typeof formData] && !errors[fieldName]) {
      return "border-green-300 focus:border-green-500 focus:ring-green-500 bg-green-50"
    } else {
      return "border-gray-200 focus:border-blue-500 focus:ring-blue-500 bg-white"
    }
  }

  const hasValidInput = (fieldName: string) => {
    return formData[fieldName as keyof typeof formData] && !errors[fieldName]
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header with App Icon */}
      <div className="pt-12 pb-6">
        <div className="w-20 h-20 bg-blue-500 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg">
          <span className="text-white text-3xl font-bold">Z</span>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 px-6 pb-8">
        <div className="max-w-sm mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome to Fan Club Z
            </h1>
            <p className="text-gray-600">
              Sign in to your account
            </p>
          </div>
          
          {/* Social Login Buttons */}
          <div className="space-y-3 mb-6">
            <Button
              type="button"
              className="w-full h-12 bg-black text-white rounded-lg font-semibold flex items-center justify-center transition-transform active:scale-95"
              onClick={() => handleSocialLogin('apple')}
              disabled={isLoading || socialLoading !== null}
            >
              {socialLoading === 'apple' ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3" />
              ) : (
                <svg className="w-5 h-5 mr-3 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
              )}
              Continue with Apple
            </Button>

            <Button
              type="button"
              className="w-full h-12 bg-white border border-gray-300 text-gray-900 rounded-lg font-semibold flex items-center justify-center transition-transform active:scale-95 hover:bg-gray-50"
              onClick={() => handleSocialLogin('google')}
              disabled={isLoading || socialLoading !== null}
            >
              {socialLoading === 'google' ? (
                <div className="w-5 h-5 border-2 border-gray-600 border-t-transparent rounded-full animate-spin mr-3" />
              ) : (
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              Continue with Google
            </Button>
          </div>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-4 bg-white text-gray-500 text-sm">or</span>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 z-10" />
                <Input
                  id="email"
                  type="email"
                  variant="ios"
                  autoComplete="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="Enter your email"
                  className={`pl-12 ${hasValidInput('email') ? 'pr-12' : 'pr-4'} ${getInputClassName('email')}`}
                  disabled={isLoading || socialLoading !== null}
                />
                {hasValidInput('email') && (
                  <CheckCircle className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500 w-5 h-5 z-10" />
                )}
              </div>
              {errors.email && <ValidationError error={errors.email} />}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 z-10" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  variant="ios"
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder="Enter your password"
                  className={`pl-12 pr-12 ${getInputClassName('password')}`}
                  disabled={isLoading || socialLoading !== null}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 z-10"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && <ValidationError error={errors.password} />}
            </div>

            {/* Forgot Password */}
            <div className="text-right">
              <button
                type="button"
                className="text-sm text-blue-500 hover:text-blue-600 font-medium transition-colors"
              >
                Forgot password?
              </button>
            </div>

            {/* General Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-2">
              <Button
                type="submit"
                disabled={isLoading || socialLoading !== null}
                className="w-full h-12 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </div>
          </form>

          {/* Sign Up Link */}
          <div className="text-center mt-6">
            <p className="text-sm text-gray-500">
              Don't have an account?{' '}
              <Link href="/auth/register">
                <button className="text-blue-500 font-medium hover:text-blue-600">
                  Sign up
                </button>
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage