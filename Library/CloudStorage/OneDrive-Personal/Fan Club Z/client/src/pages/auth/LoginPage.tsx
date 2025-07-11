import React, { useState } from 'react'
import { Link, useLocation } from 'wouter'
import { Eye, EyeOff, Mail, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/hooks/use-toast'
import { validateEmail } from '@/lib/utils'
import { socialAuthService } from '@/services/socialAuthService'

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
  const [backendErrors, setBackendErrors] = useState<string[]>([])

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

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    setBackendErrors([])

    if (!validateForm()) return

    try {
      await login(formData)
      success('Welcome back!')
      setLocation('/discover')
    } catch (err: any) {
      // Patch: show all backend error details
      let backendErrorList: string[] = []
      if (err.response && err.response.details) {
        err.response.details.forEach((detail: any) => {
          if (detail.field && detail.message) {
            backendErrorList.push(`${detail.field}: ${detail.message}`)
          } else if (detail.message) {
            backendErrorList.push(detail.message)
          }
        })
      }
      setBackendErrors(backendErrorList)
      showError(err.message || 'Login failed')
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleDemoLogin = async () => {
    setFormData({
      email: 'demo@fanclubz.app',
      password: 'demo123',
    })
    setErrors({})
    
    // Automatically submit the form with demo credentials
    try {
      await login({
        email: 'demo@fanclubz.app',
        password: 'demo123',
      })
      success('Welcome back!')
      setLocation('/discover')
    } catch (err: any) {
      showError(err.message || 'Demo login failed')
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
        showError(response.error || `${provider} login failed`)
      }
    } catch (error: any) {
      showError(error.message || `${provider} login failed`)
    } finally {
      setSocialLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* App icon */}
      <div className="flex-1 flex items-center justify-center px-8">
        <div className="w-full max-w-sm">
          <div className="w-20 h-20 bg-blue-500 rounded-[18px] mx-auto mb-8 flex items-center justify-center">
            <span className="text-white text-3xl font-bold">Z</span>
          </div>
          
          <h1 className="text-title-1 font-bold text-center mb-2">
            Welcome to Fan Club Z
          </h1>
          <p className="text-body text-gray-500 text-center mb-8">
            Sign in to your account
          </p>
          
          {/* Social Login Buttons */}
          <div className="space-y-3 mb-6">
            <Button
              type="button"
              className="w-full h-[50px] bg-black text-white rounded-[10px] font-semibold text-body flex items-center justify-center active:scale-95 transition-transform focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
              onClick={() => handleSocialLogin('apple')}
              disabled={isLoading || socialLoading !== null}
              aria-label="Continue with Apple"
            >
              {socialLoading === 'apple' ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3" />
              ) : (
                <svg className="w-5 h-5 mr-3 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
              )}
              <span className="text-white">Continue with Apple</span>
            </Button>

            <Button
              type="button"
              variant="apple-secondary"
              className="w-full h-[50px] bg-white border border-gray-200 text-black rounded-[10px] font-semibold text-body transition-apple touch-manipulation active:scale-95"
              onClick={() => handleSocialLogin('google')}
              disabled={isLoading || socialLoading !== null}
            >
              {socialLoading === 'google' ? (
                <div className="w-5 h-5 border-2 border-gray-600 border-t-transparent rounded-full animate-spin mr-3" />
              ) : (
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
              )}
              Continue with Google
            </Button>
          </div>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-caption-1">
              <span className="px-4 bg-white text-gray-500">or</span>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Backend Error List */}
            {backendErrors.length > 0 && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-[10px] text-body-sm mb-2">
                <ul className="list-disc pl-5">
                  {backendErrors.map((msg, idx) => (
                    <li key={idx}>{msg}</li>
                  ))}
                </ul>
              </div>
            )}
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-body-sm font-medium text-gray-600 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="Enter your email"
                  className="pl-12"
                  disabled={isLoading || socialLoading !== null}
                />
              </div>
              {errors.email && (
                <p className="text-red-500 text-caption-1 mt-1">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-body-sm font-medium text-gray-600 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder="Enter your password"
                  className="pl-12 pr-12"
                  disabled={isLoading || socialLoading !== null}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-caption-1 mt-1">{errors.password}</p>
              )}
            </div>

            {/* Demo Account */}
            <div className="bg-blue-50 border border-blue-200 rounded-[10px] p-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-body-sm font-semibold text-blue-900 mb-1">Demo Account</h3>
                  <p className="text-caption-1 text-blue-700">
                    Email: demo@fanclubz.app<br />
                    Password: demo123
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={handleDemoLogin}
                  variant="apple-secondary"
                  size="apple-sm"
                  className="bg-blue-100 text-blue-700 hover:bg-blue-200"
                  data-testid="demo-login-button"
                >
                  Try Demo
                </Button>
              </div>
            </div>

            {/* Forgot Password */}
            <div className="text-right">
              <button
                type="button"
                className="text-body-sm text-blue-500 hover:text-blue-600 transition-colors"
              >
                Forgot password?
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-[10px] text-body-sm">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading || socialLoading !== null}
              className="w-full"
              variant="apple"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </div>
      </div>
      
      {/* Footer */}
      <div className="p-8 text-center">
        <p className="text-body-sm text-gray-500">
          Don't have an account? 
          <Link href="/auth/register">
            <button className="text-blue-500 ml-1">Sign up</button>
          </Link>
        </p>
      </div>
    </div>
  )
}

export default LoginPage
