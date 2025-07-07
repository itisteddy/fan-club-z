import React, { useState } from 'react'
import { Shield, FileText, Heart, CheckCircle, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PrivacyPolicy } from './PrivacyPolicy'
import { TermsOfService } from './TermsOfService'
import { ResponsibleGambling } from './ResponsibleGambling'

interface ComplianceManagerProps {
  onComplete?: () => void
  showOnFirstVisit?: boolean
}

export const ComplianceManager: React.FC<ComplianceManagerProps> = ({
  onComplete,
  showOnFirstVisit = false
}) => {
  const [currentStep, setCurrentStep] = useState<'welcome' | 'privacy' | 'terms' | 'responsible' | 'complete'>('welcome')
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [viewedResponsible, setViewedResponsible] = useState(false)

  const handleAcceptPrivacy = () => {
    setAcceptedPrivacy(true)
    setCurrentStep('terms')
  }

  const handleAcceptTerms = () => {
    setAcceptedTerms(true)
    setCurrentStep('responsible')
  }

  const handleViewResponsible = () => {
    setViewedResponsible(true)
    setCurrentStep('complete')
  }

  const handleComplete = () => {
    // Save compliance status to localStorage
    localStorage.setItem('fanclubz_compliance_complete', 'true')
    localStorage.setItem('fanclubz_privacy_accepted', 'true')
    localStorage.setItem('fanclubz_terms_accepted', 'true')
    localStorage.setItem('fanclubz_responsible_viewed', 'true')
    
    onComplete?.()
  }

  const renderWelcome = () => (
    <div className="max-w-2xl mx-auto p-6 text-center">
      <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <Shield className="w-10 h-10 text-blue-500" />
      </div>
      
      <h1 className="text-title-1 font-bold mb-4">Welcome to Fan Club Z</h1>
      <p className="text-body text-gray-600 mb-8">
        Before you start betting, we need to ensure you understand our platform's 
        policies and responsible gambling practices.
      </p>

      <div className="space-y-4 mb-8">
        <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg">
          <CheckCircle className="w-5 h-5 text-blue-500" />
          <span className="text-body">Privacy Policy & Data Protection</span>
        </div>
        <div className="flex items-center space-x-3 p-4 bg-orange-50 rounded-lg">
          <CheckCircle className="w-5 h-5 text-orange-500" />
          <span className="text-body">Terms of Service & Platform Rules</span>
        </div>
        <div className="flex items-center space-x-3 p-4 bg-red-50 rounded-lg">
          <CheckCircle className="w-5 h-5 text-red-500" />
          <span className="text-body">Responsible Gambling Information</span>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-yellow-500 mt-1 flex-shrink-0" />
          <div>
            <h3 className="text-body font-semibold text-yellow-800 mb-1">
              Important Notice
            </h3>
            <p className="text-body-sm text-yellow-700">
              Fan Club Z is a real-money betting platform. You must be 18+ to use our services. 
              Please gamble responsibly and only bet what you can afford to lose.
            </p>
          </div>
        </div>
      </div>

      <Button onClick={() => setCurrentStep('privacy')} className="w-full">
        Continue to Privacy Policy
      </Button>
    </div>
  )

  const renderPrivacy = () => (
    <div>
      <PrivacyPolicy 
        onAccept={handleAcceptPrivacy}
        onDecline={() => setCurrentStep('welcome')}
        showActions={true}
      />
    </div>
  )

  const renderTerms = () => (
    <div>
      <TermsOfService 
        onAccept={handleAcceptTerms}
        onDecline={() => setCurrentStep('privacy')}
        showActions={true}
      />
    </div>
  )

  const renderResponsible = () => (
    <div>
      <ResponsibleGambling 
        onClose={handleViewResponsible}
        showActions={true}
      />
    </div>
  )

  const renderComplete = () => (
    <div className="max-w-2xl mx-auto p-6 text-center">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle className="w-10 h-10 text-green-500" />
      </div>
      
      <h1 className="text-title-1 font-bold mb-4">You're All Set!</h1>
      <p className="text-body text-gray-600 mb-8">
        Thank you for reviewing our policies. You now have access to all Fan Club Z features.
      </p>

      <div className="space-y-4 mb-8">
        <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
          <span className="text-body">Privacy Policy</span>
          <CheckCircle className="w-5 h-5 text-green-500" />
        </div>
        <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
          <span className="text-body">Terms of Service</span>
          <CheckCircle className="w-5 h-5 text-green-500" />
        </div>
        <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
          <span className="text-body">Responsible Gambling</span>
          <CheckCircle className="w-5 h-5 text-green-500" />
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
        <p className="text-body text-blue-800">
          <strong>Remember:</strong> You can access these policies anytime from your profile settings. 
          If you need help with responsible gambling, support is always available.
        </p>
      </div>

      <Button onClick={handleComplete} className="w-full">
        Start Betting
      </Button>
    </div>
  )

  // Check if compliance is already complete
  React.useEffect(() => {
    const isComplete = localStorage.getItem('fanclubz_compliance_complete')
    if (isComplete && !showOnFirstVisit) {
      onComplete?.()
    }
  }, [onComplete, showOnFirstVisit])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        {currentStep === 'welcome' && renderWelcome()}
        {currentStep === 'privacy' && renderPrivacy()}
        {currentStep === 'terms' && renderTerms()}
        {currentStep === 'responsible' && renderResponsible()}
        {currentStep === 'complete' && renderComplete()}
      </div>
    </div>
  )
} 