import React, { useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { ComplianceScreen } from '@/components/compliance/ComplianceScreen'

interface OnboardingFlowProps {
  onComplete: () => void
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0)
  const { user, completeOnboarding, setUser } = useAuthStore()

  const steps = [
    {
      title: "Terms of Service",
      content: (
        <>
          <div className="mb-6">
            <p className="text-base leading-relaxed">
              By using Fan Club Z, you agree to participate in social betting 
              responsibly and follow our community guidelines.
            </p>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Age Verification</h3>
            <p className="text-base leading-relaxed">
              You must be 18 years or older to use our platform. We verify this 
              through identity checks.
            </p>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Betting Rules</h3>
            <p className="text-base leading-relaxed">
              All bets are final once placed. We ensure fair play through our 
              transparent settlement process.
            </p>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Responsible Gaming</h3>
            <p className="text-base leading-relaxed">
              We promote responsible gaming and provide tools to help you stay 
              in control of your betting activities.
            </p>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Privacy & Data</h3>
            <p className="text-base leading-relaxed">
              Your personal information is protected according to our privacy 
              policy. We use industry-standard security measures.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3">Community Guidelines</h3>
            <p className="text-base leading-relaxed">
              Maintain respect for all users. Harassment, spam, or fraudulent 
              activity will result in account suspension.
            </p>
          </div>
        </>
      )
    }
  ]

  const handleAccept = async () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      // Complete onboarding and ensure user stays logged in
      try {
        console.log('🎯 Completing onboarding...')
        
        // Mark onboarding as complete in the store
        await completeOnboarding()
        
        // Ensure user object has onboarding completion flag and maintains auth
        if (user) {
          const updatedUser = {
            ...user,
            hasCompletedOnboarding: true,
            isAuthenticated: true // Ensure auth state is maintained
          }
          
          setUser(updatedUser)
          console.log('✅ User object updated:', updatedUser)
        }
        
        console.log('🎉 Onboarding completed - user should remain logged in')
        
        // Navigate to main app without requiring re-login
        onComplete()
        
      } catch (error) {
        console.error('❌ Error completing onboarding:', error)
        // Still proceed to avoid blocking user
        onComplete()
      }
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const currentStepData = steps[currentStep]

  return (
    <ComplianceScreen
      title={currentStepData.title}
      onAccept={handleAccept}
      onBack={currentStep > 0 ? handleBack : undefined}
    >
      {currentStepData.content}
    </ComplianceScreen>
  )
}

export default OnboardingFlow