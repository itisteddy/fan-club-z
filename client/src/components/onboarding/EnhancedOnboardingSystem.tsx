import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { 
  ChevronRight, 
  ChevronLeft, 
  X, 
  Target, 
  Sparkles, 
  Compass, 
  Wallet,
  CheckCircle,
  Skip,
  Play
} from 'lucide-react';

// Types
interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  target?: string; // data-tour-id selector
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  icon?: React.ReactNode;
  action?: 'highlight' | 'modal' | 'spotlight';
  onNext?: () => Promise<void> | void;
  onPrev?: () => Promise<void> | void;
  skipable?: boolean;
  delay?: number; // ms delay before showing
}

interface OnboardingConfig {
  steps: OnboardingStep[];
  autoStart?: boolean;
  showProgress?: boolean;
  allowSkip?: boolean;
  theme?: 'light' | 'dark';
  persistent?: boolean; // Save progress if interrupted
}

interface UseOnboardingState {
  isActive: boolean;
  currentStep: number;
  completed: boolean;
  skipped: boolean;
  userPreferences: {
    hasSeenOnboarding: boolean;
    preferredTourStyle: 'full' | 'minimal' | 'none';
    completedSteps: string[];
  };
}

// Enhanced onboarding hook with state management
export const useEnhancedOnboarding = () => {
  const [state, setState] = useState<UseOnboardingState>(() => {
    const saved = localStorage.getItem('fcz_onboarding_state_v2');
    return saved ? JSON.parse(saved) : {
      isActive: false,
      currentStep: 0,
      completed: false,
      skipped: false,
      userPreferences: {
        hasSeenOnboarding: false,
        preferredTourStyle: 'full',
        completedSteps: []
      }
    };
  });

  const [config, setConfig] = useState<OnboardingConfig | null>(null);

  // Save state to localStorage
  const saveState = useCallback((newState: Partial<UseOnboardingState>) => {
    const updatedState = { ...state, ...newState };
    setState(updatedState);
    localStorage.setItem('fcz_onboarding_state_v2', JSON.stringify(updatedState));
  }, [state]);

  const startOnboarding = useCallback((newConfig: OnboardingConfig) => {
    setConfig(newConfig);
    saveState({ 
      isActive: true, 
      currentStep: 0, 
      completed: false, 
      skipped: false 
    });
  }, [saveState]);

  const nextStep = useCallback(async () => {
    if (!config) return;
    
    const currentStepData = config.steps[state.currentStep];
    if (currentStepData?.onNext) {
      await currentStepData.onNext();
    }

    if (state.currentStep < config.steps.length - 1) {
      const newStep = state.currentStep + 1;
      saveState({ currentStep: newStep });
      
      // Mark current step as completed
      const updatedPrefs = {
        ...state.userPreferences,
        completedSteps: [...state.userPreferences.completedSteps, currentStepData.id]
      };
      saveState({ userPreferences: updatedPrefs });
    } else {
      // Onboarding completed
      saveState({ 
        isActive: false, 
        completed: true,
        userPreferences: {
          ...state.userPreferences,
          hasSeenOnboarding: true
        }
      });
    }
  }, [config, state, saveState]);

  const prevStep = useCallback(async () => {
    const currentStepData = config?.steps[state.currentStep];
    if (currentStepData?.onPrev) {
      await currentStepData.onPrev();
    }

    if (state.currentStep > 0) {
      saveState({ currentStep: state.currentStep - 1 });
    }
  }, [config, state, saveState]);

  const skipOnboarding = useCallback(() => {
    saveState({ 
      isActive: false, 
      skipped: true,
      userPreferences: {
        ...state.userPreferences,
        hasSeenOnboarding: true,
        preferredTourStyle: 'minimal'
      }
    });
  }, [saveState]);

  const resetOnboarding = useCallback(() => {
    localStorage.removeItem('fcz_onboarding_state_v2');
    setState({
      isActive: false,
      currentStep: 0,
      completed: false,
      skipped: false,
      userPreferences: {
        hasSeenOnboarding: false,
        preferredTourStyle: 'full',
        completedSteps: []
      }
    });
  }, []);

  return {
    state,
    config,
    startOnboarding,
    nextStep,
    prevStep,
    skipOnboarding,
    resetOnboarding
  };
};

