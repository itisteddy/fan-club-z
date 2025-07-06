// Enhanced Apple-Style Form Components
// File: src/components/ui/enhanced-forms.tsx

import React, { useState, useRef, forwardRef } from 'react'
import { Eye, EyeOff, Check, AlertCircle } from 'lucide-react'
import { useHapticFeedback } from './enhanced-accessibility'
import { useReducedMotion } from '../../lib/theme'

// Enhanced Input Component
interface EnhancedInputProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search'
  label?: string
  placeholder?: string
  value: string
  onChange: (value: string) => void
  variant?: 'default' | 'floating'
  error?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
  autoComplete?: string
  maxLength?: number
  showCharacterCount?: boolean
  leftIcon?: React.ComponentType<{ className?: string }>
  rightIcon?: React.ComponentType<{ className?: string }>
  className?: string
}

export const EnhancedInput = forwardRef<HTMLInputElement, EnhancedInputProps>(({
  type = 'text',
  label,
  placeholder,
  value,
  onChange,
  variant = 'default',
  error,
  helperText,
  required = false,
  disabled = false,
  autoComplete,
  maxLength,
  showCharacterCount = false,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  className = ''
}, ref) => {
  const [isFocused, setIsFocused] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const { feedback } = useHapticFeedback()
  const prefersReducedMotion = useReducedMotion()
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFocus = () => {
    feedback('light')
    setIsFocused(true)
  }

  const handleBlur = () => {
    setIsFocused(false)
  }

  const handlePasswordToggle = () => {
    feedback('light')
    setShowPassword(!showPassword)
  }

  const getInputType = () => {
    if (type === 'password') {
      return showPassword ? 'text' : 'password'
    }
    return type
  }

  const getInputClass = () => {
    const baseClass = "w-full h-11 px-4 text-body bg-gray-100 dark:bg-gray-800 rounded-apple-md border-0 placeholder-gray-500 focus:outline-none transition-all duration-200"
    const focusClass = isFocused ? "bg-gray-200 dark:bg-gray-700 ring-2 ring-primary/20" : ""
    const errorClass = error ? "bg-red-50 dark:bg-red-900/20 ring-2 ring-system-red/20" : ""
    const disabledClass = disabled ? "opacity-50 cursor-not-allowed" : ""
    
    return `${baseClass} ${focusClass} ${errorClass} ${disabledClass} ${className}`
  }

  const getLabelClass = () => {
    const baseClass = "text-body-sm font-medium transition-all duration-200"
    const focusClass = isFocused ? "text-primary" : "text-gray-600 dark:text-gray-400"
    const errorClass = error ? "text-system-red" : ""
    
    return `${baseClass} ${focusClass} ${errorClass}`
  }

  if (variant === 'floating') {
    return (
      <div className="relative">
        <div className="relative">
          {LeftIcon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
              <LeftIcon className="w-5 h-5 text-gray-400" />
            </div>
          )}
          
          <input
            ref={ref || inputRef}
            type={getInputType()}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={isFocused ? placeholder : ''}
            required={required}
            disabled={disabled}
            autoComplete={autoComplete}
            maxLength={maxLength}
            className={`${getInputClass()} ${LeftIcon ? 'pl-12' : ''} ${RightIcon || type === 'password' ? 'pr-12' : ''}`}
          />
          
          {type === 'password' && (
            <button
              type="button"
              onClick={handlePasswordToggle}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          )}
          
          {RightIcon && type !== 'password' && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10">
              <RightIcon className="w-5 h-5 text-gray-400" />
            </div>
          )}
        </div>
        
        {/* Floating Label */}
        <label
          className={`absolute left-4 transition-all duration-200 pointer-events-none ${
            isFocused || value
              ? 'top-2 text-caption-1 text-primary'
              : 'top-1/2 -translate-y-1/2 text-body text-gray-500'
          } ${LeftIcon ? 'left-12' : ''}`}
        >
          {label}
          {required && <span className="text-system-red ml-1">*</span>}
        </label>
        
        {/* Error/Helper Text */}
        {(error || helperText || showCharacterCount) && (
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {error && (
                <>
                  <AlertCircle className="w-4 h-4 text-system-red" />
                  <span className="text-caption-1 text-system-red">{error}</span>
                </>
              )}
              {helperText && !error && (
                <span className="text-caption-1 text-gray-500 dark:text-gray-400">{helperText}</span>
              )}
            </div>
            {showCharacterCount && maxLength && (
              <span className="text-caption-1 text-gray-500 dark:text-gray-400">
                {value.length}/{maxLength}
              </span>
            )}
          </div>
        )}
      </div>
    )
  }

  // Default variant
  return (
    <div className="space-y-2">
      {label && (
        <label className={getLabelClass()}>
          {label}
          {required && <span className="text-system-red ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {LeftIcon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
            <LeftIcon className="w-5 h-5 text-gray-400" />
          </div>
        )}
        
        <input
          ref={ref || inputRef}
          type={getInputType()}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoComplete={autoComplete}
          maxLength={maxLength}
          className={`${getInputClass()} ${LeftIcon ? 'pl-12' : ''} ${RightIcon || type === 'password' ? 'pr-12' : ''}`}
        />
        
        {type === 'password' && (
          <button
            type="button"
            onClick={handlePasswordToggle}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
        
        {RightIcon && type !== 'password' && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10">
            <RightIcon className="w-5 h-5 text-gray-400" />
          </div>
        )}
      </div>
      
      {/* Error/Helper Text */}
      {(error || helperText || showCharacterCount) && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {error && (
              <>
                <AlertCircle className="w-4 h-4 text-system-red" />
                <span className="text-caption-1 text-system-red">{error}</span>
              </>
            )}
            {helperText && !error && (
              <span className="text-caption-1 text-gray-500 dark:text-gray-400">{helperText}</span>
            )}
          </div>
          {showCharacterCount && maxLength && (
            <span className="text-caption-1 text-gray-500 dark:text-gray-400">
              {value.length}/{maxLength}
            </span>
          )}
        </div>
      )}
    </div>
  )
})

