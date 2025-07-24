import React, { useState } from 'react'
import { Link, useLocation } from 'wouter'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Mail, User, Lock, Calendar, AlertCircle, CheckCircle, Phone } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useToast } from '@/hooks/use-toast'

const ValidationError: React.FC<{ error: string }> = ({ error }) => (
  <div className="text-red-500 text-sm mt-1 flex items-center space-x-1">
    <AlertCircle className="w-4 h-4 flex-shrink-0" />
    <span>{error}</span>
  </div>
)

export const RegisterPage: React.FC = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    dateOfBirth: '',
    ageVerification: false
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const { register } = useAuthStore()
  const [, setLocation] = useLocation()
  const { success, error: showError } = useToast()

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'Please enter your first name'
    } else if (formData.firstName.trim().length < 2) {
      newErrors.firstName = 'First name must be at least 2 characters long'
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Please enter your last name'
    } else if (formData.lastName.trim().length < 2) {
      newErrors.lastName = 'Last name must be at least 2 characters long'
    }

    if (!formData.username.trim()) {
      newErrors.username = 'Please choose a username'
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters long'
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Please enter your email address'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Please enter your phone number'
    } else {
      const cleanPhone = formData.phone.replace(/[\s\-\(\)]/g, '')
      if (cleanPhone.length < 10) {
        newErrors.phone = 'Please enter a valid phone number'
      }
    }

    if (!formData.password) {
      newErrors.password = 'Please create a password'
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters long'
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain uppercase, lowercase, and a number'
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = 'Please enter your date of birth'
    } else {
      const birthDate = new Date(formData.dateOfBirth)
      const today = new Date()
      const age = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()
      
      let actualAge = age
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        actualAge = age - 1
      }
      
      if (actualAge < 18) {
        newErrors.dateOfBirth = 'You must be at least 18 years old to join'
      }
    }

    if (!formData.ageVerification) {
      newErrors.ageVerification = 'Please confirm you are at least 18 years old'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      showError('Please check your information and try again')
      return
    }

    setIsLoading(true)
    
    try {
      // Clean phone number and prepare data
      const cleanPhone = formData.phone.replace(/[\s\-\(\)]/g, '')
      
      const registrationData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        username: formData.username.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: cleanPhone,
        password: formData.password,
        dateOfBirth: formData.dateOfBirth
      }

      // Use the auth store's register method to ensure proper state management
      await register(registrationData)
      
      // Show success message and navigate to onboarding
      success('Welcome to Fan Club Z! Setting up your account...')
      
      setTimeout(() => {
        setLocation('/onboarding')
      }, 1500)
      
    } catch (error: any) {
      let userFriendlyMessage = 'Unable to create account. Please try again.'
      const fieldErrors: Record<string, string> = {}
      
      // Handle specific error formats
      if (error.response && error.response.details && Array.isArray(error.response.details)) {
        error.response.details.forEach((detail: any) => {
          if (detail.field && detail.message) {
            // Make field-specific errors more user-friendly
            switch (detail.field) {
              case 'email':
                fieldErrors[detail.field] = detail.message.includes('already exists') 
                  ? 'This email is already registered. Try signing in instead.' 
                  : 'Please enter a valid email address'
                break
              case 'username':
                fieldErrors[detail.field] = detail.message.includes('already exists')
                  ? 'This username is taken. Please choose another one.'
                  : 'Please choose a valid username'
                break
              case 'phone':
                fieldErrors[detail.field] = 'Please enter a valid phone number'
                break
              default:
                fieldErrors[detail.field] = detail.message
            }
          }
        })
        
        if (Object.keys(fieldErrors).length > 0) {
          setErrors(fieldErrors)
          userFriendlyMessage = 'Please check the highlighted fields and try again'
        }
      } else if (error.message) {
        if (error.message.includes('email already exists') || error.message.includes('email is already registered')) {
          userFriendlyMessage = 'This email is already registered. Try signing in instead.'
        } else if (error.message.includes('username already exists') || error.message.includes('username is taken')) {
          userFriendlyMessage = 'This username is taken. Please choose another one.'
        } else if (error.message.includes('Network') || error.message.includes('fetch') || error.message.includes('connection')) {
          userFriendlyMessage = 'Connection problem. Please check your internet and try again.'
        }
      }
      
      showError(userFriendlyMessage)
    } finally {
      setIsLoading(false)
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
              Create Account
            </h1>
            <p className="text-gray-600">
              Join Fan Club Z and start betting on what matters
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* First Name */}
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                First Name
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 z-10" />
                <Input
                  id="firstName"
                  type="text"
                  variant="ios"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  placeholder="First name"
                  className={`pl-12 ${hasValidInput('firstName') ? 'pr-12' : 'pr-4'} ${getInputClassName('firstName')}`}
                  disabled={isLoading}
                />
                {hasValidInput('firstName') && (
                  <CheckCircle className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500 w-5 h-5 z-10" />
                )}
              </div>
              {errors.firstName && <ValidationError error={errors.firstName} />}
            </div>

            {/* Last Name */}
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                Last Name
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 z-10" />
                <Input
                  id="lastName"
                  type="text"
                  variant="ios"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  placeholder="Last name"
                  className={`pl-12 ${hasValidInput('lastName') ? 'pr-12' : 'pr-4'} ${getInputClassName('lastName')}`}
                  disabled={isLoading}
                />
                {hasValidInput('lastName') && (
                  <CheckCircle className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500 w-5 h-5 z-10" />
                )}
              </div>
              {errors.lastName && <ValidationError error={errors.lastName} />}
            </div>

            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 z-10" />
                <Input
                  id="username"
                  type="text"
                  variant="ios"
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  placeholder="Enter username"
                  className={`pl-12 ${hasValidInput('username') ? 'pr-12' : 'pr-4'} ${getInputClassName('username')}`}
                  disabled={isLoading}
                />
                {hasValidInput('username') && (
                  <CheckCircle className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500 w-5 h-5 z-10" />
                )}
              </div>
              {errors.username && <ValidationError error={errors.username} />}
            </div>

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
                  disabled={isLoading}
                />
                {hasValidInput('email') && (
                  <CheckCircle className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500 w-5 h-5 z-10" />
                )}
              </div>
              {errors.email && <ValidationError error={errors.email} />}
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 z-10" />
                <Input
                  id="phone"
                  type="tel"
                  variant="ios"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="Enter your phone number"
                  className={`pl-12 ${hasValidInput('phone') ? 'pr-12' : 'pr-4'} ${getInputClassName('phone')}`}
                  disabled={isLoading}
                />
                {hasValidInput('phone') && (
                  <CheckCircle className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500 w-5 h-5 z-10" />
                )}
              </div>
              {errors.phone && <ValidationError error={errors.phone} />}
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
                  type="password"
                  variant="ios"
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder="Create a password"
                  className={`pl-12 ${hasValidInput('password') ? 'pr-12' : 'pr-4'} ${getInputClassName('password')}`}
                  disabled={isLoading}
                />
                {hasValidInput('password') && (
                  <CheckCircle className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500 w-5 h-5 z-10" />
                )}
              </div>
              {errors.password && <ValidationError error={errors.password} />}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 z-10" />
                <Input
                  id="confirmPassword"
                  type="password"
                  variant="ios"
                  autoComplete="new-password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  placeholder="Confirm your password"
                  className={`pl-12 ${hasValidInput('confirmPassword') ? 'pr-12' : 'pr-4'} ${getInputClassName('confirmPassword')}`}
                  disabled={isLoading}
                />
                {hasValidInput('confirmPassword') && (
                  <CheckCircle className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500 w-5 h-5 z-10" />
                )}
              </div>
              {errors.confirmPassword && <ValidationError error={errors.confirmPassword} />}
            </div>

            {/* Date of Birth */}
            <div>
              <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 mb-2">
                Date of Birth
              </label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 z-10" />
                <Input
                  id="dateOfBirth"
                  type="date"
                  variant="ios"
                  value={formData.dateOfBirth}
                  onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                  className={`pl-12 ${hasValidInput('dateOfBirth') ? 'pr-12' : 'pr-4'} ${getInputClassName('dateOfBirth')}`}
                  disabled={isLoading}
                />
                {hasValidInput('dateOfBirth') && (
                  <CheckCircle className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500 w-5 h-5 z-10" />
                )}
              </div>
              {errors.dateOfBirth && <ValidationError error={errors.dateOfBirth} />}
            </div>

            {/* Age Verification */}
            <div>
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.ageVerification}
                  onChange={(e) => handleInputChange('ageVerification', e.target.checked)}
                  className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                  disabled={isLoading}
                />
                <span className="text-sm text-gray-600 leading-5">
                  I confirm that I am at least 18 years old and agree to the Terms of Service and Privacy Policy
                </span>
              </label>
              {errors.ageVerification && <ValidationError error={errors.ageVerification} />}
            </div>

            {/* Submit Button */}
            <div className="pt-6">
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors"
              >
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </div>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-4 bg-white text-gray-500 text-sm">Or sign up with</span>
            </div>
          </div>

          {/* Social Registration */}
          <Button
            type="button"
            variant="outline"
            className="w-full h-12 border-gray-300 hover:bg-gray-50"
            disabled={isLoading}
          >
            <span className="mr-2">🔍</span>
            Continue with Google
          </Button>

          {/* Login Link */}
          <div className="text-center mt-6">
            <p className="text-sm text-gray-500">
              Already have an account?{' '}
              <Link href="/auth/login">
                <button className="text-blue-500 font-medium hover:text-blue-600">
                  Sign in
                </button>
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RegisterPage