import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle, Shield, FileText, Heart, ArrowRight, Star } from 'lucide-react'

interface OnboardingFlowProps {
  onComplete: () => void
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState<'welcome' | 'terms' | 'privacy' | 'responsible' | 'complete'>('welcome')
  const [completedSteps, setCompletedSteps] = useState<string[]>([])

  const markStepComplete = (step: string) => {
    setCompletedSteps(prev => [...prev, step])
  }

  const handleGetStarted = () => {
    console.log('🚀 OnboardingFlow: Get Started clicked')
    setCurrentStep('terms')
  }

  const handleTermsAgree = () => {
    console.log('✅ OnboardingFlow: Terms agreed')
    markStepComplete('terms')
    setCurrentStep('privacy')
  }

  const handlePrivacyAgree = () => {
    console.log('✅ OnboardingFlow: Privacy agreed')
    markStepComplete('privacy')
    setCurrentStep('responsible')
  }

  const handleResponsibleGamblingClose = () => {
    console.log('✅ OnboardingFlow: Responsible gambling viewed')
    markStepComplete('responsible')
    setCurrentStep('complete')
  }

  const handleFinishOnboarding = () => {
    console.log('🎉 OnboardingFlow: Onboarding complete')
    // Set compliance status
    const complianceStatus = {
      ageVerified: true,
      privacyAccepted: true,
      termsAccepted: true,
      responsibleGamblingAcknowledged: true,
      completedAt: new Date().toISOString()
    }
    localStorage.setItem('compliance_status', JSON.stringify(complianceStatus))
    onComplete()
  }

  const renderWelcome = () => (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="text-center mb-12">
        <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg">
          <Star className="w-12 h-12 text-white" />
        </div>
        
        <h1 className="text-title-1 font-bold mb-6 text-gray-900">Welcome to Fan Club Z</h1>
        <p className="text-body text-gray-600 max-w-2xl mx-auto leading-relaxed">
          Get ready to join the future of social betting! Let's quickly walk you through our 
          platform policies and responsible gambling guidelines.
        </p>
      </div>

      <div className="grid gap-6 mb-12 max-w-3xl mx-auto">
        <div className="flex items-center space-x-4 p-6 bg-gradient-to-r from-blue-50 to-blue-100 rounded-2xl border border-blue-200">
          <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-title-3 font-semibold text-blue-900 mb-1">Terms of Service</h3>
            <p className="text-body-sm text-blue-700">Review our platform rules and your user agreement</p>
          </div>
          <ArrowRight className="w-5 h-5 text-blue-400" />
        </div>
        
        <div className="flex items-center space-x-4 p-6 bg-gradient-to-r from-green-50 to-green-100 rounded-2xl border border-green-200">
          <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-title-3 font-semibold text-green-900 mb-1">Privacy Policy</h3>
            <p className="text-body-sm text-green-700">Learn how we protect your personal information</p>
          </div>
          <ArrowRight className="w-5 h-5 text-green-400" />
        </div>
        
        <div className="flex items-center space-x-4 p-6 bg-gradient-to-r from-red-50 to-red-100 rounded-2xl border border-red-200">
          <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
            <Heart className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-title-3 font-semibold text-red-900 mb-1">Responsible Gambling</h3>
            <p className="text-body-sm text-red-700">Important guidelines for safe betting practices</p>
          </div>
          <ArrowRight className="w-5 h-5 text-red-400" />
        </div>
      </div>

      <div className="text-center">
        <Button 
          onClick={handleGetStarted}
          className="bg-green-600 hover:bg-green-700 text-white px-12 py-4 rounded-2xl text-body font-semibold shadow-lg hover:shadow-xl transition-all duration-200 active:scale-95"
        >
          Get Started
        </Button>
      </div>
    </div>
  )

  const renderTerms = () => (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-title-1 font-bold mb-4 text-gray-900">Terms of Service</h1>
        <p className="text-body text-gray-600">Please review and accept our terms of service</p>
      </div>

      <Card className="mb-8">
        <CardContent className="p-8">
          <div className="space-y-6 text-body text-gray-700 max-h-96 overflow-y-auto">
            <h3 className="text-title-3 font-semibold text-gray-900">User Agreement</h3>
            <p>
              By using Fan Club Z, you agree to participate in social betting responsibly and follow our community guidelines.
            </p>
            
            <h3 className="text-title-3 font-semibold text-gray-900">Age Verification</h3>
            <p>
              You must be 18 years or older to use our platform. We verify this through identity checks.
            </p>
            
            <h3 className="text-title-3 font-semibold text-gray-900">Betting Rules</h3>
            <p>
              All bets are final once placed. We ensure fair play through automated systems and community moderation.
            </p>
            
            <h3 className="text-title-3 font-semibold text-gray-900">Account Security</h3>
            <p>
              You are responsible for keeping your account secure. We recommend enabling two-factor authentication.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4 justify-center">
        <Button 
          onClick={() => setCurrentStep('welcome')}
          variant="outline"
          className="px-8 py-3"
        >
          Back
        </Button>
        <Button 
          onClick={handleTermsAgree}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
        >
          I Agree
        </Button>
      </div>
    </div>
  )

