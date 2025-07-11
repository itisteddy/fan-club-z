import React, { useState } from 'react'
import { Link, useLocation } from 'wouter'
import { Eye, EyeOff, Mail, Lock, User, Phone, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/hooks/use-toast'
import { validateEmail, validatePhone, getApiUrl } from '@/lib/utils'

export const RegisterPage: React.FC = () => {
  const [, setLocation] = useLocation()
  const { register, isLoading, error, clearError } = useAuthStore()
  const { success, error: showError } = useToast()
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    password: '',
    confirmPassword: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [acceptAgeVerification, setAcceptAgeVerification] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [backendErrors, setBackendErrors] = useState<string[]>([])

  React.useEffect(() => {
    // Log API URL for debugging
    console.log('API URL:', getApiUrl())
  }, [])

  // Calculate age from date of birth
  const calculateAge = (dateOfBirth: string): number => {
    const today = new Date()
    const birthDate = new Date(dateOfBirth)
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    
    return age
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required'
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required'
    }

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required'
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters'
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores'
    }

    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email'
    }

    if (!formData.phone) {
      newErrors.phone = 'Phone number is required'
    } else if (!/^\+?[\d\s\-\(\)]{10,20}$/.test(formData.phone)) {
      newErrors.phone = 'Phone number must be 10-20 digits and can include +, spaces, dashes, and parentheses (e.g. +1 555-123-4567)'
    }

    // Age verification (18+ required for gambling)
    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = 'Date of birth is required'
    } else {
      const age = calculateAge(formData.dateOfBirth)
      if (age < 18) {
        newErrors.dateOfBirth = 'You must be at least 18 years old to use this platform'
      } else if (age > 120) {
        newErrors.dateOfBirth = 'Please enter a valid date of birth'
      }
    }

    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters'
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    if (!acceptTerms) {
      newErrors.terms = 'You must accept the terms and conditions'
    }

    if (!acceptAgeVerification) {
      newErrors.ageVerification = 'You must confirm you are 18 or older'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    setBackendErrors([])
    
    console.log('🚀 Starting registration process...')
    console.log('Form data:', formData)
    console.log('API URL:', getApiUrl())

    if (!validateForm()) {
      showError('Please fix the errors in the form and try again.')
      console.error('❌ Registration validation failed:', errors)
      return
    }

    try {
      const { confirmPassword, ...registerData } = formData
      console.log('✅ Client validation passed, calling register API...')
      
      await register(registerData)
      
      console.log('✅ Registration successful!')
      success('Account created successfully!')
      setLocation('/discover')
    } catch (err: any) {
      console.error('❌ Registration error caught:', err)
      console.error('Error response:', err.response)
      console.error('Error details:', err.details)
      
      let backendError = err.message || 'Registration failed'
      let backendFieldErrors: Record<string, string> = {}
      let backendErrorList: string[] = []
      
      if (err.response && err.response.details) {
        err.response.details.forEach((detail: any) => {
          if (detail.field && detail.message) {
            backendFieldErrors[detail.field] = detail.message
            backendErrorList.push(`${detail.field}: ${detail.message}`)
          } else if (detail.message) {
            backendErrorList.push(detail.message)
          }
        })
      }
      
      setErrors(prev => ({ ...prev, ...backendFieldErrors }))
      setBackendErrors(backendErrorList.length > 0 ? backendErrorList : [backendError])
      showError(backendError)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
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
            Create Account
          </h1>
          <p className="text-body text-gray-500 text-center mb-8">
            Join Fan Club Z and start betting on what matters
          </p>
          
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
            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-body-sm font-medium text-gray-600 mb-2">
                  First Name
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    id="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    placeholder="First name"
                    className="pl-12"
                    disabled={isLoading}
                  />
                </div>
                {errors.firstName && (
                  <p className="text-red-500 text-caption-1 mt-1">{errors.firstName}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="lastName" className="block text-body-sm font-medium text-gray-600 mb-2">
                  Last Name
                </label>
                <Input
                  id="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  placeholder="Last name"
                  disabled={isLoading}
                />
                {errors.lastName && (
                  <p className="text-red-500 text-caption-1 mt-1">{errors.lastName}</p>
                )}
              </div>
            </div>

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

            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-body-sm font-medium text-gray-600 mb-2">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  id="username"
                  type="text"
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  placeholder="Choose a username"
                  className="pl-12"
                  disabled={isLoading}
                />
              </div>
              {errors.username && (
                <p className="text-red-500 text-caption-1 mt-1">{errors.username}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-body-sm font-medium text-gray-600 mb-2">
                Phone Number
              </label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="e.g. +1 555-123-4567"
                disabled={isLoading}
              />
              <p className="text-gray-400 text-caption-1 mt-1">Phone number must be 10-20 digits and can include +, spaces, dashes, and parentheses.</p>
              {errors.phone && (
                <p className="text-red-500 text-caption-1 mt-1">{errors.phone}</p>
              )}
            </div>

            {/* Date of Birth */}
            <div>
              <label htmlFor="dateOfBirth" className="block text-body-sm font-medium text-gray-600 mb-2">
                Date of Birth *
              </label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="pl-12"
                  disabled={isLoading}
                />
              </div>
              {errors.dateOfBirth && (
                <p className="text-red-500 text-caption-1 mt-1">{errors.dateOfBirth}</p>
              )}
              <p className="text-caption-1 text-gray-500 mt-1">
                You must be 18 or older to use this platform
              </p>
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
                  placeholder="Create a password"
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

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-body-sm font-medium text-gray-600 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  placeholder="Confirm your password"
                  className="pl-12 pr-12"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-red-500 text-caption-1 mt-1">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Terms */}
            <div>
              <label className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => {
                    setAcceptTerms(e.target.checked)
                    if (errors.terms) {
                      setErrors(prev => ({ ...prev, terms: '' }))
                    }
                  }}
                  className="mt-1 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                  disabled={isLoading}
                />
                <span className="text-body-sm text-gray-600">
                  I agree to the{' '}
                  <button type="button" className="text-blue-500 hover:text-blue-600 underline">
                    Terms of Service
                  </button>{' '}
                  and{' '}
                  <button type="button" className="text-blue-500 hover:text-blue-600 underline">
                    Privacy Policy
                  </button>
                </span>
              </label>
              {errors.terms && (
                <p className="text-red-500 text-caption-1 mt-1">{errors.terms}</p>
              )}
            </div>

            {/* Age Verification */}
            <div>
              <label className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  checked={acceptAgeVerification}
                  onChange={(e) => {
                    setAcceptAgeVerification(e.target.checked)
                    if (errors.ageVerification) {
                      setErrors(prev => ({ ...prev, ageVerification: '' }))
                    }
                  }}
                  className="mt-1 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                  disabled={isLoading}
                />
                <span className="text-body-sm text-gray-600">
                  I confirm that I am 18 years or older
                </span>
              </label>
              {errors.ageVerification && (
                <p className="text-red-500 text-caption-1 mt-1">{errors.ageVerification}</p>
              )}
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
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-caption-1">
              <span className="px-4 bg-white text-gray-500">Or sign up with</span>
            </div>
          </div>

          {/* Social Registration */}
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
          Already have an account? 
          <Link href="/auth/login">
            <button className="text-blue-500 ml-1">Sign in</button>
          </Link>
        </p>
      </div>
    </div>
  )
}

export default RegisterPage
