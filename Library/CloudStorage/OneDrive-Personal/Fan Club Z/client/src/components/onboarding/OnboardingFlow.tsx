import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle, Shield, FileText, Heart, ArrowRight, Star } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useLocation } from 'wouter';

interface OnboardingFlowProps {
  onComplete?: () => void;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState<'welcome' | 'terms' | 'privacy' | 'responsible' | 'complete'>('welcome');
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const { user, completeOnboarding } = useAuthStore();
  const [, setLocation] = useLocation();

  const markStepComplete = (step: string) => {
    setCompletedSteps(prev => [...prev, step]);
  };

  const handleGetStarted = () => {
    console.log('[ONBOARDING] Get Started clicked');
    setCurrentStep('terms');
  };

  const handleTermsAgree = () => {
    console.log('[SUCCESS] OnboardingFlow: Terms agreed');
    markStepComplete('terms');
    setCurrentStep('privacy');
  };

  const handlePrivacyAgree = () => {
    console.log('[SUCCESS] OnboardingFlow: Privacy agreed');
    markStepComplete('privacy');
    setCurrentStep('responsible');
  };

  const handleResponsibleGamblingClose = () => {
    console.log('[SUCCESS] OnboardingFlow: Responsible gambling viewed');
    markStepComplete('responsible');
    setCurrentStep('complete');
  };

