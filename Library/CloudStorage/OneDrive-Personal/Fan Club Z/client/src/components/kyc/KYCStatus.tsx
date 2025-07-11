import React, { useState, useEffect } from 'react'
import { Shield, CheckCircle, Clock, AlertCircle, ArrowRight } from 'lucide-react'
import { KYCModal } from './KYCModal'
import { config } from '../../lib/config'

interface KYCStatusProps {
  userId: string
}

interface KYCStatus {
  kycLevel: 'none' | 'basic' | 'enhanced'
  status: 'pending' | 'verified' | 'rejected'
  requirements?: {
    required: boolean
    documents: string[]
    description: string
  }
  verification?: {
    id: string
    status: string
    submittedAt: string
  }
  documents?: Array<{
    id: string
    type: string
    status: string
    rejectionReason?: string
  }>
}

export const KYCStatus: React.FC<KYCStatusProps> = ({ userId }) => {
  const [kycStatus, setKycStatus] = useState<KYCStatus | null>(null)
  const [showKYCModal, setShowKYCModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchKYCStatus()
  }, [userId])

  const fetchKYCStatus = async () => {
    try {
      setLoading(true)
      setError(null)
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('No authentication token found')
      }
      const response = await fetch(`${config.apiUrl}/kyc/status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
        const result = await response.json()
      if (result.success && (result.data || result.kycLevel)) {
        setKycStatus(result.data || result)
      } else {
        throw new Error(result.error || 'Failed to fetch KYC status')
      }
    } catch (error: any) {
      console.error('Failed to fetch KYC status:', error)
      setError(error.message || 'Failed to fetch KYC status')
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = () => {
    if (error) return <AlertCircle className="w-5 h-5 text-red-500" />
    
    switch (kycStatus?.kycLevel) {
      case 'enhanced':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'basic':
        return <Clock className="w-5 h-5 text-orange-500" />
      default:
        return <AlertCircle className="w-5 h-5 text-red-500" />
    }
  }

  const getStatusText = () => {
    if (error) return 'Error'
    
    switch (kycStatus?.kycLevel) {
      case 'enhanced':
        return 'Verified'
      case 'basic':
        return 'Pending Review'
      default:
        return 'Not Verified'
    }
  }

  const getStatusColor = () => {
    if (error) return 'text-red-600'
    
    switch (kycStatus?.kycLevel) {
      case 'enhanced':
        return 'text-green-600'
      case 'basic':
        return 'text-orange-600'
      default:
        return 'text-red-600'
    }
  }

  const getBettingLimit = () => {
    switch (kycStatus?.kycLevel) {
      case 'enhanced':
        return '$10,000'
      case 'basic':
        return '$500'
      default:
        return '$100'
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-4 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-3" />
        <div className="h-6 bg-gray-200 rounded w-3/4 mb-2" />
        <div className="h-6 bg-gray-200 rounded w-1/2" />
      </div>
    )
  }

  return (
    <>
      <div className="bg-white rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
              <Shield className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h3 className="text-title-3 font-semibold">Identity Verification</h3>
              <p className="text-body-sm text-gray-500">KYC Status</p>
            </div>
          </div>
          {getStatusIcon()}
        </div>

        {error ? (
          <div className="space-y-3">
            <div className="text-red-600 text-body-sm">{error}</div>
            <button
              onClick={fetchKYCStatus}
              className="w-full h-11 bg-blue-500 text-white font-medium 
                       rounded-[10px] flex items-center justify-center
                       active:scale-95 transition-transform"
            >
              Retry
            </button>
          </div>
        ) : (
        <div className="space-y-3">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-body text-gray-600">Status</span>
            <span className={`text-body font-semibold ${getStatusColor()}`}>
              {getStatusText()}
            </span>
          </div>

          {/* Betting Limit */}
          <div className="flex items-center justify-between">
            <span className="text-body text-gray-600">Max Bet Limit</span>
            <span className="text-body font-semibold text-gray-900">
              {getBettingLimit()}
            </span>
          </div>

            {/* Verification Details */}
            {kycStatus?.verification && (
              <div className="pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-body-sm text-gray-600">Verification Status</span>
                  <span className={`text-body-sm font-medium ${
                    kycStatus.verification.status === 'verified' ? 'text-green-600' :
                    kycStatus.verification.status === 'pending' ? 'text-orange-600' :
                    'text-red-600'
                  }`}>
                    {kycStatus.verification.status.charAt(0).toUpperCase() + kycStatus.verification.status.slice(1)}
                  </span>
                </div>
                {/* Documents List */}
                {kycStatus.documents && kycStatus.documents.length > 0 && (
                  <div className="mt-2">
                    <h4 className="text-body-sm font-semibold mb-1">Documents</h4>
                    <ul className="space-y-1">
                      {kycStatus.documents.map(doc => (
                        <li key={doc.id} className="flex items-center justify-between bg-gray-50 rounded px-2 py-1">
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
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

          {/* Requirements */}
          {kycStatus?.requirements && (
            <div className="pt-3 border-t border-gray-100">
              <p className="text-body-sm text-gray-500 mb-2">
                {kycStatus.requirements.description}
              </p>
              
              {kycStatus.requirements.required && kycStatus.kycLevel === 'none' && (
                <button
                  onClick={() => setShowKYCModal(true)}
                  className="w-full h-11 bg-blue-500 text-white font-medium 
                           rounded-[10px] flex items-center justify-center
                           active:scale-95 transition-transform"
                >
                  Verify Identity
                  <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              )}
            </div>
          )}
        </div>
        )}
      </div>

      {/* KYC Modal */}
      <KYCModal
        isOpen={showKYCModal}
        onClose={() => setShowKYCModal(false)}
        onSuccess={() => {
          fetchKYCStatus()
          setShowKYCModal(false)
        }}
      />
    </>
  )
} 