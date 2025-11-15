import React, { useState, useEffect } from 'react';
import { useAccount, useConnect } from 'wagmi';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Wallet, DollarSign, ArrowRight, Loader2, ExternalLink } from 'lucide-react';
import { useUnifiedBalance } from '../../hooks/useUnifiedBalance';
import DepositUSDCModal from '../wallet/DepositUSDCModal';
import { useAuthSession } from '../../providers/AuthSessionProvider';
import toast from 'react-hot-toast';

type OnboardingStep = 'connect' | 'fund-wallet' | 'deposit' | 'ready';

interface StepConfig {
  title: string;
  description: string;
  action: string;
  icon: React.ReactNode;
}

const STEPS: Record<OnboardingStep, StepConfig> = {
  connect: {
    title: 'Connect Your Wallet',
    description: 'Connect your wallet to start making predictions',
    action: 'Connect Wallet',
    icon: <Wallet className="w-6 h-6" />
  },
  'fund-wallet': {
    title: 'Get USDC on Base Sepolia',
    description: 'You need USDC to make predictions. Get test USDC from our faucet.',
    action: 'Get Test USDC',
    icon: <DollarSign className="w-6 h-6" />
  },
  deposit: {
    title: 'Deposit USDC to Platform',
    description: 'Transfer USDC from your wallet to the platform to start betting',
    action: 'Deposit USDC',
    icon: <ArrowRight className="w-6 h-6" />
  },
  ready: {
    title: "You're Ready! 🎉",
    description: 'You can now make predictions on the platform',
    action: 'Browse Predictions',
    icon: <Check className="w-6 h-6" />
  }
};

interface SmartOnboardingProps {
  onComplete?: () => void;
  className?: string;
}