  const renderPrivacy = () => (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <Shield className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-title-1 font-bold mb-4 text-gray-900">Privacy Policy</h1>
        <p className="text-body text-gray-600">Learn how we handle your personal information</p>
      </div>

      <Card className="mb-8">
        <CardContent className="p-8">
          <div className="space-y-6 text-body text-gray-700 max-h-96 overflow-y-auto">
            <h3 className="text-title-3 font-semibold text-gray-900">Data Collection</h3>
            <p>
              We collect only the information necessary to provide our betting services and ensure security.
            </p>
            
            <h3 className="text-title-3 font-semibold text-gray-900">Data Usage</h3>
            <p>
              Your data is used to process transactions, verify identity, and improve our services. We never sell your data.
            </p>
            
            <h3 className="text-title-3 font-semibold text-gray-900">Data Protection</h3>
            <p>
              We use industry-standard encryption and security measures to protect your personal information.
            </p>
            
            <h3 className="text-title-3 font-semibold text-gray-900">Your Rights</h3>
            <p>
              You can request access to, modification of, or deletion of your personal data at any time.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4 justify-center">
        <Button 
          onClick={() => setCurrentStep('terms')}
          variant="outline"
          className="px-8 py-3"
        >
          Back
        </Button>
        <Button 
          onClick={handlePrivacyAgree}
          className="bg-green-600 hover:bg-green-700 text-white px-8 py-3"
        >
          I Agree
        </Button>
      </div>
    </div>
  )

  const renderResponsible = () => (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <Heart className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-title-1 font-bold mb-4 text-gray-900">Responsible Gambling</h1>
        <p className="text-body text-gray-600">Important information about safe betting practices</p>
      </div>

      <Card className="mb-8">
        <CardContent className="p-8">
          <div className="space-y-6 text-body text-gray-700 max-h-96 overflow-y-auto">
            <h3 className="text-title-3 font-semibold text-gray-900">Bet Responsibly</h3>
            <p>
              Only bet what you can afford to lose. Set limits and stick to them. Gambling should be fun, not stressful.
            </p>
            
            <h3 className="text-title-3 font-semibold text-gray-900">Warning Signs</h3>
            <p>
              If betting affects your relationships, work, or finances negatively, it may be time to take a break.
            </p>
            
            <h3 className="text-title-3 font-semibold text-gray-900">Support Resources</h3>
            <p>
              We provide tools for self-exclusion and links to gambling addiction support organizations.
            </p>
            
            <h3 className="text-title-3 font-semibold text-gray-900">Platform Features</h3>
            <p>
              Use our spending limits, time limits, and reality check features to maintain control over your betting.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4 justify-center">
        <Button 
          onClick={() => setCurrentStep('privacy')}
          variant="outline"
          className="px-8 py-3"
        >
          Back
        </Button>
        <Button 
          onClick={handleResponsibleGamblingClose}
          className="bg-red-600 hover:bg-red-700 text-white px-8 py-3"
        >
          Close
        </Button>
      </div>
    </div>
  )

  const renderComplete = () => (
    <div className="max-w-4xl mx-auto px-6 py-8 text-center">
      <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg">
        <CheckCircle className="w-12 h-12 text-white" />
      </div>
      
      <h1 className="text-title-1 font-bold mb-6 text-gray-900">Setup Complete!</h1>
      <p className="text-body text-gray-600 max-w-2xl mx-auto leading-relaxed mb-8">
        Welcome to Fan Club Z! You're now ready to explore bets, join clubs, and engage with our community.
      </p>

      <div className="grid gap-4 mb-12 max-w-2xl mx-auto">
        {['Terms of Service', 'Privacy Policy', 'Responsible Gambling'].map((item, index) => (
          <div key={index} className="flex items-center justify-between p-4 bg-green-50 rounded-xl border border-green-200">
            <span className="text-title-3 font-medium text-green-900">{item}</span>
            <CheckCircle className="w-6 h-6 text-green-500" />
          </div>
        ))}
      </div>

      <Button 
        onClick={handleFinishOnboarding}
        className="bg-green-600 hover:bg-green-700 text-white px-12 py-4 rounded-2xl text-body font-semibold shadow-lg hover:shadow-xl transition-all duration-200 active:scale-95"
      >
        Start Exploring
      </Button>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="container mx-auto py-4 lg:py-8">
        {currentStep === 'welcome' && renderWelcome()}
        {currentStep === 'terms' && renderTerms()}
        {currentStep === 'privacy' && renderPrivacy()}
        {currentStep === 'responsible' && renderResponsible()}
        {currentStep === 'complete' && renderComplete()}
      </div>
    </div>
  )
}
