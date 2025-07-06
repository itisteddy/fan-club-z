import React, { useState } from 'react'
import { Link, useLocation } from 'wouter'
import { Eye, EyeOff, Mail, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/hooks/use-toast'
import { validateEmail } from '@/lib/utils'

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

    if (!validateForm()) return

    try {
      await login(formData)
      success('Welcome back!')
      setLocation('/discover')
    } catch (err: any) {
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

  const handleDemoLogin = () => {
    setFormData({
      email: 'demo@fanclubz.app',
      password: 'demo123',
    })
    setErrors({})
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
          
          <form onSubmit={handleSubmit} className="space-y-4">
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
                  disabled={isLoading}
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
                  disabled={isLoading}
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
              disabled={isLoading}
              className="w-full"
              variant="apple"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-caption-1">
              <span className="px-4 bg-white text-gray-500">or</span>
            </div>
          </div>

          {/* Social Login */}
          <div className="space-y-3">
            <Button
              type="button"
              variant="apple-secondary"
              className="w-full"
              disabled={isLoading}
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
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
          </div>
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
