import React, { useState, useEffect } from 'react'
import { Shield, CheckCircle, Clock, AlertCircle, ArrowRight } from 'lucide-react'
import { KYCModal } from './KYCModal'

interface KYCStatusProps {
  userId: string
}

interface KYCStatus {
  kycLevel: 'none' | 'basic' | 'enhanced'
  status: 'pending' | 'verified'
  requirements?: {
    required: boolean
    documents: string[]
    description: string
  }
}

export const KYCStatus: React.FC<KYCStatusProps> = ({ userId }) => {
  const [kycStatus, setKycStatus] = useState<KYCStatus | null>(null)
  const [showKYCModal, setShowKYCModal] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchKYCStatus()
  }, [userId])

  const fetchKYCStatus = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/kyc/status', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      })
      
      if (response.ok) {
        const result = await response.json()
        setKycStatus(result.data)
      }
    } catch (error) {
      console.error('Failed to fetch KYC status:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = () => {
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