// Smart positioning utility
const calculateOptimalPosition = (targetRect: DOMRect, tooltipRect: DOMRect, placement: string = 'auto') => {
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight
  };
  
  const spacing = 12; // Space between target and tooltip
  const positions = {
    top: {
      x: targetRect.left + (targetRect.width - tooltipRect.width) / 2,
      y: targetRect.top - tooltipRect.height - spacing
    },
    bottom: {
      x: targetRect.left + (targetRect.width - tooltipRect.width) / 2,
      y: targetRect.bottom + spacing
    },
    left: {
      x: targetRect.left - tooltipRect.width - spacing,
      y: targetRect.top + (targetRect.height - tooltipRect.height) / 2
    },
    right: {
      x: targetRect.right + spacing,
      y: targetRect.top + (targetRect.height - tooltipRect.height) / 2
    },
    center: {
      x: (viewport.width - tooltipRect.width) / 2,
      y: (viewport.height - tooltipRect.height) / 2
    }
  };

  if (placement !== 'auto') {
    return positions[placement as keyof typeof positions] || positions.center;
  }

  // Auto-placement logic
  const fits = {
    top: targetRect.top > tooltipRect.height + spacing,
    bottom: targetRect.bottom + tooltipRect.height + spacing < viewport.height,
    left: targetRect.left > tooltipRect.width + spacing,
    right: targetRect.right + tooltipRect.width + spacing < viewport.width
  };

  // Prefer bottom, then top, then sides
  if (fits.bottom) return positions.bottom;
  if (fits.top) return positions.top;
  if (fits.right) return positions.right;
  if (fits.left) return positions.left;
  
  return positions.center;
};

// Enhanced Tooltip Component
interface TooltipProps {
  step: OnboardingStep;
  position: { x: number; y: number };
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  isFirst: boolean;
  isLast: boolean;
  stepNumber: number;
  totalSteps: number;
  canSkip: boolean;
}