EnhancedInput.displayName = 'EnhancedInput'

// Enhanced Select Component
interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

interface EnhancedSelectProps {
  label?: string
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  error?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
  searchable?: boolean
  multiple?: boolean
  className?: string
}

export const EnhancedSelect = forwardRef<HTMLSelectElement, EnhancedSelectProps>(({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  error,
  helperText,
  required = false,
  disabled = false,
  searchable = false,
  multiple = false,
  className = ''
}, ref) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const { feedback } = useHapticFeedback()
  const prefersReducedMotion = useReducedMotion()

  const filteredOptions = searchable
    ? options.filter(option => 
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : options

  const selectedOption = options.find(option => option.value === value)

  const handleToggle = () => {
    if (!disabled) {
      feedback('light')
      setIsOpen(!isOpen)
    }
  }

  const handleSelect = (optionValue: string) => {
    feedback('medium')
    onChange(optionValue)
    setIsOpen(false)
    setSearchTerm('')
  }

  const getSelectClass = () => {
    const baseClass = "w-full h-11 px-4 text-body bg-gray-100 dark:bg-gray-800 rounded-apple-md border-0 focus:outline-none transition-all duration-200 cursor-pointer"
    const focusClass = isOpen ? "bg-gray-200 dark:bg-gray-700 ring-2 ring-primary/20" : ""
    const errorClass = error ? "bg-red-50 dark:bg-red-900/20 ring-2 ring-system-red/20" : ""
    const disabledClass = disabled ? "opacity-50 cursor-not-allowed" : ""
    
    return `${baseClass} ${focusClass} ${errorClass} ${disabledClass} ${className}`
  }

  return (
    <div className="space-y-2">
      {label && (
        <label className="text-body-sm font-medium text-gray-600 dark:text-gray-400">
          {label}
          {required && <span className="text-system-red ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        <button
          type="button"
          onClick={handleToggle}
          className={`${getSelectClass()} flex items-center justify-between`}
          disabled={disabled}
        >
          <span className={selectedOption ? 'text-black dark:text-white' : 'text-gray-500'}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`} />
        </button>
        
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-dark-surface rounded-apple-lg shadow-apple-modal border border-gray-100 dark:border-gray-800 z-50 max-h-60 overflow-hidden">
            {searchable && (
              <div className="p-3 border-b border-gray-100 dark:border-gray-800">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search options..."
                  className="w-full h-9 px-3 text-body-sm bg-gray-100 dark:bg-gray-800 rounded-apple-md border-0 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  autoFocus
                />
              </div>
            )}
            
            <div className="max-h-48 overflow-y-auto">
              {filteredOptions.length === 0 ? (
                <div className="px-4 py-3 text-body-sm text-gray-500 dark:text-gray-400 text-center">
                  No options found
                </div>
              ) : (
                filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleSelect(option.value)}
                    disabled={option.disabled}
                    className={`w-full px-4 py-3 text-left text-body hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                      option.value === value
                        ? 'bg-primary text-white'
                        : 'text-black dark:text-white'
                    } ${option.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {option.label}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Error/Helper Text */}
      {(error || helperText) && (
        <div className="flex items-center space-x-2">
          {error && (
            <>
              <AlertCircle className="w-4 h-4 text-system-red" />
              <span className="text-caption-1 text-system-red">{error}</span>
            </>
          )}
          {helperText && !error && (
            <span className="text-caption-1 text-gray-500 dark:text-gray-400">{helperText}</span>
          )}
        </div>
      )}
    </div>
  )
})

EnhancedSelect.displayName = 'EnhancedSelect'

// Enhanced Textarea Component
interface EnhancedTextareaProps {
  label?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  error?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
  rows?: number
  maxLength?: number
  showCharacterCount?: boolean
  autoResize?: boolean
  className?: string
}

export const EnhancedTextarea = forwardRef<HTMLTextAreaElement, EnhancedTextareaProps>(({
  label,
  value,
  onChange,
  placeholder,
  error,
  helperText,
  required = false,
  disabled = false,
  rows = 4,
  maxLength,
  showCharacterCount = false,
  autoResize = false,
  className = ''
}, ref) => {
  const [isFocused, setIsFocused] = useState(false)
  const { feedback } = useHapticFeedback()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleFocus = () => {
    feedback('light')
    setIsFocused(true)
  }

  const handleBlur = () => {
    setIsFocused(false)
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    onChange(newValue)
    
    if (autoResize && textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }

  const getTextareaClass = () => {
    const baseClass = "w-full px-4 py-3 text-body bg-gray-100 dark:bg-gray-800 rounded-apple-md border-0 placeholder-gray-500 focus:outline-none resize-none transition-all duration-200"
    const focusClass = isFocused ? "bg-gray-200 dark:bg-gray-700 ring-2 ring-primary/20" : ""
    const errorClass = error ? "bg-red-50 dark:bg-red-900/20 ring-2 ring-system-red/20" : ""
    const disabledClass = disabled ? "opacity-50 cursor-not-allowed" : ""
    
    return `${baseClass} ${focusClass} ${errorClass} ${disabledClass} ${className}`
  }

  return (
    <div className="space-y-2">
      {label && (
        <label className="text-body-sm font-medium text-gray-600 dark:text-gray-400">
          {label}
          {required && <span className="text-system-red ml-1">*</span>}
        </label>
      )}
      
      <textarea
        ref={ref || textareaRef}
        value={value}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        rows={rows}
        maxLength={maxLength}
        className={getTextareaClass()}
      />
      
      {/* Error/Helper Text */}
      {(error || helperText || showCharacterCount) && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {error && (
              <>
                <AlertCircle className="w-4 h-4 text-system-red" />
                <span className="text-caption-1 text-system-red">{error}</span>
              </>
            )}
            {helperText && !error && (
              <span className="text-caption-1 text-gray-500 dark:text-gray-400">{helperText}</span>
            )}
          </div>
          {showCharacterCount && maxLength && (
            <span className="text-caption-1 text-gray-500 dark:text-gray-400">
              {value.length}/{maxLength}
            </span>
          )}
        </div>
      )}
    </div>
  )
})

EnhancedTextarea.displayName = 'EnhancedTextarea'

// Enhanced Toggle Switch Component
interface EnhancedToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  disabled?: boolean
  size?: 'small' | 'medium' | 'large'
  color?: 'primary' | 'green' | 'orange' | 'red'
  className?: string
}

export const EnhancedToggle: React.FC<EnhancedToggleProps> = ({
  checked,
  onChange,
  label,
  disabled = false,
  size = 'medium',
  color = 'primary',
  className = ''
}) => {
  const { feedback } = useHapticFeedback()
  const prefersReducedMotion = useReducedMotion()

  const handleToggle = () => {
    if (!disabled) {
      feedback('medium')
      onChange(!checked)
    }
  }

  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'w-9 h-5'
      case 'large':
        return 'w-14 h-8'
      default:
        return 'w-11 h-6'
    }
  }

  const getColorClasses = () => {
    switch (color) {
      case 'green':
        return checked ? 'bg-system-green' : 'bg-gray-300 dark:bg-gray-600'
      case 'orange':
        return checked ? 'bg-system-orange' : 'bg-gray-300 dark:bg-gray-600'
      case 'red':
        return checked ? 'bg-system-red' : 'bg-gray-300 dark:bg-gray-600'
      default:
        return checked ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
    }
  }

  const getThumbSize = () => {
    switch (size) {
      case 'small':
        return 'w-4 h-4'
      case 'large':
        return 'w-6 h-6'
      default:
        return 'w-5 h-5'
    }
  }

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={`relative inline-flex items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20 ${
          getSizeClasses()
        } ${getColorClasses()} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span
          className={`bg-white rounded-full shadow-sm transition-transform duration-200 ${
            getThumbSize()
          } ${checked ? 'translate-x-full' : 'translate-x-0'} ${
            size === 'large' ? '-translate-y-1' : ''
          }`}
          style={{
            transform: checked ? 'translateX(100%)' : 'translateX(0)',
            transition: prefersReducedMotion ? 'none' : 'transform 0.2s ease'
          }}
        />
      </button>
      
      {label && (
        <label className="text-body text-black dark:text-white cursor-pointer">
          {label}
        </label>
      )}
    </div>
  )
}

// Missing import
const ChevronDown = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
) 