import React, { useState } from 'react'
import { X, Upload, CheckCircle, AlertCircle, Shield, Camera } from 'lucide-react'

interface KYCModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface KYCFormData {
  firstName: string
  lastName: string
  dateOfBirth: string
  address: {
    street: string
    city: string
    state: string
    zipCode: string
    country: string
  }
  phoneNumber: string
}

export const KYCModal: React.FC<KYCModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<'form' | 'documents' | 'success'>('form')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<KYCFormData>({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: '',
    },
    phoneNumber: '',
  })

  const handleInputChange = (field: string, value: string) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.')
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof typeof prev],
          [child]: value,
        },
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value,
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/kyc/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to submit KYC verification')
      }

      setStep('documents')
    } catch (err: any) {
      setError(err.message || 'Failed to submit KYC verification')
    } finally {
      setLoading(false)
    }
  }

  const handleDocumentUpload = async (documentType: string) => {
    // In a real app, you'd implement file upload to a service like AWS S3
    // For demo, we'll simulate a successful upload
    try {
      setLoading(true)
      
      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const response = await fetch('/api/kyc/upload-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          documentType,
          documentUrl: 'https://example.com/document.jpg', // Mock URL
        }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to upload document')
      }

      setStep('success')
      setTimeout(() => {
        onSuccess()
        onClose()
      }, 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to upload document')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl 
                      shadow-2xl transform transition-all duration-300 ease-out
                      max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
              <Shield className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h2 className="text-title-3 font-semibold">Identity Verification</h2>
              <p className="text-body-sm text-gray-500">Step {step === 'form' ? '1' : step === 'documents' ? '2' : '3'} of 3</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center
                       active:scale-95 transition-transform"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'form' && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-title-2 font-semibold mb-2">Personal Information</h3>
                <p className="text-body text-gray-500">
                  Please provide your legal information for identity verification
                </p>
              </div>

              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-body font-medium text-gray-900">First Name</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    required
                    className="w-full h-11 px-4 text-body bg-gray-100 
                             rounded-[10px] placeholder-gray-500
                             focus:bg-gray-200 transition-colors"
                    placeholder="John"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-body font-medium text-gray-900">Last Name</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    required
                    className="w-full h-11 px-4 text-body bg-gray-100 
                             rounded-[10px] placeholder-gray-500
                             focus:bg-gray-200 transition-colors"
                    placeholder="Doe"
                  />
                </div>
              </div>

              {/* Date of Birth */}
              <div className="space-y-2">
                <label className="text-body font-medium text-gray-900">Date of Birth</label>
                <input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                  required
                  className="w-full h-11 px-4 text-body bg-gray-100 
                           rounded-[10px] placeholder-gray-500
                           focus:bg-gray-200 transition-colors"
                />
                <p className="text-caption-1 text-gray-500">You must be 18 or older</p>
              </div>

              {/* Address */}
              <div className="space-y-4">
                <h4 className="text-body font-semibold">Address</h4>
                
                <div className="space-y-2">
                  <label className="text-body font-medium text-gray-900">Street Address</label>
                  <input
                    type="text"
                    value={formData.address.street}
                    onChange={(e) => handleInputChange('address.street', e.target.value)}
                    required
                    className="w-full h-11 px-4 text-body bg-gray-100 
                             rounded-[10px] placeholder-gray-500
                             focus:bg-gray-200 transition-colors"
                    placeholder="123 Main St"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-body font-medium text-gray-900">City</label>
                    <input
                      type="text"
                      value={formData.address.city}
                      onChange={(e) => handleInputChange('address.city', e.target.value)}
                      required
                      className="w-full h-11 px-4 text-body bg-gray-100 
                               rounded-[10px] placeholder-gray-500
                               focus:bg-gray-200 transition-colors"
                      placeholder="New York"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-body font-medium text-gray-900">State</label>
                    <input
                      type="text"
                      value={formData.address.state}
                      onChange={(e) => handleInputChange('address.state', e.target.value)}
                      required
                      className="w-full h-11 px-4 text-body bg-gray-100 
                               rounded-[10px] placeholder-gray-500
                               focus:bg-gray-200 transition-colors"
                      placeholder="NY"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-body font-medium text-gray-900">ZIP Code</label>
                    <input
                      type="text"
                      value={formData.address.zipCode}
                      onChange={(e) => handleInputChange('address.zipCode', e.target.value)}
                      required
                      className="w-full h-11 px-4 text-body bg-gray-100 
                               rounded-[10px] placeholder-gray-500
                               focus:bg-gray-200 transition-colors"
                      placeholder="10001"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-body font-medium text-gray-900">Country</label>
                    <input
                      type="text"
                      value={formData.address.country}
                      onChange={(e) => handleInputChange('address.country', e.target.value)}
                      required
                      className="w-full h-11 px-4 text-body bg-gray-100 
                               rounded-[10px] placeholder-gray-500
                               focus:bg-gray-200 transition-colors"
                      placeholder="United States"
                    />
                  </div>
                </div>
              </div>

              {/* Phone Number */}
              <div className="space-y-2">
                <label className="text-body font-medium text-gray-900">Phone Number</label>
                <input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                  required
                  className="w-full h-11 px-4 text-body bg-gray-100 
                           rounded-[10px] placeholder-gray-500
                           focus:bg-gray-200 transition-colors"
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              {/* Error Display */}
              {error && (
                <div className="flex items-center p-4 bg-red-50 rounded-xl">
                  <AlertCircle className="w-5 h-5 text-red-500 mr-3" />
                  <span className="text-body text-red-700">{error}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-[50px] bg-blue-500 text-white font-semibold 
                           text-body rounded-[10px] disabled:opacity-50 
                           disabled:cursor-not-allowed active:scale-95 
                           transition-transform"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Submitting...
                  </div>
                ) : (
                  'Continue to Documents'
                )}
              </button>
            </form>
          )}

          {step === 'documents' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-title-2 font-semibold mb-2">Document Upload</h3>
                <p className="text-body text-gray-500">
                  Please upload a government-issued ID and proof of address
                </p>
              </div>

              {/* Government ID */}
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <h4 className="text-body font-semibold mb-2">Government ID</h4>
                  <p className="text-body-sm text-gray-500 mb-4">
                    Passport, Driver's License, or National ID
                  </p>
                  <button
                    onClick={() => handleDocumentUpload('passport')}
                    disabled={loading}
                    className="w-full h-12 bg-white border-2 border-dashed border-gray-300 
                             rounded-xl flex items-center justify-center text-body
                             hover:border-blue-300 hover:bg-blue-50 transition-colors
                             disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Camera className="w-5 h-5 mr-2 text-gray-400" />
                    {loading ? 'Uploading...' : 'Upload Document'}
                  </button>
                </div>

                {/* Proof of Address */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <h4 className="text-body font-semibold mb-2">Proof of Address</h4>
                  <p className="text-body-sm text-gray-500 mb-4">
                    Utility bill, bank statement, or lease agreement
                  </p>
                  <button
                    onClick={() => handleDocumentUpload('utility_bill')}
                    disabled={loading}
                    className="w-full h-12 bg-white border-2 border-dashed border-gray-300 
                             rounded-xl flex items-center justify-center text-body
                             hover:border-blue-300 hover:bg-blue-50 transition-colors
                             disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Camera className="w-5 h-5 mr-2 text-gray-400" />
                    {loading ? 'Uploading...' : 'Upload Document'}
                  </button>
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="flex items-center p-4 bg-red-50 rounded-xl">
                  <AlertCircle className="w-5 h-5 text-red-500 mr-3" />
                  <span className="text-body text-red-700">{error}</span>
                </div>
              )}
            </div>
          )}

          {step === 'success' && (
            <div className="flex flex-col items-center justify-center py-12 px-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-title-2 font-semibold mb-2 text-center">
                Verification Submitted!
              </h3>
              <p className="text-body text-gray-500 text-center mb-6">
                We'll review your documents and update your verification status within 24-48 hours.
              </p>
              <div className="text-center">
                <p className="text-body-sm text-gray-500">
                  You can continue using the app while we verify your identity.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 