  const handleFinishOnboarding = async () => {
    console.log('[INIT] OnboardingFlow: Starting onboarding completion process');
    
    try {
      // Set compliance status in localStorage with detailed tracking
      const complianceStatus = {
        ageVerified: true,
        privacyAccepted: true,
        termsAccepted: true,
        responsibleGamblingAcknowledged: true,
        completedAt: new Date().toISOString(),
        version: '1.0',
        userAgent: navigator.userAgent,
        completedSteps: ['terms', 'privacy', 'responsible'],
        userId: user?.id
      };
      localStorage.setItem('compliance_status', JSON.stringify(complianceStatus));
      console.log('[SUCCESS] OnboardingFlow: Compliance status saved with details');
      
      // Set a simple flag for quick checking
      localStorage.setItem('onboarding_completed', 'true');
      localStorage.setItem('onboarding_completed_at', new Date().toISOString());
      
      // Complete onboarding in auth store first
      completeOnboarding();
      console.log('[SUCCESS] OnboardingFlow: Auth store onboarding completed');
      
      // Mark completion in auth store
      console.log('[SUCCESS] OnboardingFlow: Marking onboarding complete in auth store');
      
      // Force multiple persistence checks
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Verify the state was saved correctly
      const authState = useAuthStore.getState();
      console.log('[CHECK] OnboardingFlow: Final auth state verification:', {
        isAuthenticated: authState.isAuthenticated,
        onboardingCompleted: authState.onboardingCompleted,
        user: authState.user?.email,
        hasCompletedOnboarding: authState.user?.hasCompletedOnboarding
      });
      
      // Double-check localStorage persistence
      const persistedCompliance = localStorage.getItem('compliance_status');
      const persistedFlag = localStorage.getItem('onboarding_completed');
      console.log('[CHECK] OnboardingFlow: Persistence verification:', {
        hasComplianceStatus: !!persistedCompliance,
        hasCompletedFlag: persistedFlag === 'true'
      });
      
      // Force a state update to trigger re-renders
      useAuthStore.setState(state => ({
        ...state,
        onboardingCompleted: true
      }));
      
      // Call onComplete callback if provided
      if (onComplete && typeof onComplete === 'function') {
        onComplete();
      }
      
      // Navigate to discover page with slight delay to ensure state is updated
      setTimeout(() => {
        console.log('[SUCCESS] OnboardingFlow: Navigating to /discover');
        setLocation('/discover');
      }, 300);
      
    } catch (error) {
      console.error('[ERROR] OnboardingFlow: Error completing onboarding:', error);
      // Still proceed to avoid blocking user - set minimal completion state
      localStorage.setItem('onboarding_completed', 'true');
      useAuthStore.setState(state => ({
        ...state,
        onboardingCompleted: true
      }));
      
      console.log('[FALLBACK] OnboardingFlow: Proceeding with fallback redirect');
      if (onComplete && typeof onComplete === 'function') {
        onComplete();
      }
      setTimeout(() => setLocation('/discover'), 100);
    }
  };

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
  );

  const renderTerms = () => (
    <div className="min-h-screen flex flex-col bg-gray-50 w-full overflow-x-hidden">
      {/* Fixed Header */}
      <div className="flex-shrink-0 text-center py-4 px-4 bg-white border-b border-gray-100">
        <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-2">
          <FileText className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-lg font-bold text-gray-900 mb-1">Terms of Service</h1>
        <p className="text-sm text-gray-600">Review our platform rules and your user agreement</p>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 px-4 py-4 overflow-hidden min-h-0 max-w-4xl mx-auto w-full">
        <div className="h-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 h-full flex flex-col">
            <div className="flex-1 overflow-y-auto space-y-4 text-sm leading-relaxed text-gray-700">
              {[
                { title: 'User Agreement', content: 'By using Fan Club Z, you agree to participate in social betting responsibly and follow our community guidelines. This includes treating other users with respect and following all posted rules.' },
                { title: 'Age Verification', content: 'You must be 18 years or older to use our platform. We verify this through government-issued ID checks and other identity verification methods to ensure compliance with gambling laws.' },
                { title: 'Betting Rules & Fair Play', content: 'All bets are final once placed and confirmed. We ensure fair play through automated systems, community moderation, and strict anti-fraud measures. No manipulation or cheating is tolerated.' },
                { title: 'Account Security & Responsibility', content: 'You are responsible for keeping your account secure and all activity under your account. We recommend enabling two-factor authentication and never sharing your login credentials.' },
                { title: 'Financial Terms', content: 'All transactions are processed securely. You must have sufficient funds before placing bets. Withdrawal processing times may vary based on payment method selected.' },
                { title: 'Prohibited Activities', content: 'Strictly prohibited: underage gambling, account sharing, automated betting systems, market manipulation, fraud, harassment, or any attempt to circumvent platform security measures.' }
              ].map((section, index) => (
                <div key={index} className="break-words">
                  <h3 className="text-base font-semibold text-gray-900 mb-2">{section.title}</h3>
                  <p className="text-sm leading-relaxed mb-3">
                    {section.content}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Footer Buttons */}
      <div className="flex-shrink-0 flex gap-3 px-4 py-4 bg-white border-t border-gray-100 safe-area-inset-bottom">
        <Button onClick={() => setCurrentStep('welcome')} variant="outline" className="flex-1 h-12 text-sm">Back</Button>
        <Button onClick={handleTermsAgree} className="flex-1 h-12 text-sm bg-blue-600 hover:bg-blue-700 text-white">I Agree</Button>
      </div>
    </div>
  );

  const renderPrivacy = () => (
    <div className="min-h-screen flex flex-col bg-gray-50 w-full overflow-x-hidden">
      {/* Fixed Header */}
      <div className="flex-shrink-0 text-center py-4 px-4 bg-white border-b border-gray-100">
        <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-2">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-lg font-bold text-gray-900 mb-1">Privacy Policy</h1>
        <p className="text-sm text-gray-600">Learn how we protect your personal information</p>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 px-4 py-4 overflow-hidden min-h-0 max-w-4xl mx-auto w-full">
        <div className="h-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 h-full flex flex-col">
            <div className="flex-1 overflow-y-auto space-y-4 text-sm leading-relaxed text-gray-700">
              {[
                { title: 'Data Collection', content: 'We collect only the information necessary to provide our betting services and ensure security. This includes personal information (name, email, date of birth), identity verification documents, financial information for payments, and betting activity.' },
                { title: 'Data Usage', content: 'Your data is used to process transactions, verify identity, and improve our services. We never sell your data to third parties. Data is shared only with essential service providers like payment processors and regulatory authorities when required.' },
                { title: 'Data Protection', content: 'We use industry-standard encryption and security measures to protect your personal information. All data is stored securely with regular backups and access is strictly limited to authorized personnel.' },
                { title: 'Your Rights', content: 'You can request access to, modification of, or deletion of your personal data at any time. You can also opt-out of marketing communications and file complaints with data protection authorities if needed.' },
                { title: 'Data Retention', content: 'We retain your data for 7 years as required by law for anti-money laundering compliance. You may request earlier deletion in certain circumstances, subject to legal requirements.' },
                { title: 'Cookies & Tracking', content: 'We use essential cookies for platform functionality and optional analytics cookies to improve user experience. You can control cookie preferences in your browser settings.' }
              ].map((section, index) => (
                <div key={index} className="break-words">
                  <h3 className="text-base font-semibold text-gray-900 mb-2">{section.title}</h3>
                  <p className="text-sm leading-relaxed mb-3">
                    {section.content}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Footer Buttons */}
      <div className="flex-shrink-0 flex gap-3 px-4 py-4 bg-white border-t border-gray-100 safe-area-inset-bottom">
        <Button onClick={() => setCurrentStep('terms')} variant="outline" className="flex-1 h-12 text-sm">Back</Button>
        <Button onClick={handlePrivacyAgree} className="flex-1 h-12 text-sm bg-green-600 hover:bg-green-700 text-white">I Agree</Button>
      </div>
    </div>
  );

  const renderResponsible = () => (
    <div className="min-h-screen flex flex-col bg-gray-50 w-full overflow-x-hidden">
      {/* Fixed Header */}
      <div className="flex-shrink-0 text-center py-4 px-4 bg-white border-b border-gray-100">
        <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-2">
          <Heart className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-lg font-bold text-gray-900 mb-1">Responsible Gambling</h1>
        <p className="text-sm text-gray-600">Important guidelines for safe betting practices</p>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 px-4 py-4 overflow-hidden min-h-0 max-w-4xl mx-auto w-full">
        <div className="h-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 h-full flex flex-col">
            <div className="flex-1 overflow-y-auto space-y-4 text-sm leading-relaxed text-gray-700">
              {[
                { title: 'Bet Responsibly', content: 'Only bet what you can afford to lose. Set limits and stick to them. Gambling should be fun entertainment, not a way to solve financial problems or escape from stress. Never chase losses or bet with borrowed money.' },
                { title: 'Warning Signs to Watch For', content: '• Spending more money than you planned\n• Betting affecting your relationships, work, or finances\n• Feeling anxious, depressed, or irritable when not betting\n• Trying to win back losses by gambling more\n• Lying about gambling activities to family or friends' },
                { title: 'Support & Help Resources', content: 'If gambling becomes a problem, help is available 24/7:\n• National Problem Gambling Helpline: 1-800-522-4700\n• Gamblers Anonymous: 1-855-222-5542\n• Online support: www.ncpgambling.org\n• Crisis Text Line: Text HOME to 741741' },
                { title: 'Platform Safety Features', content: 'Use our built-in safety tools:\n• Daily, weekly, and monthly spending limits\n• Session time limits and reality checks\n• Self-exclusion options (24 hours to permanent)\n• Account activity monitoring and alerts' },
                { title: 'Healthy Gambling Practices', content: '• Set a budget before you start and stick to it\n• Take regular breaks and don\'t gamble for long periods\n• Don\'t gamble when upset, depressed, or under the influence\n• View gambling as entertainment, not an investment\n• Keep gambling balanced with other activities in your life' }
              ].map((section, index) => (
                <div key={index} className="break-words">
                  <h3 className="text-base font-semibold text-gray-900 mb-2">{section.title}</h3>
                  <p className="text-sm leading-relaxed mb-3 whitespace-pre-line">
                    {section.content}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Footer Buttons */}
      <div className="flex-shrink-0 flex gap-3 px-4 py-4 bg-white border-t border-gray-100 safe-area-inset-bottom">
        <Button onClick={() => setCurrentStep('privacy')} variant="outline" className="flex-1 h-12 text-sm">Back</Button>
        <Button onClick={handleResponsibleGamblingClose} className="flex-1 h-12 text-sm bg-red-600 hover:bg-red-700 text-white">Close</Button>
      </div>
    </div>
  );

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
  );

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
  );
};
