import React, { useState } from 'react'
import { X, Upload, CheckCircle, AlertCircle, Shield, Camera } from 'lucide-react'
import { config } from '../../lib/config'

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

  // Allowed document types for upload
  const documentTypes = [
    { type: 'passport', label: 'Passport' },
    { type: 'drivers_license', label: "Driver's License" },
    { type: 'national_id', label: 'National ID' },
    { type: 'utility_bill', label: 'Utility Bill' },
  ]

  // Add document status display in the documents step
  const [uploadedDocs, setUploadedDocs] = useState<any[]>([])

  // Fetch uploaded documents when modal opens or after upload
  React.useEffect(() => {
    if (isOpen && step === 'documents') {
      fetchDocuments()
    }
    // eslint-disable-next-line
  }, [isOpen, step])

  const fetchDocuments = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        console.log('No token found, skipping document fetch')
        return
      }
      
      const response = await fetch(`${config.apiUrl}/kyc/status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        console.log(`KYC status request failed: ${response.status} ${response.statusText}`)
        setUploadedDocs([])
        return
      }
      
      const result = await response.json()
      console.log('KYC status response:', result)
      
      // Handle different response formats
      if (result.success) {
        if (result.documents && Array.isArray(result.documents)) {
          setUploadedDocs(result.documents)
        } else if (result.data && result.data.documents && Array.isArray(result.data.documents)) {
          setUploadedDocs(result.data.documents)
        } else {
          setUploadedDocs([])
        }
      } else {
        console.log('KYC status request unsuccessful:', result.error || 'Unknown error')
        setUploadedDocs([])
      }
    } catch (err) {
      console.error('Error fetching documents:', err)
      setUploadedDocs([])
    }
  }

  const handleInputChange = (field: string, value: string) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.')
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...(prev[parent as keyof typeof prev] as any),
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
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('No authentication token found. Please log in again.')
      }

      console.log('Submitting KYC form:', formData)
      
      const response = await fetch(`${config.apiUrl}/kyc/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      })

      console.log(`KYC submit response status: ${response.status}`)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.log('KYC submit error response:', errorText)
        throw new Error(`Server error: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      console.log('KYC submit response:', result)

      if (!result.success) {
        throw new Error(result.error || result.message || 'Failed to submit KYC verification')
      }

      setStep('documents')
    } catch (err: any) {
      console.error('KYC submit error:', err)
      setError(err.message || 'Failed to submit KYC verification. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleDocumentUpload = async (documentType: string) => {
    try {
      setLoading(true)
      setError(null)
      
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('No authentication token found. Please log in again.')
      }
      
      console.log('Uploading document:', documentType)
      
      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const response = await fetch(`${config.apiUrl}/kyc/upload-document`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          documentType,
          documentUrl: `https://example.com/${documentType}_${Date.now()}.jpg`, // Mock URL
        }),
      })

      console.log(`Document upload response status: ${response.status}`)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.log('Document upload error response:', errorText)
        throw new Error(`Server error: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      console.log('Document upload response:', result)

      if (!result.success) {
        throw new Error(result.error || result.message || 'Failed to upload document')
      }

      // Refresh documents list after successful upload
      await fetchDocuments()
      
      setStep('success')
      setTimeout(() => {
        onSuccess()
        onClose()
      }, 3000)
    } catch (err: any) {
      console.error('Document upload error:', err)
      setError(err.message || 'Failed to upload document. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const resetModal = () => {
    setStep('form')
    setError(null)
    setFormData({
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
  }

  const handleClose = () => {
    resetModal()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
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
            onClick={handleClose}
            className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center
                       active:scale-95 transition-transform"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
                <span className="text-body-sm text-red-700">{error}</span>
              </div>
            </div>
          )}

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

              {/* Address Fields */}
              <div className="space-y-4">
                <h4 className="text-body font-semibold text-gray-900">Address</h4>
                
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

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-[50px] bg-blue-500 text-white font-semibold 
                         rounded-[10px] flex items-center justify-center
                         disabled:opacity-50 disabled:cursor-not-allowed
                         active:scale-95 transition-transform"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
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
                <h3 className="text-title-2 font-semibold mb-2">Upload Documents</h3>
                <p className="text-body text-gray-500">
                  Please upload the required documents for verification
                </p>
              </div>

              {/* Uploaded Documents List */}
              {uploadedDocs.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-body font-semibold mb-2">Your Uploaded Documents</h4>
                  <ul className="space-y-2">
                    {uploadedDocs.map(doc => (
                      <li key={doc.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                        <div>
                          <span className="font-medium capitalize">{doc.type.replace('_', ' ')}</span>
                          <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                            doc.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                            doc.status === 'approved' ? 'bg-green-100 text-green-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                          </span>
                          {doc.status === 'rejected' && doc.rejectionReason && (
                            <span className="ml-2 text-xs text-red-500">Reason: {doc.rejectionReason}</span>
                          )}
                        </div>
                        {doc.status === 'rejected' && (
                  <button
                            onClick={() => handleDocumentUpload(doc.type)}
                            className="ml-2 px-3 py-1 bg-blue-500 text-white text-xs rounded-lg hover:bg-blue-600"
                  >
                            Re-upload
                  </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="space-y-4">
                {documentTypes.map(doc => (
                  <button
                    key={doc.type}
                    onClick={() => handleDocumentUpload(doc.type)}
                    disabled={loading}
                    className="w-full p-4 border-2 border-dashed border-gray-300 
                             rounded-[10px] hover:border-blue-500 transition-colors
                             disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center justify-center">
                      <Upload className="w-6 h-6 text-gray-400 mr-2" />
                      <span className="text-body font-medium">{doc.label}</span>
                    </div>
                    <p className="text-body-sm text-gray-500 mt-1">
                      {doc.type === 'passport' && 'Photo page of your passport'}
                      {doc.type === 'drivers_license' && 'Front of your driver\'s license'}
                      {doc.type === 'national_id' && 'Front of your national ID card'}
                      {doc.type === 'utility_bill' && 'Recent utility bill (address proof)'}
                    </p>
                  </button>
                ))}
              </div>

              {loading && (
                <div className="text-center">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-body-sm text-gray-500">Uploading document...</p>
                </div>
              )}
            </div>
          )}

          {step === 'success' && (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              
              <div>
                <h3 className="text-title-2 font-semibold mb-2">Verification Submitted!</h3>
                <p className="text-body text-gray-500">
                  Your identity verification has been submitted successfully. 
                  We'll review your documents and update your status within 24-48 hours.
              </p>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-body-sm text-blue-700">
                  You can continue using the app while we verify your identity.
                  Your betting limits will be updated once verification is complete.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 