import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
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
  ChevronsRight,
  Play,
  TrendingUp,
  User,
  Plus,
  Search,
  Filter,
  BarChart3,
  Settings
} from 'lucide-react';

// Types
export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  target?: string; // data-tour-id selector
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center' | 'auto';
  offset?: { x?: number; y?: number };
  icon?: React.ReactNode;
  action?: 'highlight' | 'modal' | 'spotlight';
  onNext?: () => Promise<void> | void;
  onPrev?: () => Promise<void> | void;
  skipable?: boolean;
  delay?: number; // ms delay before showing
}

export interface OnboardingConfig {
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

// Enhanced onboarding hook with improved state management
export const useOnboarding = () => {
  const [state, setState] = useState<UseOnboardingState>(() => {
    try {
      const saved = localStorage.getItem('fcz_onboarding_state_v3');
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
    } catch {
      return {
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
    }
  });

  const [config, setConfig] = useState<OnboardingConfig | null>(null);

  // Save state to localStorage with error handling (functional to avoid stale state)
  const saveState = useCallback((update: Partial<UseOnboardingState> | ((prev: UseOnboardingState) => Partial<UseOnboardingState>)) => {
    setState(prev => {
      const patch = typeof update === 'function' ? update(prev) : update;
      const updatedState = { ...prev, ...patch } as UseOnboardingState;
      try {
        localStorage.setItem('fcz_onboarding_state_v3', JSON.stringify(updatedState));
      } catch (error) {
        console.warn('Failed to save onboarding state:', error);
      }
      return updatedState;
    });
  }, []);

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
      try {
        await currentStepData.onNext();
      } catch (error) {
        console.warn('Step onNext handler failed:', error);
      }
    }

    saveState(prev => {
      const isLast = prev.currentStep >= (config?.steps.length || 0) - 1;
      const completedSteps = currentStepData?.id
        ? [...prev.userPreferences.completedSteps, currentStepData.id]
        : prev.userPreferences.completedSteps;
      if (isLast) {
        return {
          isActive: false,
          completed: true,
          userPreferences: {
            ...prev.userPreferences,
            hasSeenOnboarding: true,
            completedSteps,
          },
        } as Partial<UseOnboardingState>;
      }
      return {
        currentStep: prev.currentStep + 1,
        userPreferences: {
          ...prev.userPreferences,
          completedSteps,
        },
      } as Partial<UseOnboardingState>;
    });
  }, [config, state.currentStep, saveState]);

  const prevStep = useCallback(async () => {
    const currentStepData = config?.steps[state.currentStep];
    if (currentStepData?.onPrev) {
      try {
        await currentStepData.onPrev();
      } catch (error) {
        console.warn('Step onPrev handler failed:', error);
      }
    }
    if (state.currentStep > 0) {
      saveState(prev => ({ currentStep: Math.max(0, prev.currentStep - 1) }));
    }
  }, [config, state.currentStep, saveState]);

  const skipOnboarding = useCallback(() => {
    saveState(prev => ({
      isActive: false,
      skipped: true,
      userPreferences: {
        ...prev.userPreferences,
        hasSeenOnboarding: true,
        preferredTourStyle: 'minimal'
      }
    }));
  }, [saveState]);

  const resetOnboarding = useCallback(() => {
    try {
      localStorage.removeItem('fcz_onboarding_state_v3');
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
    } catch (error) {
      console.warn('Failed to reset onboarding state:', error);
    }
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

// Improved positioning utility with mobile considerations
const calculateOptimalPosition = (
  targetRect: DOMRect, 
  tooltipRect: DOMRect, 
  placement: string = 'auto'
) => {
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight
  };
  
  // Account for mobile safe areas and navigation
  const safeArea = {
    top: 44, // Status bar
    bottom: 100, // Bottom navigation + safe area
    left: 16,
    right: 16
  };
  
  const spacing = 16; // Increased spacing for mobile
  const positions = {
    top: {
      x: Math.max(safeArea.left, Math.min(
        targetRect.left + (targetRect.width - tooltipRect.width) / 2,
        viewport.width - tooltipRect.width - safeArea.right
      )),
      y: Math.max(safeArea.top, targetRect.top - tooltipRect.height - spacing)
    },
    bottom: {
      x: Math.max(safeArea.left, Math.min(
        targetRect.left + (targetRect.width - tooltipRect.width) / 2,
        viewport.width - tooltipRect.width - safeArea.right
      )),
      y: Math.min(
        viewport.height - tooltipRect.height - safeArea.bottom,
        targetRect.bottom + spacing
      )
    },
    left: {
      x: Math.max(safeArea.left, targetRect.left - tooltipRect.width - spacing),
      y: Math.max(safeArea.top, Math.min(
        targetRect.top + (targetRect.height - tooltipRect.height) / 2,
        viewport.height - tooltipRect.height - safeArea.bottom
      ))
    },
    right: {
      x: Math.min(
        viewport.width - tooltipRect.width - safeArea.right,
        targetRect.right + spacing
      ),
      y: Math.max(safeArea.top, Math.min(
        targetRect.top + (targetRect.height - tooltipRect.height) / 2,
        viewport.height - tooltipRect.height - safeArea.bottom
      ))
    },
    center: {
      x: (viewport.width - tooltipRect.width) / 2,
      y: (viewport.height - tooltipRect.height) / 2
    }
  };

  if (placement !== 'auto') {
    return positions[placement as keyof typeof positions] || positions.center;
  }

  // Auto-placement logic with better mobile considerations
  const availableSpace = {
    top: targetRect.top - safeArea.top,
    bottom: viewport.height - targetRect.bottom - safeArea.bottom,
    left: targetRect.left - safeArea.left,
    right: viewport.width - targetRect.right - safeArea.right
  };

  const fits = {
    top: availableSpace.top >= tooltipRect.height + spacing,
    bottom: availableSpace.bottom >= tooltipRect.height + spacing,
    left: availableSpace.left >= tooltipRect.width + spacing,
    right: availableSpace.right >= tooltipRect.width + spacing
  };

  // Prefer bottom for mobile, then top, then center
  if (fits.bottom) return positions.bottom;
  if (fits.top) return positions.top;
  if (fits.right && tooltipRect.width < 300) return positions.right;
  if (fits.left && tooltipRect.width < 300) return positions.left;
  
  return positions.center;
};

// Enhanced Tooltip Component with better mobile UX
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

const OnboardingTooltip: React.FC<TooltipProps> = ({
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
  const handleNext = useCallback(() => {
    console.log('Next button clicked, calling onNext');
    onNext();
  }, [onNext]);

  const handlePrev = useCallback(() => {
    console.log('Previous button clicked, calling onPrev');
    onPrev();
  }, [onPrev]);

  const handleSkip = useCallback(() => {
    console.log('Skip button clicked, calling onSkip');
    onSkip();
  }, [onSkip]);

  return (
    <motion.div
      className="fixed bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden max-w-sm z-[25000]"
      style={{
        left: position.x,
        top: position.y,
        width: 'min(calc(100vw - 32px), 380px)'
      }}
      initial={{ scale: 0.8, opacity: 0, y: 10 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.8, opacity: 0, y: 10 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-teal-600 p-4 text-white">
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
              onClick={handleSkip}
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
            onClick={handlePrev}
            disabled={isFirst}
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-gray-100 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 transition-colors text-sm font-medium min-w-[80px] justify-center"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: totalSteps }, (_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === stepNumber ? 'bg-teal-500' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            className="flex items-center gap-1 px-4 py-2 rounded-xl bg-teal-500 text-white hover:bg-teal-600 transition-colors text-sm font-medium min-w-[80px] justify-center"
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

// Improved Spotlight overlay with better performance
const SpotlightOverlay: React.FC<{ targetRect: DOMRect | null }> = ({ targetRect }) => {
  const maskId = useMemo(() => `spotlight-${Math.random().toString(36).substr(2, 9)}`, []);
  
  if (!targetRect) return null;

  const radius = Math.max(targetRect.width, targetRect.height) / 2 + 20;
  const centerX = targetRect.left + targetRect.width / 2;
  const centerY = targetRect.top + targetRect.height / 2;

  return (
    <div className="fixed inset-0 z-[24000] pointer-events-none">
      <svg width="100%" height="100%" className="absolute inset-0">
        <defs>
          <mask id={maskId}>
            <rect width="100%" height="100%" fill="white" />
            <circle
              cx={centerX}
              cy={centerY}
              r={radius}
              fill="black"
            />
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.7)"
          mask={`url(#${maskId})`}
        />
      </svg>
    </div>
  );
};

// Main Onboarding System Component
interface OnboardingSystemProps {
  isActive: boolean;
  config: OnboardingConfig | null;
  currentStep: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}

export const OnboardingSystem: React.FC<OnboardingSystemProps> = ({
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
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const step = config?.steps[currentStep];

  // Update target element and positioning with improved error handling
  useEffect(() => {
    if (!isActive || !step?.target) {
      setTargetElement(null);
      setTargetRect(null);
      return;
    }

    const updateTargetPosition = () => {
      try {
        const element = document.querySelector(`[data-tour-id="${step.target}"]`);
        if (element) {
          const rect = element.getBoundingClientRect();
          setTargetElement(element);
          setTargetRect(rect);

          // Scroll element into view with better mobile handling
          element.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'center'
          });
        } else {
          console.warn(`Onboarding target not found: ${step.target}`);
          setTargetElement(null);
          setTargetRect(null);
        }
      } catch (error) {
        console.warn('Error updating target position:', error);
      }
    };

    // Initial positioning with delay for better UX
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(updateTargetPosition, step.delay || 100);

    // Watch for resize and scroll changes
    const handleResize = () => updateTargetPosition();
    const handleScroll = () => updateTargetPosition();

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('orientationchange', handleResize);

    // Use ResizeObserver for target element changes
    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect();
    }

    resizeObserverRef.current = new ResizeObserver(updateTargetPosition);
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('orientationchange', handleResize);
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
    };
  }, [isActive, step, currentStep]);

  // Calculate tooltip position when target rect changes
  useEffect(() => {
    if (targetRect && tooltipRef.current) {
      const tooltipRect = { width: 380, height: 200 }; // Estimated size
      let position = calculateOptimalPosition(
        targetRect,
        tooltipRect,
        step?.placement || 'auto'
      );
      if (step?.offset) {
        position = {
          x: position.x + (step.offset.x ?? 0),
          y: position.y + (step.offset.y ?? 0)
        };
      }
      setTooltipPosition(position);
    }
  }, [targetRect, step?.placement]);

  // Focus management for accessibility
  useEffect(() => {
    if (isActive) {
      const timer = setTimeout(() => {
        const tooltip = document.querySelector('[data-onboarding-tooltip]');
        if (tooltip) {
          (tooltip as HTMLElement).focus();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isActive, currentStep]);

  if (!isActive || !config || !step) {
    return null;
  }

  const content = (
    <AnimatePresence mode="wait">
      <motion.div
        key={`onboarding-${currentStep}`}
        className="fixed inset-0 z-[23000]"
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
            className="absolute border-4 border-teal-400 rounded-xl pointer-events-none shadow-lg"
            style={{
              left: Math.max(0, targetRect.left - 4),
              top: Math.max(0, targetRect.top - 4),
              width: Math.min(window.innerWidth, targetRect.width + 8),
              height: targetRect.height + 8
            }}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          />
        )}

        {/* Tooltip */}
        <div ref={tooltipRef} data-onboarding-tooltip tabIndex={-1}>
          <OnboardingTooltip
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

// Welcome Modal Component with improved mobile UX
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
  const handleStartTour = useCallback(() => {
    console.log('Welcome modal: Start Tour clicked');
    onStartTour();
  }, [onStartTour]);

  const handleMinimalTour = useCallback(() => {
    console.log('Welcome modal: Quick Overview clicked');
    onMinimalTour();
  }, [onMinimalTour]);

  const handleSkip = useCallback(() => {
    console.log('Welcome modal: Skip clicked');
    onSkip();
  }, [onSkip]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[26000] flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          
          <motion.div
            className="relative bg-white rounded-3xl shadow-2xl overflow-hidden w-full max-w-md"
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {/* Header with gradient */}
            <div className="bg-gradient-to-br from-purple-500 via-teal-600 to-teal-600 p-6 text-white text-center relative overflow-hidden">
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
                <p className="text-teal-100 text-sm">
                  Ready to discover the future of social predictions?
                </p>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="space-y-4 mb-6">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-teal-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Compass className="w-5 h-5 text-teal-600" />
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
                  onClick={handleStartTour}
                  className="w-full bg-teal-500 hover:bg-teal-600 text-white py-3 px-4 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  Take the Tour
                </button>
                
                <button
                  onClick={handleMinimalTour}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-4 rounded-xl font-medium transition-colors"
                >
                  Quick Overview
                </button>
                
                <button
                  onClick={handleSkip}
                  className="w-full text-gray-500 hover:text-gray-700 py-2 px-4 rounded-xl font-medium transition-colors flex items-center justify-center gap-1"
                >
                  <ChevronsRight className="w-4 h-4" />
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

export default OnboardingSystem;