const EnhancedTooltip: React.FC<TooltipProps> = ({
  step,
  position,
  onNext,
  onPrev,
  onSkip,
  isFirst,
  isLast,
  stepNumber,
  totalSteps,
  canSkip
}) => {
  return (
    <motion.div
      className="fixed bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[15000] max-w-sm"
      style={{
        left: Math.max(16, Math.min(position.x, window.innerWidth - 384)), // 384px = max-w-sm
        top: Math.max(16, Math.min(position.y, window.innerHeight - 200))
      }}
      initial={{ scale: 0.8, opacity: 0, y: 10 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.8, opacity: 0, y: 10 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {step.icon && (
              <div className="w-6 h-6 flex items-center justify-center">
                {step.icon}
              </div>
            )}
            <h3 className="font-semibold text-lg">{step.title}</h3>
          </div>
          {canSkip && (
            <button
              onClick={onSkip}
              className="p-1 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Skip tour"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        
        {/* Progress indicator */}
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 bg-white/20 rounded-full h-2">
            <div 
              className="bg-white rounded-full h-2 transition-all duration-300"
              style={{ width: `${((stepNumber + 1) / totalSteps) * 100}%` }}
            />
          </div>
          <span className="text-xs font-medium">
            {stepNumber + 1} of {totalSteps}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <p className="text-gray-700 text-sm leading-relaxed mb-4">
          {step.description}
        </p>

        {/* Actions */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={onPrev}
            disabled={isFirst}
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-gray-100 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 transition-colors text-sm font-medium"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: totalSteps }, (_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === stepNumber ? 'bg-green-500' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>

          <button
            onClick={onNext}
            className="flex items-center gap-1 px-4 py-2 rounded-xl bg-green-500 text-white hover:bg-green-600 transition-colors text-sm font-medium"
          >
            {isLast ? (
              <>
                <CheckCircle className="w-4 h-4" />
                Finish
              </>
            ) : (
              <>
                Next
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// Spotlight overlay component
const SpotlightOverlay: React.FC<{ targetRect: DOMRect | null }> = ({ targetRect }) => {
  const radius = targetRect ? Math.max(targetRect.width, targetRect.height) / 2 + 16 : 0;
  const centerX = targetRect ? targetRect.left + targetRect.width / 2 : 0;
  const centerY = targetRect ? targetRect.top + targetRect.height / 2 : 0;

  return (
    <div className="fixed inset-0 z-[14000] pointer-events-none">
      <svg width="100%" height="100%" className="absolute inset-0">
        <defs>
          <radialGradient id="spotlight" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.6)" />
          </radialGradient>
          <mask id="spotlightMask">
            <rect width="100%" height="100%" fill="white" />
            {targetRect && (
              <circle
                cx={centerX}
                cy={centerY}
                r={radius}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.6)"
          mask="url(#spotlightMask)"
        />
      </svg>
    </div>
  );
};

// Main Enhanced Onboarding Component
interface EnhancedOnboardingSystemProps {
  isActive: boolean;
  config: OnboardingConfig | null;
  currentStep: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}

export const EnhancedOnboardingSystem: React.FC<EnhancedOnboardingSystemProps> = ({
  isActive,
  config,
  currentStep,
  onNext,
  onPrev,
  onSkip
}) => {
  const [targetElement, setTargetElement] = useState<Element | null>(null);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  const step = config?.steps[currentStep];

  // Update target element and positioning
  useEffect(() => {
    if (!isActive || !step?.target) {
      setTargetElement(null);
      setTargetRect(null);
      return;
    }

    const updateTargetPosition = () => {
      const element = document.querySelector(`[data-tour-id="${step.target}"]`);
      if (element) {
        const rect = element.getBoundingClientRect();
        setTargetElement(element);
        setTargetRect(rect);

        // Scroll element into view if needed
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'center'
        });
      }
    };

    // Initial positioning
    updateTargetPosition();

    // Watch for resize and scroll changes
    const handleResize = () => updateTargetPosition();
    const handleScroll = () => updateTargetPosition();

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);

    // Use ResizeObserver for target element changes
    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect();
    }

    resizeObserverRef.current = new ResizeObserver(updateTargetPosition);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
    };
  }, [isActive, step, currentStep]);

  // Calculate tooltip position when target rect changes
  useEffect(() => {
    if (targetRect && tooltipRef.current) {
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const position = calculateOptimalPosition(
        targetRect,
        tooltipRect,
        step?.placement || 'auto'
      );
      setTooltipPosition(position);
    }
  }, [targetRect, step?.placement]);

  // Focus management for accessibility
  useEffect(() => {
    if (isActive) {
      // Focus the tooltip when it appears
      setTimeout(() => {
        const tooltip = document.querySelector('[data-onboarding-tooltip]');
        if (tooltip) {
          (tooltip as HTMLElement).focus();
        }
      }, 100);
    }
  }, [isActive, currentStep]);

  if (!isActive || !config || !step) {
    return null;
  }

  const content = (
    <AnimatePresence mode="wait">
      <motion.div
        key={`onboarding-${currentStep}`}
        className="fixed inset-0 z-[13000]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {/* Backdrop */}
        {step.action === 'spotlight' && targetRect ? (
          <SpotlightOverlay targetRect={targetRect} />
        ) : (
          <div className="absolute inset-0 bg-black/40" />
        )}

        {/* Highlight border for target element */}
        {targetRect && step.target && (
          <motion.div
            className="absolute border-4 border-green-400 rounded-xl pointer-events-none shadow-lg"
            style={{
              left: targetRect.left - 4,
              top: targetRect.top - 4,
              width: targetRect.width + 8,
              height: targetRect.height + 8
            }}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          />
        )}

        {/* Tooltip */}
        <div ref={tooltipRef} data-onboarding-tooltip tabIndex={-1}>
          <EnhancedTooltip
            step={step}
            position={tooltipPosition}
            onNext={onNext}
            onPrev={onPrev}
            onSkip={onSkip}
            isFirst={currentStep === 0}
            isLast={currentStep === config.steps.length - 1}
            stepNumber={currentStep}
            totalSteps={config.steps.length}
            canSkip={config.allowSkip !== false}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(content, document.body);
};

// Welcome Modal Component with better UX
interface WelcomeModalProps {
  isOpen: boolean;
  onStartTour: () => void;
  onSkip: () => void;
  onMinimalTour: () => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({
  isOpen,
  onStartTour,
  onSkip,
  onMinimalTour
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[16000] flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          
          <motion.div
            className="relative bg-white rounded-3xl shadow-2xl overflow-hidden max-w-md w-full"
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {/* Header with gradient */}
            <div className="bg-gradient-to-br from-green-500 via-emerald-600 to-teal-600 p-6 text-white text-center relative overflow-hidden">
              <motion.div
                className="absolute inset-0 bg-white/10"
                animate={{
                  background: [
                    "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.1) 0%, transparent 50%)",
                    "radial-gradient(circle at 80% 80%, rgba(255,255,255,0.1) 0%, transparent 50%)",
                    "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.1) 0%, transparent 50%)"
                  ]
                }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              />
              <div className="relative z-10">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, duration: 0.3 }}
                  className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4"
                >
                  <Sparkles className="w-8 h-8" />
                </motion.div>
                <h2 className="text-2xl font-bold mb-2">Welcome to Fan Club Z!</h2>
                <p className="text-green-100 text-sm">
                  Ready to discover the future of social predictions?
                </p>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="space-y-4 mb-6">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Compass className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Discover Predictions</h3>
                    <p className="text-sm text-gray-600">Explore trending markets and join the community</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Target className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Make Your Predictions</h3>
                    <p className="text-sm text-gray-600">Put your knowledge to the test and earn rewards</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Wallet className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Manage Everything</h3>
                    <p className="text-sm text-gray-600">Track your performance and manage your wallet</p>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="space-y-3">
                <button
                  onClick={onStartTour}
                  className="w-full bg-green-500 hover:bg-green-600 text-white py-3 px-4 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  Take the Tour
                </button>
                
                <button
                  onClick={onMinimalTour}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-4 rounded-xl font-medium transition-colors"
                >
                  Quick Overview
                </button>
                
                <button
                  onClick={onSkip}
                  className="w-full text-gray-500 hover:text-gray-700 py-2 px-4 rounded-xl font-medium transition-colors flex items-center justify-center gap-1"
                >
                  <Skip className="w-4 h-4" />
                  Skip for now
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default EnhancedOnboardingSystem;