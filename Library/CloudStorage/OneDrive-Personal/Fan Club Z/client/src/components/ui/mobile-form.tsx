import React, { useRef, useEffect } from 'react'
import { Input } from './input'
import { Button } from './button'
import { cn } from '@/lib/utils'

interface MobileFormField {
  id: string
  label: string
  type: 'text' | 'email' | 'password' | 'number' | 'tel' | 'date'
  placeholder?: string
  required?: boolean
  validation?: (value: string) => string | null
  autoComplete?: string
  inputMode?: 'text' | 'email' | 'tel' | 'url' | 'numeric' | 'decimal'
  pattern?: string
  maxLength?: number
}

interface MobileFormProps {
  fields: MobileFormField[]
  onSubmit: (data: Record<string, string>) => void
  submitLabel?: string
  isLoading?: boolean
  className?: string
}

export const MobileForm: React.FC<MobileFormProps> = ({
  fields,
  onSubmit,
  submitLabel = 'Submit',
  isLoading = false,
  className
}) => {
  const [formData, setFormData] = React.useState<Record<string, string>>({})
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const handleInputChange = (fieldId: string, value: string) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }))
    
    // Clear error when user starts typing
    if (errors[fieldId]) {
      setErrors(prev => ({ ...prev, [fieldId]: '' }))
    }

    // Auto-advance to next field if max length reached
    const field = fields.find(f => f.id === fieldId)
    if (field?.maxLength && value.length === field.maxLength) {
      const currentIndex = fields.findIndex(f => f.id === fieldId)
      const nextField = fields[currentIndex + 1]
      if (nextField) {
        inputRefs.current[nextField.id]?.focus()
      }
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    fields.forEach(field => {
      const value = formData[field.id] || ''
      
      if (field.required && !value.trim()) {
        newErrors[field.id] = `${field.label} is required`
      } else if (field.validation) {
        const validationError = field.validation(value)
        if (validationError) {
          newErrors[field.id] = validationError
        }
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (validateForm()) {
      onSubmit(formData)
    }
  }

  const getInputProps = (field: MobileFormField) => {
    const baseProps = {
      id: field.id,
      type: field.type,
      placeholder: field.placeholder,
      value: formData[field.id] || '',
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => 
        handleInputChange(field.id, e.target.value),
      className: cn(
        "text-mobile-base",
        errors[field.id] && "border-red-500 focus:border-red-500 focus:ring-red-500"
      ),
      disabled: isLoading,
      autoComplete: field.autoComplete,
      maxLength: field.maxLength,
    }

    // Mobile-specific optimizations
    switch (field.type) {
      case 'number':
        return {
          ...baseProps,
          inputMode: 'decimal' as const,
          pattern: '[0-9]*',
        }
      case 'tel':
        return {
          ...baseProps,
          inputMode: 'tel' as const,
          pattern: '[0-9]*',
        }
      case 'email':
        return {
          ...baseProps,
          inputMode: 'email' as const,
          autoCapitalize: 'none',
          autoCorrect: 'off',
        }
      case 'password':
        return {
          ...baseProps,
          autoCapitalize: 'none',
          autoCorrect: 'off',
        }
      default:
        return baseProps
    }
  }

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-6", className)}>
      {fields.map((field, index) => (
        <div key={field.id} className="space-y-2">
          <label 
            htmlFor={field.id}
            className="block text-mobile-sm font-medium text-gray-700"
          >
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          
          <Input
            ref={(el) => {
              inputRefs.current[field.id] = el
            }}
            {...getInputProps(field)}
          />
          
          {errors[field.id] && (
            <p className="text-mobile-xs text-red-500">
              {errors[field.id]}
            </p>
          )}
        </div>
      ))}

      <Button
        type="submit"
        disabled={isLoading}
        className="w-full"
        size="lg"
      >
        {isLoading ? 'Processing...' : submitLabel}
      </Button>
    </form>
  )
}

// Quick registration form for high-intent users
export const QuickRegisterForm: React.FC<{
  onSubmit: (data: { email: string; password: string }) => void
  isLoading?: boolean
  className?: string
}> = ({ onSubmit, isLoading, className }) => {
  const fields: MobileFormField[] = [
    {
      id: 'email',
      label: 'Email Address',
      type: 'email',
      placeholder: 'Enter your email',
      required: true,
      autoComplete: 'email',
      validation: (value) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        return emailRegex.test(value) ? null : 'Please enter a valid email'
      }
    },
    {
      id: 'password',
      label: 'Password',
      type: 'password',
      placeholder: 'Create a password (6+ characters)',
      required: true,
      autoComplete: 'new-password',
      validation: (value) => {
        return value.length >= 6 ? null : 'Password must be at least 6 characters'
      }
    }
  ]

  const handleSubmit = (data: Record<string, string>) => {
    onSubmit({
      email: data.email,
      password: data.password
    })
  }

  return (
    <MobileForm
      fields={fields}
      onSubmit={handleSubmit}
      submitLabel="Create Account"
      isLoading={isLoading}
      className={className}
    />
  )
}

export default MobileForm 