export const SmartOnboarding: React.FC<SmartOnboardingProps> = ({ 
  onComplete,
  className = ''
}) => {
  const { user } = useAuthSession();
  const { isConnected, address } = useAccount();
  const { connect, connectors } = useConnect();
  const { 
    wallet: walletUSDC, 
    available: escrowAvailable,
    isLoading 
  } = useUnifiedBalance();
  
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('connect');
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Determine current step based on state
  useEffect(() => {
    if (!isConnected) {
      setCurrentStep('connect');
    } else if (walletUSDC === 0) {
      setCurrentStep('fund-wallet');
    } else if (escrowAvailable === 0) {
      setCurrentStep('deposit');
    } else {
      setCurrentStep('ready');
      // Call onComplete when ready
      if (onComplete) {
        onComplete();
      }
    }
  }, [isConnected, walletUSDC, escrowAvailable, onComplete]);
  
  const handleStepAction = async () => {
    setIsProcessing(true);
    
    try {
      switch (currentStep) {
        case 'connect':
          // Connect with the first available connector (usually MetaMask)
          const connector = connectors[0];
          if (connector) {
            await connect({ connector });
          } else {
            toast.error('No wallet connectors available');
          }
          break;
          
        case 'fund-wallet':
          // Open faucet in new tab
          window.open('https://faucet.circle.com/', '_blank');
          toast('Get test USDC from the faucet, then refresh this page', { icon: 'ℹ️' });
          break;
          
        case 'deposit':
          // Show deposit modal
          setShowDepositModal(true);
          break;
          
        case 'ready':
          // Navigate to predictions page
          window.location.href = '/predictions';
          break;
      }
    } catch (error) {
      console.error('Onboarding step error:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };
  
  const getStepNumber = (step: OnboardingStep): number => {
    const steps: OnboardingStep[] = ['connect', 'fund-wallet', 'deposit', 'ready'];
    return steps.indexOf(step) + 1;
  };
  
  const currentStepNumber = getStepNumber(currentStep);
  const stepConfig = STEPS[currentStep];
  
  if (isLoading) {
    return (
      <div className={`bg-gradient-to-r from-purple-900 to-blue-900 p-6 rounded-xl ${className}`}>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 text-white animate-spin" />
        </div>
      </div>
    );
  }
  
  return (
    <>
      <div className={`bg-gradient-to-r from-purple-900 to-blue-900 p-6 rounded-xl ${className}`}>
        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6">
          {Object.keys(STEPS).map((step, index) => {
            const stepNum = index + 1;
            const isActive = stepNum === currentStepNumber;
            const isComplete = stepNum < currentStepNumber;
            
            return (
              <div key={step} className="flex items-center flex-1">
                <div className="flex items-center">
                  <div
                    className={`
                      w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all
                      ${isComplete ? 'bg-green-500 text-white' : ''}
                      ${isActive ? 'bg-white text-purple-900 ring-4 ring-white/30' : ''}
                      ${!isComplete && !isActive ? 'bg-purple-800 text-purple-300' : ''}
                    `}
                  >
                    {isComplete ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      stepNum
                    )}
                  </div>
                </div>
                {index < Object.keys(STEPS).length - 1 && (
                  <div className="flex-1 h-1 mx-2">
                    <div className="h-full bg-purple-800 rounded">
                      <div
                        className="h-full bg-green-500 rounded transition-all duration-500"
                        style={{ width: isComplete ? '100%' : '0%' }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Current Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-center"
          >
            {/* Icon */}
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 text-white">
              {stepConfig.icon}
            </div>
            
            {/* Title */}
            <h3 className="text-xl font-bold text-white mb-2">
              {stepConfig.title}
            </h3>
            
            {/* Description */}
            <p className="text-purple-100 mb-6 max-w-sm mx-auto">
              {stepConfig.description}
            </p>
            
            {/* Additional Info */}
            {currentStep === 'fund-wallet' && (
              <div className="bg-white/10 rounded-lg p-3 mb-4 text-sm text-purple-100">
                <p>Make sure to:</p>
                <ul className="mt-2 space-y-1 text-left max-w-xs mx-auto">
                  <li>• Select <strong>Base Sepolia</strong> network</li>
                  <li>• Request at least <strong>10 USDC</strong></li>
                  <li>• Wait for transaction confirmation</li>
                </ul>
              </div>
            )}
            
            {currentStep === 'deposit' && walletUSDC > 0 && (
              <div className="bg-white/10 rounded-lg p-3 mb-4">
                <p className="text-sm text-purple-100 mb-1">Wallet Balance:</p>
                <p className="text-2xl font-bold text-white">
                  ${walletUSDC.toFixed(2)} USDC
                </p>
              </div>
            )}
            
            {currentStep === 'ready' && (
              <div className="bg-white/10 rounded-lg p-3 mb-4">
                <p className="text-sm text-purple-100 mb-1">Available to Bet:</p>
                <p className="text-2xl font-bold text-white">
                  ${escrowAvailable.toFixed(2)}
                </p>
              </div>
            )}
            
            {/* Action Button */}
            <button
              onClick={handleStepAction}
              disabled={isProcessing}
              className={`
                px-8 py-3 rounded-xl font-semibold transition-all
                ${currentStep === 'ready' 
                  ? 'bg-green-500 hover:bg-green-600 text-white' 
                  : 'bg-white hover:bg-purple-50 text-purple-900'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
                transform hover:scale-105 active:scale-95
              `}
            >
              {isProcessing ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  {stepConfig.action}
                  {currentStep === 'fund-wallet' && (
                    <ExternalLink className="w-4 h-4" />
                  )}
                </span>
              )}
            </button>
            
            {/* Skip Option (for testing) */}
            {process.env.NODE_ENV === 'development' && currentStep !== 'ready' && (
              <button
                onClick={() => {
                  const steps: OnboardingStep[] = ['connect', 'fund-wallet', 'deposit', 'ready'];
                  const nextIndex = steps.indexOf(currentStep) + 1;
                  if (nextIndex < steps.length) {
                    const nextStep = steps[nextIndex];
                    if (nextStep) {
                      setCurrentStep(nextStep);
                    }
                  }
                }}
                className="mt-3 text-xs text-purple-200 hover:text-white underline"
              >
                Skip this step (dev only)
              </button>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      
      {/* Deposit Modal */}
      {showDepositModal && user?.id && (
        <DepositUSDCModal
          open={showDepositModal}
          onClose={() => setShowDepositModal(false)}
          availableUSDC={walletUSDC}
          userId={user.id}
          onSuccess={() => setShowDepositModal(false)}
        />
      )}
    </>
  );
};

export default SmartOnboarding;
